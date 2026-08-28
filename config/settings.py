"""
Django settings for config project (Las Manolas).
"""

from pathlib import Path

import dj_database_url
from decouple import config, Csv

BASE_DIR = Path(__file__).resolve().parent.parent


# ==========================================
# SEGURIDAD / ENTORNO
# ==========================================

SECRET_KEY = config('SECRET_KEY', default='django-insecure-dev-key-change-me')
DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='127.0.0.1,localhost', cast=Csv())
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default='', cast=Csv())


# ==========================================
# APPS
# ==========================================

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',

    # Storage de media en Cloudinary — instalado siempre, pero el backend
    # solo se activa si hay CLOUDINARY_URL cargada (ver STORAGES más abajo);
    # sin eso, en dev local sigue guardando en el filesystem como siempre.
    'cloudinary_storage',
    'cloudinary',

    # Las Manolas
    'core',
    'catalog',
    'cart',
    'orders',
    'payments',
    'dashboard',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # Sirve los estáticos directo desde Django/Gunicorn en producción (Render
    # no tiene un servidor de estáticos aparte como Nginx) — va inmediatamente
    # después de SecurityMiddleware, así lo pide WhiteNoise.
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'core.context_processors.site_context',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# ==========================================
# BASE DE DATOS
# ==========================================

# En dev local, sin DATABASE_URL cargada, sigue usando SQLite como siempre.
# En producción (Neon/Postgres), se carga vía DATABASE_URL — Neon exige SSL,
# por eso ssl_require=True cuando SÍ hay una URL real configurada.
DATABASES = {
    'default': dj_database_url.config(
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',
        conn_max_age=600,
        ssl_require=config('DATABASE_URL', default='').startswith('postgres'),
    )
}


# ==========================================
# VALIDACIÓN DE CONTRASEÑAS (solo afecta al admin/staff)
# ==========================================

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# ==========================================
# INTERNACIONALIZACIÓN
# ==========================================

LANGUAGE_CODE = 'es-ar'
TIME_ZONE = 'America/Argentina/Buenos_Aires'
USE_I18N = True
USE_TZ = True


# ==========================================
# ARCHIVOS ESTÁTICOS Y MEDIA
# ==========================================

STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Media (fotos que suben desde /panel/) va a Cloudinary en cuanto haya
# CLOUDINARY_URL cargada — así lo subido no se pierde en cada deploy (Render
# no tiene disco persistente). Sin esa variable (dev local), sigue guardando
# en el filesystem como siempre, sin pedir credenciales de Cloudinary.
#
# Estáticos (CSS/JS propios) los sirve WhiteNoise con manifest+compresión
# SOLO fuera de DEBUG — en dev local usa el storage normal de Django, para
# no depender de haber corrido `collectstatic` en cada cambio.
STORAGES = {
    'default': {
        'BACKEND': (
            'cloudinary_storage.storage.MediaCloudinaryStorage'
            if config('CLOUDINARY_URL', default='')
            else 'django.core.files.storage.FileSystemStorage'
        ),
    },
    'staticfiles': {
        'BACKEND': (
            'whitenoise.storage.CompressedManifestStaticFilesStorage'
            if not DEBUG
            else 'django.contrib.staticfiles.storage.StaticFilesStorage'
        ),
    },
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ==========================================
# EMAIL (consola en dev; configurar SMTP en prod vía .env)
# ==========================================

EMAIL_BACKEND = config(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.console.EmailBackend',
)
EMAIL_HOST = config('EMAIL_HOST', default='')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='Las Manolas <no-reply@lasmanolas.com.ar>')


# ==========================================
# MERCADO PAGO
# ==========================================

MP_ACCESS_TOKEN = config('MP_ACCESS_TOKEN', default='')
MP_PUBLIC_KEY = config('MP_PUBLIC_KEY', default='')

# Base pública del sitio, usada para armar las back_urls de MP (éxito/error/pendiente).
SITE_URL = config('SITE_URL', default='http://127.0.0.1:8000')


# ==========================================
# WHATSAPP / CONTACTO
# ==========================================

WHATSAPP_NUMBER = config('WHATSAPP_NUMBER', default='5491100000000')


LOGIN_URL = '/admin/login/'


# ==========================================
# SEGURIDAD EN PRODUCCIÓN (solo aplica con DEBUG=False)
# ==========================================

if not DEBUG:
    # Render (y la mayoría de los PaaS) terminan el HTTPS en un proxy y
    # reenvían la request por HTTP puro puertas adentro — sin esto Django
    # cree que TODA la conexión es insegura y redirige en loop infinito.
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # Arranca en 1 día a propósito — HSTS le dice al navegador "nunca más
    # entres por HTTP a este dominio", así que si algo del HTTPS falla
    # después de subir esto, conviene poder revertirlo rápido. Subir el
    # número (ej. a 1 año) recién cuando esté confirmado que anda todo bien
    # en producción por un tiempo.
    SECURE_HSTS_SECONDS = 60 * 60 * 24
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
