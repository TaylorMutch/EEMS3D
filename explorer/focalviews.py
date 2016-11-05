import numpy as np
from django.http import JsonResponse
from django.views.generic import TemplateView, View
from netCDF4 import Dataset as nc
from django.conf import settings
import os
from csv import DictReader

# TODO - put all the focal data into a new table in the models.py

EEMS_TILE_SIZE = (500,500)

elev_path = os.path.join(settings.MEDIA_ROOT, 'uploads', 'elevation', 'Elev_30AS_ForTaylor.nc')

# Very rough cut on setting up the paths without having to setup any db tables.
providers = ['CanESM2', 'CCSM4', 'CNRM-CM5', 'HadGEM2-ES']
climate_root = os.path.join(settings.MEDIA_ROOT, 'climate_data')
climate_paths = {
    'tmin': {name: os.path.join(climate_root, name.lower() + '_tmin1645.nc') for name in providers},
    'tmax': {name: os.path.join(climate_root, name.lower() + '_tmax1645.nc') for name in providers}
}

raw_climate = os.path.join(climate_root, 'raw')
raw_paths = {
    'tmin': {name: os.path.join(raw_climate, name.lower() + '_tmin1645.nc') for name in providers},
    'tmax': {name: os.path.join(raw_climate, name.lower() + '_tmax1645.nc') for name in providers}
}

class RawData(object):

    def __init__(self, path, layer_name):

        # parse .xtr file
        with nc(path, 'r') as ds:

            self.lats = ds.variables['lat'][:]
            self.lngs = ds.variables['lon'][:]
            self.numlngs = int(self.lngs.size)
            self.numlats = int(self.lats.size)
            self.minlng = float(self.lngs[0])
            self.maxlng = float(self.lngs[-1])
            self.minlat = float(self.lats[0])
            self.maxlat = float(self.lats[-1])
            self.data = ds.variables[layer_name][:]
            self.dtype = self.data.data.dtype
            self.ncattrs = {k: ds.variables[layer_name].getncattr(k) for k in ds.variables[layer_name].ncattrs()}


    def nn_index(self, lng, lat):
        tx = int(round(((lng - self.minlng) / (self.maxlng - self.minlng)) * self.numlngs))
        ty = int(round(((lat - self.minlat) / (self.maxlat - self.minlat)) * self.numlats))
        return tx, ty

    def nn_value(self, lng, lat):
        try:
            tx, ty = self.nn_index(lng, lat)
            return self.data.data[ty][tx]              # height at row ty, column tx
        except:
            return 0

class FocalView(TemplateView):

    template_name = 'focalviews.html'

    def __init__(self):

        with open(os.path.join(settings.STATIC_ROOT, 'csv', 'LonLat_confidence_cats_4Nov2016.csv')) as f:
            reader = DictReader(f)
            self.data = [row for row in reader]

        elev_data = RawData(elev_path, 'elev')

        for row in self.data:
            row['z'] = elev_data.nn_value(float(row['Lon']), float(row['Lat']))
            row['tmin'] = dict()
            row['tmax'] = dict()

        for variable in raw_paths:
            for name in raw_paths[variable]:
                print(variable)
                climate_dataset = RawData(raw_paths[variable][name], variable)
                for row in self.data:
                    row[variable][name] = float(climate_dataset.nn_value(float(row['Lon']),float(row['Lat'])))


        super().__init__()

    def get_context_data(self, **kwargs):

        kwargs['focal_points'] = self.data

        return kwargs


