from django.core.urlresolvers import reverse
from explorer.models import Dataset, Variable
from rest_framework import serializers


class DatasetSerializer(serializers.ModelSerializer):

    class Meta:
        model = Dataset


class DatasetListSerializer(serializers.ModelSerializer):

    url = serializers.SerializerMethodField()
    #id = serializers.HyperlinkedRelatedField(read_only=True, view_name='explore', lookup_field='id')

    class Meta:
        model = Dataset
        fields = ('name','url')

    def get_url(self, ds):
        print(self)
        url = self.context['request'].build_absolute_uri(reverse('explore', args=[ds.id]))
        return url


class VariableSerializer(serializers.ModelSerializer):

    class Meta:
        model = Variable

