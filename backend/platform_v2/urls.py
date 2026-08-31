from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .compat_views import PublicDefaultSiteView
from .views import (
    DomainViewSet,
    HealthView,
    PublicEventView,
    PublicSiteBySlugView,
    QRCodeViewSet,
    QRRedirectView,
    SiteViewSet,
    TenantViewSet,
)


router = DefaultRouter()
router.register("tenants", TenantViewSet, basename="v2-tenant")
router.register("sites", SiteViewSet, basename="v2-site")
router.register("domains", DomainViewSet, basename="v2-domain")
router.register("qr-codes", QRCodeViewSet, basename="v2-qr-code")

urlpatterns = [
    path("health/", HealthView.as_view(), name="v2-health"),
    path(
        "public/sites/<slug:tenant_slug>/",
        PublicDefaultSiteView.as_view(),
        name="v2-public-default-site",
    ),
    path(
        "public/sites/<slug:tenant_slug>/<slug:site_slug>/",
        PublicSiteBySlugView.as_view(),
        name="v2-public-site",
    ),
    path(
        "public/sites/<uuid:site_id>/events/",
        PublicEventView.as_view(),
        name="v2-public-event",
    ),
    path("", include(router.urls)),
]

public_redirect_patterns = [
    path("q/<str:code>/", QRRedirectView.as_view(), name="v2-qr-redirect"),
]
