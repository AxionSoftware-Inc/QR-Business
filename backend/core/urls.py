from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DomainViewSet, HealthView, SiteViewSet, TenantViewSet


router = DefaultRouter()
router.register("tenants", TenantViewSet, basename="tenant")
router.register("domains", DomainViewSet, basename="domain")
router.register("sites", SiteViewSet, basename="site")

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("", include(router.urls)),
]
