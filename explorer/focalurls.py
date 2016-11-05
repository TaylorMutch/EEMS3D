from django.conf.urls import url, include
from explorer.focalviews import FocalView, ElevInfoView, ElevTileView, TileView, DataInfoView


urlpatterns = [
    url(r'^', include([
        url(r'^$', FocalView.as_view(), name='focal-points'),
        url(r'^tiles/(?P<x>\d+)/(?P<y>\d+)$', ElevTileView.as_view(), name='tiles'),
        url(r'^dimensions/$', ElevInfoView.as_view(), name='data-info'),
        url(r'^(?P<provider>[\w\-/]+?)/(?P<layer>[\w\-/]+?)/', include([
            url(r'tiles/(?P<x>\d+)/(?P<y>\d+)$', TileView.as_view()),
            url(r'dimensions/$', DataInfoView.as_view())
        ]))
    ])),
]