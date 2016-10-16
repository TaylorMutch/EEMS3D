from django.conf.urls import url, include
from explorer.focalviews import FocalView, ElevInfoView, ElevTileView


urlpatterns = [
    url(r'^', include([
        url(r'^$', FocalView.as_view(), name='focal-points'),
        url(r'tiles/(?P<x>\d+)/(?P<y>\d+)$', ElevTileView.as_view(), name='tiles'),
        url(r'dimensions/$', ElevInfoView.as_view(), name='data-info'),
    ])),
]