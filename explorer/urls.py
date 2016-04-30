from django.conf.urls import url, include
from explorer.views import DatasetUploadFormView, MainLandingPage, DatasetViewset, VariableViewset, GetTileView, GetEEMSProgramView, ExplorerView
from rest_framework.routers import SimpleRouter, DefaultRouter

router = DefaultRouter()
router.register(r'datasets', DatasetViewset)
router.register(r'variables', VariableViewset)

urlpatterns = [
    #url(r'^$', MainLandingPage.as_view(), name='explore'),
    url(r'^(?P<dataset>\d+)/$', ExplorerView.as_view(), name='explore-preset'),
    url(r'^upload/$', DatasetUploadFormView.as_view(), name='dataset_upload'),
    url(r'rest/', include(router.urls, namespace='api')),
    url(r'tiles/(?P<dataset>\d+)/(?P<layer>[\w\-/]+?)/(?P<x>\d+)/(?P<y>\d+)', GetTileView.as_view(), name='tile-interface'),
    url(r'eems-program/(?P<dataset>\d+)', GetEEMSProgramView.as_view(), name='eems-program'),
]