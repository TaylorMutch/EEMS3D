from django.conf.urls import url, include, patterns
from explorer.views import DatasetUploadFormView, GetTileView, GetEEMSProgramView, ExplorerView
#from rest_framework.routers import SimpleRouter, DefaultRouter

#router = DefaultRouter()
#router.register(r'datasets', DatasetViewset)
#router.register(r'variables', VariableViewset)

urlpatterns = [
    url(r'^(?P<dataset>\d+)/', include(patterns('',
        url('^$', ExplorerView.as_view(), name='explore'),
        url(r'eems-program/', GetEEMSProgramView.as_view(), name='eems-program'),
        url(r'tiles/(?P<layer>[\w\-/]+?)/(?P<x>\d+)/(?P<y>\d+)$', GetTileView.as_view(), name='tiles')
    ))),
    url(r'^upload/$', DatasetUploadFormView.as_view(), name='dataset_upload'),
]