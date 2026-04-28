from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DomainViewSet, SiteViewSet, TenantViewSet


router = DefaultRouter()
router.register("tenants", TenantViewSet, basename="tenant")
router.register("domains", DomainViewSet, basename="domain")
router.register("sites", SiteViewSet, basename="site")

urlpatterns = [
    path("", include(router.urls)),
]

