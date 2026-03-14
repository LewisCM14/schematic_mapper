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
MIDDLEWARE = [
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
