import numpy as np
from django.http import JsonResponse
from django.views.generic import TemplateView, View
from netCDF4 import Dataset as nc
from django.conf import settings
import os
from csv import DictReader

EEMS_TILE_SIZE = (500,500)


class FocalView(TemplateView):

    template_name = 'focalviews.html'

    def __init__(self):

        with open(os.path.join(settings.STATIC_ROOT, 'csv', 'focal_sites.csv')) as f:
            reader = DictReader(f)
            self.data = [row for row in reader]

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
        elev_path = os.path.join(settings.MEDIA_ROOT, 'uploads', 'elevation', 'Elev_30AS_ForTaylor.nc')
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