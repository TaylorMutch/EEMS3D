from explorer.models import Dataset, Variable
from rest_framework import serializers

class DatasetSerializer(serializers.ModelSerializer):

    class Meta:
        model = Dataset


class VariableSerializer(serializers.ModelSerializer):

    class Meta:
        model = Variable

