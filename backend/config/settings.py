"""
Django settings for config project.
"""

from pathlib import Path

import environ


# Base directory of the project
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")

# Security and debug settings
SECRET_KEY = env("SECRET_KEY")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])


# Django and third-party apps required for the project
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",  # CORS support for frontend-backend separation
    "rest_framework",  # Django REST Framework for API
    "api",  # Main application
]


# Middleware stack for request/response processing
_BASE_MIDDLEWARE = [
    "django.middleware.gzip.GZipMiddleware",  # Compress responses
    "django.middleware.security.SecurityMiddleware",  # Security headers
    "corsheaders.middleware.CorsMiddleware",  # CORS support
    "api.middleware.RequestIdMiddleware",  # Request ID correlation for logging
    "django.contrib.sessions.middleware.SessionMiddleware",  # Session management
    "django.middleware.common.CommonMiddleware",  # Common HTTP features
    "django.middleware.csrf.CsrfViewMiddleware",  # CSRF protection
    "django.contrib.auth.middleware.AuthenticationMiddleware",  # User authentication
    "django.contrib.messages.middleware.MessageMiddleware",  # Messaging framework
    "django.middleware.clickjacking.XFrameOptionsMiddleware",  # Clickjacking protection
]


# --- Middleware selection for authentication/authorization ---
#
# Django uses a list called MIDDLEWARE to decide what code runs before/after every request.
# This section chooses which authentication/authorization middleware to use based on the environment.
#
# - In local development (when AUTH_MODE=dev):
#     - Use DevAuthMiddleware, which fakes a user and role for easy testing.
#     - DevAuthMiddleware is added at the very start of the middleware stack.
#
# - In production (any other AUTH_MODE):
#     - Use IISAuthMiddleware to get the logged-in user from IIS web server headers.
#     - Use LDAPAuthorizationMiddleware to check the user's AD group and set their role.
#     - Both are inserted in the correct order after RequestIdMiddleware.
#
if env("AUTH_MODE", default=None) == "dev":
    # Local development: fake user/role for easy testing
    MIDDLEWARE = ["api.middleware.DevAuthMiddleware"] + _BASE_MIDDLEWARE
else:
    # Production: real authentication/authorization
    _prod_middleware = _BASE_MIDDLEWARE.copy()
    # Insert IISAuthMiddleware after RequestIdMiddleware
    idx = _prod_middleware.index("api.middleware.RequestIdMiddleware") + 1
    _prod_middleware.insert(idx, "api.middleware.IISAuthMiddleware")
    # Insert LDAPAuthorizationMiddleware after IISAuthMiddleware
    idx = _prod_middleware.index("api.middleware.IISAuthMiddleware") + 1
    _prod_middleware.insert(idx, "api.middleware.LDAPAuthorizationMiddleware")
    MIDDLEWARE = _prod_middleware


# --- LDAP/Active Directory (AD) settings for group-based authorization ---
#
# These settings tell the app how to connect to Active Directory (AD) using LDAP.
# AD is used to check which groups a user belongs to (for admin/viewer permissions).
#
# - LDAP_SERVER_URI: The address of the AD server (use LDAPS for security).
# - LDAP_BIND_DN: The username of the service account used to connect to AD.
# - LDAP_BIND_PASSWORD: The password for the service account.
# - LDAP_BASE_DN: The root location in AD to search for users/groups.
# - LDAP_ADMIN_GROUP: The name of the AD group for admins.
# - LDAP_VIEWER_GROUP: The name of the AD group for viewers.
#
LDAP_SERVER_URI = env("LDAP_SERVER_URI", default="ldaps://ad.example.com:636")
LDAP_BIND_DN = env(
    "LDAP_BIND_DN", default="CN=svc_account,OU=Service Accounts,DC=example,DC=com"
)
LDAP_BIND_PASSWORD = env("LDAP_BIND_PASSWORD", default="")
LDAP_BASE_DN = env("LDAP_BASE_DN", default="DC=example,DC=com")
LDAP_ADMIN_GROUP = env("LDAP_ADMIN_GROUP", default="app_admin")
LDAP_VIEWER_GROUP = env("LDAP_VIEWER_GROUP", default="app_viewer")

# List of allowed origins for cross-origin requests (CORS)
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])


# Root URL configuration module
ROOT_URLCONF = "config.urls"


# Template engine configuration
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# WSGI application entry point for production servers
WSGI_APPLICATION = "config.wsgi.application"


# Database configuration: two PostgreSQL databases (default and asset)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "HOST": env("DB_INTERNAL_HOST"),
        "PORT": env("DB_INTERNAL_PORT"),
        "NAME": env("DB_INTERNAL_NAME"),
        "USER": env("DB_INTERNAL_USER"),
        "PASSWORD": env("DB_INTERNAL_PASSWORD"),
    },
    "asset": {
        "ENGINE": "django.db.backends.postgresql",
        "HOST": env("DB_ASSET_HOST"),
        "PORT": env("DB_ASSET_PORT"),
        "NAME": env("DB_ASSET_NAME"),
        "USER": env("DB_ASSET_USER"),
        "PASSWORD": env("DB_ASSET_PASSWORD"),
    },
}


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators


# List of password validators for user authentication
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/
STATIC_URL = "static/"


# Logging configuration: JSON-like logs with request ID correlation
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "request_id": {
            # Injects request_id into every log record
            "()": "config.log_filters.RequestIdFilter",
        },
    },
    "formatters": {
        "json_like": {
            # Structured log format for easy parsing
            "format": (
                '{"time": "%(asctime)s", "level": "%(levelname)s",'
                ' "logger": "%(name)s", "request_id": "%(request_id)s",'
                ' "message": "%(message)s"}'
            ),
        },
    },
    "handlers": {
        "stdout": {
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
            "formatter": "json_like",
            "filters": ["request_id"],
        },
    },
    "root": {
        "handlers": ["stdout"],
        "level": "WARNING",
    },
    "loggers": {
        "api": {
            "handlers": ["stdout"],
            "level": "DEBUG",
            "propagate": True,
        },
    },
}
