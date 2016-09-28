from django.db import models
from django.db.models.signals import post_delete
import uuid
import logging

# Create your models here.

logger = logging.getLogger(__name__)


class Dataset(models.Model):
    """ A netCDF4 file """
    name = models.CharField(max_length=140)
    uuid = models.CharField(max_length=36, default=uuid.uuid4)
    data_file = models.FileField(upload_to='uploads/attributes/', max_length=256)
    has_elev_file = models.BooleanField(default=True)
    elev_file = models.FileField(upload_to='uploads/elevation/', max_length=256)
    eems_program = models.FileField(upload_to='uploads/programs/', max_length=256)


def delete_file(sender, instance, **kwargs):
    if instance.file.name:
        try:
            instance.data_file.delete(save=False)
            if instance.has_elev_file:
                instance.elev_file.delete(save=False)
            instance.eems_program.delete(save=False)
        except IOError:
            logger.exception("Error deleting Dataset: %s" % instance.name)
            return


post_delete.connect(delete_file, sender=Dataset)


class Variable(models.Model):
    """ A Variable from a Dataset """
    name = models.CharField(max_length=256)
    long_name = models.CharField(max_length=256)
    dataset = models.ForeignKey(Dataset)
    x_dimension = models.IntegerField()
    y_dimension = models.IntegerField()

