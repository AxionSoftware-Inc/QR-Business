from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

from platform_v2.views import QRRedirectView


urlpatterns = [
    path("admin/", admin.site.urls),
    # Legacy API remains temporarily available during the controlled migration.
    path("api/", include("core.urls")),
    path("api/v2/", include("platform_v2.urls")),
    path("q/<str:code>/", QRRedirectView.as_view(), name="v2-qr-redirect"),
]

if settings.DEBUG:
    urlpatterns += [
        re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
    ]
