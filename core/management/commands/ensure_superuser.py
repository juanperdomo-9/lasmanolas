# ===========================================
# LAS MANOLAS — ensure_superuser
# El createsuperuser normal de Django es interactivo (o falla si el
# usuario ya existe con --noinput) — no sirve para correr en CADA build
# de producción. Este comando es idempotente: si el usuario ya existe,
# no toca nada; si no existe, lo crea. Pensado para el buildCommand de
# Render, donde la base (Neon) arranca vacía y nadie tiene una shell a
# mano para correr createsuperuser a la vieja usanza.
#
# Lee las credenciales de variables de entorno (DJANGO_SUPERUSER_USERNAME/
# EMAIL/PASSWORD) — si no están cargadas, no hace nada (no rompe el build
# ni crea un superusuario con contraseña vacía).
# ===========================================

from decouple import config
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Crea el superusuario inicial si todavía no existe (seguro de correr en cada deploy).'

    def handle(self, *args, **options):
        username = config('DJANGO_SUPERUSER_USERNAME', default='')
        password = config('DJANGO_SUPERUSER_PASSWORD', default='')
        email = config('DJANGO_SUPERUSER_EMAIL', default='')

        if not username or not password:
            self.stdout.write('DJANGO_SUPERUSER_USERNAME/PASSWORD no configurados — se omite.')
            return

        User = get_user_model()

        if User.objects.filter(username=username).exists():
            self.stdout.write(f'Superusuario "{username}" ya existe — no se toca.')
            return

        User.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(self.style.SUCCESS(f'Superusuario "{username}" creado.'))
