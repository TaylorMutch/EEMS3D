import numpy as np
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.views.generic import View
from netCDF4 import Dataset as nc
from explorer.forms import DatasetForm
from explorer.models import Dataset, Variable
from explorer.parsers import EEMS3DParser

EEMS_TILE_SIZE = (500,500)


class ExplorerView(View):
    template_name = 'index.html'

    def get(self, request, *args, **kwargs):
        return render(request, self.template_name)


class MainLandingPage(View):
    template_name = 'index_old.html'

    def get(self, request):
        return render(request, self.template_name)


class DataInfoView(View):

    def get(self, request, *args, **kwargs):
        layer = str(kwargs['layer'])
        dataset = Dataset.objects.get(pk=kwargs['dataset'])
        response = dict()
        variables = Variable.objects.filter(dataset=dataset)
        found = False
        for variable in variables:
            if variable.name == layer:
                layer = variable.name
                found = True
                break

        if not found:
            return JsonResponse({layer: 'False'})

        if layer == 'elev' and dataset.has_elev_file:
            path = dataset.elev_file.path
        else:
            path = dataset.data_file.path

        with nc(path, 'r') as ds:

            var = ds.variables[layer][:]

            minimum = float(var.min())
            maximum = float(var.max())
            x = var.shape[1]
            y = var.shape[0]
            fill_value = str(ds.variables[layer]._FillValue)
            response[layer] = {'min': minimum, 'max': maximum, 'x':float(x), 'y':float(y), 'fill_value' : fill_value}

        return JsonResponse(response)


class GetTileView(View):

    def get(self, request, *args, **kwargs):
        y_start = int(kwargs['y'])
        y_end = y_start + EEMS_TILE_SIZE[0]
        x_start = int(kwargs['x'])
        x_end = x_start + EEMS_TILE_SIZE[1]
        layer = kwargs['layer']
        dataset = Dataset.objects.get(pk=kwargs['dataset'])
        response = dict()

        variables = Variable.objects.filter(dataset=dataset)

        found = False
        for variable in variables:
            if variable.name == layer:
                layer = variable.name
                found = True
                break

        if not found:
            return JsonResponse({layer : 'False'})

        if layer == 'elev' and dataset.has_elev_file:
            path = dataset.elev_file.path
        else:
            path = dataset.data_file.path

        with nc(path, 'r') as ds:
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


class GetEEMSProgramView(View):

    def get(self, request, *args, **kwargs):
        """ Returns an EEMS program parsed into a json object """
        dataset = Dataset.objects.get(pk=kwargs['dataset'])
        path = dataset.eems_program.path
        response = EEMS3DParser(path).get_model()
        return JsonResponse(response)


class DatasetUploadFormView(View):
    form_class = DatasetForm
    template_name = 'upload.html'
    #success_url = reverse_lazy('explore')   # TODO - fix this redirect on file uploads

    def get(self, request, *args, **kwargs):
        return render(request, self.template_name, {'form': self.form_class()})

    def post(self, request, *args, **kwargs):
        dataset = self.form_class(request.POST, request.FILES)
        if dataset.is_valid():
            ds = dataset.save()

            # add attribute variables to dataset
            attr_data = nc(ds.data_file.path, 'r')
            variables = list(attr_data.variables.keys())
            for var in variables:
                shape = attr_data.variables[var].shape
                if len(shape) < 2:
                    shape = [shape[0], shape[0]]
                variable = Variable(name=var,
                                    long_name=attr_data.variables[var].long_name,
                                    dataset=ds,
                                    x_dimension=shape[0],
                                    y_dimension=shape[1]
                                    )
                variable.save()
            attr_data.close()

            # add elevation to dataset
            elev_data = nc(ds.elev_file.path, 'r')
            elev_shape = elev_data.variables['elev'].shape
            elev_variable = Variable(name='elev', dataset=ds, x_dimension=elev_shape[0], y_dimension=elev_shape[1])
            elev_variable.save()
            elev_data.close()
            return redirect('/explore/' + str(ds.id) + '/')
        else:
            return render(request, self.template_name, {'form': self.form_class()})

