from django.conf.urls import url, include
from explorer.views import DatasetUploadFormView, MainLandingPage, DatasetViewset, VariableViewset
from rest_framework.routers import SimpleRouter, DefaultRouter

router = DefaultRouter()
router.register(r'datasets', DatasetViewset)
router.register(r'variables', VariableViewset)

urlpatterns = [
    url(r'^$', MainLandingPage.as_view(), name='explore'),
    url(r'^upload/$', DatasetUploadFormView.as_view(), name='dataset_upload'),
    url(r'rest/', include(router.urls, namespace='api')),
]