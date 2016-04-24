from django.db import models
from django.db.models.signals import post_delete
import uuid
import logging

# Create your models here.

logger = logging.getLogger(__name__)


class Dataset(models.Model):
    """ A Dataset from a netCDF4 file """
    name = models.CharField(max_length=140)
    uuid = models.CharField(max_length=36, default=uuid.uuid4)
    creationDate = models.DateTimeField(auto_now_add=True)
    data_file = models.FileField(upload_to='uploads/', max_length=1024)
    #eems_file = models.FileField(upload_to='eems-files/', max_length=1024)

    @property
    def extension(self):
        if self.data_file.name.find(".") != -1:
            return self.file.name[self.file.name.rfind(".")+1:]
        else:
            return ""


def delete_file(sender, instance, **kwargs):
    if instance.file.name:
        try:
            instance.data_file.delete(save=False)
        except IOError:
            logger.exception("Error deleting Dataset: %s" % instance.file.name)
            return
        #try:
        #    instance.eems_file.delete(save=False)
        #except IOError:
        #    logger.exception("Error deleting EEMS file: %s" % instance.eems_file.name)


post_delete.connect(delete_file, sender=Dataset)


class Variable(models.Model):
    """ A Variable from a Dataset """
    name = models.CharField(max_length=140)
    dataset = models.ForeignKey(Dataset)
