from django.contrib import admin
from .models import Dataset, Variable
# Register your models here.

class DatasetAdmin(admin.ModelAdmin):
    pass

class VariableAdmin(admin.ModelAdmin):
    pass

admin.site.register(Dataset, DatasetAdmin)
admin.site.register(Variable, VariableAdmin)

