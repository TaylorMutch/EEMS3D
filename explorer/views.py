from explorer.forms import DatasetForm
from explorer.models import Dataset, Variable
from explorer.serializers import DatasetSerializer, VariableSerializer
from django.views.generic import View
from django.shortcuts import render, redirect
from django.core.urlresolvers import reverse_lazy
from django.http import JsonResponse, HttpResponse
import numpy
from netCDF4 import Dataset as nc
from explorer.models import Dataset, Variable
from EEMS3D.settings import MEDIA_ROOT
import os
import json
from rest_framework import viewsets, mixins, status
from rest_framework.decorators import detail_route, list_route
import logging

logger = logging.getLogger(__name__)

# Create your views here.

class MainLandingPage(View):
    template_name = 'index.html'

    def get(self, request):
        return render(request, self.template_name)


class DatasetUploadFormView(View):
    form_class = DatasetForm
    template_name = 'upload.html'
    success_url = reverse_lazy('explore')

    def get(self, request, *args, **kwargs):
        return render(request, self.template_name, {'form': self.form_class()})

    def post(self, request, *args, **kwargs):
        dataset = self.form_class(request.POST, request.FILES)
        if dataset.is_valid():
            ds = dataset.save()

            # create variables for this dataset
            path = os.path.join(MEDIA_ROOT, ds.data_file.url)
            netdata = nc(path, 'r')
            variables = list(netdata.variables.keys())
            for var in variables:
                variable = Variable(name=var, dataset=ds)
                variable.save()

            return redirect(self.success_url)
        else:
            return render(request, self.template_name, {'form': self.form_class()})


class DatasetViewset(viewsets.ModelViewSet):
    queryset = Dataset.objects.all()
    serializer_class = DatasetSerializer

    @detail_route(methods=['get'])
    def variable_list(self, request, pk=None):
        dataset = self.get_object()
        variables = Variable.objects.filter(dataset=dataset)
        response = {}
        varlist = []
        for variable in variables:
            varlist += [variable.name]
        response['variables'] = varlist
        return JsonResponse(response)

    @detail_route(methods=['get'])
    def variable_data(self, request, pk=None):
        dataset = self.get_object()
        name = request.GET['name']
        variables = Variable.objects.filter(dataset=dataset)
        response = {}
        for variable in variables:
            if variable.name == name:
                path = os.path.join(MEDIA_ROOT, dataset.data_file.url)
                ds = nc(path, 'r')
                data = ds.variables[name][:]
                if isinstance(data, numpy.ma.core.MaskedArray):
                    response[name] = data.data.ravel().tolist()
                else:
                    response[name] = data.ravel().tolist()
                break
        if hasattr(ds.variables[name], '_FillValue'):
            response['fill_value'] = str(ds.variables[name]._FillValue)
        else:
            response['fill_value'] = ''
        dimensions = ds.variables[name].shape
        response['dimensions'] = dimensions[0]
        response['min'] = float(ds.variables[name][:].min())
        response['max'] = float(ds.variables[name][:].max())
        return JsonResponse(response)

    @detail_route(methods=['get'])
    def dataset_struct(self, request, pk=None):
        ''' A temporary function for determining the structure of the eems data '''
        dataset = self.get_object()
        path = os.path.join(MEDIA_ROOT, 'eems-files/' + dataset.data_file.url.split('/')[1].split('.')[0] + '.json')
        #path = dataset.eems_file.url
        response = json.load(open(path))
        return JsonResponse(response[0])


class VariableViewset(viewsets.ModelViewSet):
    queryset = Variable.objects.all()
    serializer_class = VariableSerializer

