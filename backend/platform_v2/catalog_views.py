from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .entitlements import PLAN_ENTITLEMENTS
from .models import Tenant


PLAN_ORDER = [
    Tenant.Plan.FREE,
    Tenant.Plan.STARTER,
    Tenant.Plan.PRO,
    Tenant.Plan.BUSINESS,
]

PLAN_COPY = {
    Tenant.Plan.FREE: {
        "name": "Free",
        "description": "Bitta biznes sahifani ishga tushirish va QR oqimini sinash uchun.",
    },
    Tenant.Plan.STARTER: {
        "name": "Starter",
        "description": "Kichik biznes uchun bir nechta sahifa, ko'proq media va analytics.",
    },
    Tenant.Plan.PRO: {
        "name": "Pro",
        "description": "Custom domain, team hamkorligi va professional public presence uchun.",
    },
    Tenant.Plan.BUSINESS: {
        "name": "Business",
        "description": "Ko'p sayt, katta team va yuqori media limiti kerak bo'lgan tashkilotlar uchun.",
    },
}


class PublicPlanCatalogView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = "public_read"

    def get(self, request):
        plans = []
        for plan in PLAN_ORDER:
            entitlement = PLAN_ENTITLEMENTS[plan]
            copy = PLAN_COPY[plan]
            plans.append(
                {
                    "key": plan,
                    "name": copy["name"],
                    "description": copy["description"],
                    "limits": {
                        "sites": entitlement.max_sites,
                        "members": entitlement.max_members,
                        "media_assets": entitlement.max_media_assets,
                    },
                    "features": {
                        "custom_domains": entitlement.custom_domains,
                        "advanced_analytics": entitlement.advanced_analytics,
                        "remove_branding": entitlement.remove_branding,
                    },
                }
            )
        response = Response({"plans": plans})
        response["Cache-Control"] = "public, max-age=300, stale-while-revalidate=3600"
        return response
