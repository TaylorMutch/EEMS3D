from django.forms import ModelForm
from explorer.models import Dataset


class DatasetForm(ModelForm):
    class Meta:
        model = Dataset
        #fields = ('name', 'data_file', 'eems_file')
        fields = ('name', 'data_file',)