class ElevTileView(View):

    def get(self, request, *args, **kwargs):
        y_start = int(kwargs['y'])
        y_end = y_start + EEMS_TILE_SIZE[0]
        x_start = int(kwargs['x'])
        x_end = x_start + EEMS_TILE_SIZE[1]
        layer = 'elev'
        response = dict()

        with nc(elev_path, 'r') as ds:
            var = ds.variables[layer][:]

            if x_start > var.shape[1] or y_start > var.shape[0]:
                return JsonResponse({layer: 'False'})

            x_end = var.shape[1] if x_end > var.shape[1] else x_end
            y_end = var.shape[0] if y_end > var.shape[0] else y_end
            response['fill_value'] = str(ds.variables[layer]._FillValue)
            if isinstance(var, np.ma.core.MaskedArray):
                sub_matrix = var.data[y_start:y_end, x_start:x_end]
                response[layer] = sub_matrix.ravel().tolist()
                response['x'] = sub_matrix.shape[1]
                response['y'] = sub_matrix.shape[0]
            else:
                sub_matrix = var[y_start:y_end, x_start:x_end]
                response[layer] = sub_matrix.ravel().tolist()
                response['x'] = sub_matrix.shape[1]
                response['y'] = sub_matrix.shape[0]

        return JsonResponse(response)


class ElevInfoView(View):

    def get(self, request, *args, **kwargs):

        layer = 'elev'
        elev_path = os.path.join(settings.MEDIA_ROOT, 'uploads', 'elevation', 'Elev_30AS_ForTaylor.nc')

        with nc(elev_path, 'r') as ds:
            var = ds.variables[layer][:]

            minimum = float(var.min())
            maximum = float(var.max())
            x = var.shape[1]
            y = var.shape[0]

            fill_value = str(ds.variables[layer]._FillValue)
            response = {
                'min': minimum,
                'max': maximum,
                'x':float(x),
                'y':float(y),
                'fill_value' : fill_value
            }

            response['lat_min'] = float(ds.variables['lat'][:].min())
            response['lat_max'] = float(ds.variables['lat'][:].max())
            response['lon_min'] = float(ds.variables['lon'][:].min())
            response['lon_max'] = float(ds.variables['lon'][:].max())

        return JsonResponse(response)


class DataInfoView(View):

    def get(self, request, *args, **kwargs):
        layer = str(kwargs['layer'])
        provider = str(kwargs['provider'])
        response = dict()
        path = climate_paths[layer][provider]

        #raw_data = RawData(path, layer)




        with nc(path, 'r') as ds:

            var = ds.variables[layer][:]

            minimum = float(var.min())
            maximum = float(var.max())
            x = var.shape[1]
            y = var.shape[0]
            try:
                fill_value = str(ds.variables[layer]._FillValue)
            except:
                fill_value = 9.969209968386869e+36
            response[layer] = {'min': minimum, 'max': maximum, 'x':float(x), 'y':float(y), 'fill_value' : fill_value}

        return JsonResponse(response)


class TileView(View):

    def get(self, request, *args, **kwargs):
        y_start = int(kwargs['y'])
        y_end = y_start + EEMS_TILE_SIZE[0]
        x_start = int(kwargs['x'])
        x_end = x_start + EEMS_TILE_SIZE[1]
        layer = kwargs['layer']
        provider = str(kwargs['provider'])

        response = dict()
        path = climate_paths[layer][provider]

        with nc(path, 'r') as ds:
            var = ds.variables[layer][:]

            if x_start > var.shape[1] or y_start > var.shape[0]:
                return JsonResponse({layer: 'False'})

            x_end = var.shape[1] if x_end > var.shape[1] else x_end
            y_end = var.shape[0] if y_end > var.shape[0] else y_end
            if isinstance(var, np.ma.core.MaskedArray):
                sub_matrix = var.data[y_start:y_end, x_start:x_end]
                response[layer] = sub_matrix.ravel().tolist()
                response['x'] = sub_matrix.shape[1]
                response['y'] = sub_matrix.shape[0]
            else:
                sub_matrix = var[y_start:y_end, x_start:x_end]
                response[layer] = sub_matrix.ravel().tolist()
                response['x'] = sub_matrix.shape[1]
                response['y'] = sub_matrix.shape[0]

        return JsonResponse(response)
