"""EEMS3D URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.9/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf.urls import url, include
from django.contrib import admin
from django.conf import settings
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

from explorer.views import DatasetViewset
from rest_framework.routers import DefaultRouter

router = DefaultRouter()

router.register('datasets', DatasetViewset)


urlpatterns = [
    url(r'^', include(router.urls)),
    #url(r'^', DatasetViewset.as_view(), name='dataset-list'),
    url(r'^admin/', admin.site.urls),
    url(r'^explore/', include('explorer.urls')),
    url(r'^focalsites/', include('explorer.focalurls')),
]

if settings.DEBUG:
    urlpatterns += staticfiles_urlpatterns()
