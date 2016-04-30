from django.forms import ModelForm
from explorer.models import Dataset


class DatasetForm(ModelForm):
    class Meta:
        model = Dataset
        fields = ('name', 'data_file', 'eems_program', 'elev_file',)
        help_texts = {
            'elev_file': 'The file that contains the "elevation" ',
            'eems_program': 'The EEMS program for the data',
        }