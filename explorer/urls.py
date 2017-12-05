from django.conf.urls import url, include
from explorer.views import DatasetUploadFormView, GetTileView, GetEEMSProgramView, ExplorerView, DataInfoView

urlpatterns = [
    url(r'^(?P<dataset>\d+)/', include([
        url('^$', ExplorerView.as_view(), name='explore'),
        url(r'eems-program/', GetEEMSProgramView.as_view(), name='eems-program'),
        url(r'(?P<layer>[\w\-/]+?)/', include([
            url(r'dimensions/$', DataInfoView.as_view(), name='data-info'),
            url(r'tiles/(?P<x>\d+)/(?P<y>\d+)$', GetTileView.as_view(), name='tiles'),
        ])),
    ])),
    url(r'^upload/$', DatasetUploadFormView.as_view(), name='dataset_upload'),
]
