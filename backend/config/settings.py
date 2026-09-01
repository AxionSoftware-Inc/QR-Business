from datetime import timedelta
from pathlib import Path
import os

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-change-me")
DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() == "true"
ALLOWED_HOSTS = [host.strip() for host in os.getenv("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost").split(",") if host.strip()]
ENABLE_LEGACY_IMPORT = os.getenv("ENABLE_LEGACY_IMPORT", "False").lower() == "true"

INSTALLED_APPS = [
    "django.contrib.admin", "django.contrib.auth", "django.contrib.contenttypes", "django.contrib.sessions",
    "django.contrib.messages", "django.contrib.staticfiles", "corsheaders", "rest_framework", "platform_v2",
]
if ENABLE_LEGACY_IMPORT:
    INSTALLED_APPS.append("core")

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware", "django.middleware.security.SecurityMiddleware", "django.middleware.gzip.GZipMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware", "django.middleware.common.CommonMiddleware", "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware", "platform_v2.middleware.RequestContextMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware", "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "config.urls"
TEMPLATES = [{"BACKEND":"django.template.backends.django.DjangoTemplates","DIRS":[],"APP_DIRS":True,"OPTIONS":{"context_processors":["django.template.context_processors.request","django.contrib.auth.context_processors.auth","django.contrib.messages.context_processors.messages"]}}]
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {"default":{"ENGINE":"django.db.backends.postgresql","NAME":os.getenv("DB_NAME","QR"),"USER":os.getenv("DB_USER","postgres"),"PASSWORD":os.getenv("DB_PASSWORD",""),"HOST":os.getenv("DB_HOST","127.0.0.1"),"PORT":os.getenv("DB_PORT","5432"),"CONN_MAX_AGE":int(os.getenv("DB_CONN_MAX_AGE","60")),"OPTIONS":{"sslmode":os.getenv("DB_SSLMODE","prefer")}}}
AUTH_PASSWORD_VALIDATORS = [
    {"NAME":"django.contrib.auth.password_validation.UserAttributeSimilarityValidator"}, {"NAME":"django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME":"django.contrib.auth.password_validation.CommonPasswordValidator"}, {"NAME":"django.contrib.auth.password_validation.NumericPasswordValidator"},
]
LANGUAGE_CODE = os.getenv("DJANGO_LANGUAGE_CODE", "en")
TIME_ZONE = os.getenv("DJANGO_TIME_ZONE", "UTC")
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "").strip()
if S3_BUCKET_NAME:
    STORAGES = {
        "default": {"BACKEND":"storages.backends.s3.S3Storage","OPTIONS":{"bucket_name":S3_BUCKET_NAME,"access_key":os.getenv("S3_ACCESS_KEY_ID") or None,"secret_key":os.getenv("S3_SECRET_ACCESS_KEY") or None,"endpoint_url":os.getenv("S3_ENDPOINT_URL") or None,"region_name":os.getenv("S3_REGION_NAME") or None,"custom_domain":os.getenv("S3_CUSTOM_DOMAIN") or None,"querystring_auth":os.getenv("S3_QUERYSTRING_AUTH","False").lower()=="true","default_acl":None,"file_overwrite":False,"object_parameters":{"CacheControl":"public, max-age=31536000, immutable"}}},
        "staticfiles": {"BACKEND":"django.contrib.staticfiles.storage.StaticFilesStorage"},
    }

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
DEFAULT_RENDERER_CLASSES = ["rest_framework.renderers.JSONRenderer"]
if DEBUG:
    DEFAULT_RENDERER_CLASSES.append("rest_framework.renderers.BrowsableAPIRenderer")
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES":["rest_framework_simplejwt.authentication.JWTAuthentication","rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_RENDERER_CLASSES":DEFAULT_RENDERER_CLASSES,
    "DEFAULT_PARSER_CLASSES":["rest_framework.parsers.JSONParser","rest_framework.parsers.MultiPartParser","rest_framework.parsers.FormParser"],
    "DEFAULT_PAGINATION_CLASS":"platform_v2.pagination.V2PageNumberPagination",
    "PAGE_SIZE":100,
    "DEFAULT_THROTTLE_CLASSES":["rest_framework.throttling.AnonRateThrottle","rest_framework.throttling.ScopedRateThrottle"],
    "DEFAULT_THROTTLE_RATES":{
        "anon":os.getenv("THROTTLE_ANON","600/hour"),
        "upload_media":os.getenv("THROTTLE_UPLOAD_MEDIA","30/hour"),
        "public_read":os.getenv("THROTTLE_PUBLIC_READ","1200/hour"),
        "analytics_write":os.getenv("THROTTLE_ANALYTICS_WRITE","600/hour"),
        "qr_redirect":os.getenv("THROTTLE_QR_REDIRECT","1200/hour"),
        "auth":os.getenv("THROTTLE_AUTH","60/hour"),
        "billing_webhook":os.getenv("THROTTLE_BILLING_WEBHOOK","300/hour"),
    },
}
SIMPLE_JWT = {"ACCESS_TOKEN_LIFETIME":timedelta(minutes=int(os.getenv("JWT_ACCESS_MINUTES","15"))),"REFRESH_TOKEN_LIFETIME":timedelta(days=int(os.getenv("JWT_REFRESH_DAYS","30"))),"ROTATE_REFRESH_TOKENS":True,"BLACKLIST_AFTER_ROTATION":False,"UPDATE_LAST_LOGIN":False}
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ALLOWED_ORIGINS","http://127.0.0.1:3000,http://localhost:3000").split(",") if origin.strip()]
CORS_ALLOW_CREDENTIALS = True
PUBLIC_WEB_BASE_URL = os.getenv("PUBLIC_WEB_BASE_URL", "http://localhost:3000")
ANALYTICS_HASH_SALT = os.getenv("ANALYTICS_HASH_SALT", SECRET_KEY)
SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", str(not DEBUG)).lower() == "true"
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", str(not DEBUG)).lower() == "true"
CSRF_COOKIE_SECURE = os.getenv("CSRF_COOKIE_SECURE", str(not DEBUG)).lower() == "true"
SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000" if not DEBUG else "0"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
LOGGING = {
    "version":1,"disable_existing_loggers":False,
    "formatters":{"standard":{"format":"%(asctime)s %(levelname)s %(name)s %(message)s"}},
    "handlers":{"console":{"class":"logging.StreamHandler","formatter":"standard"}},
    "loggers":{"qr.access":{"handlers":["console"],"level":os.getenv("DJANGO_ACCESS_LOG_LEVEL","INFO"),"propagate":False}},
    "root":{"handlers":["console"],"level":os.getenv("DJANGO_LOG_LEVEL","INFO")},
}
