import os

from django import template
from django.contrib.staticfiles import finders
from django.templatetags.static import static

register = template.Library()


@register.simple_tag
def static_v(path):
    """
    Igual que {% static %}, pero le agrega ?v=<mtime del archivo> al final.

    Sin esto, el navegador cachea JS/CSS con el mismo nombre de archivo
    entre ediciones, así que un cambio ya guardado no se ve hasta borrar
    caché a mano (nos pasó varias veces con styles.css y gallery.js). Al
    cambiar el archivo cambia su mtime, cambia el ?v=, y el navegador lo
    trata como una URL nueva — cache-bust automático.
    """

    url = static(path)

    found = finders.find(path)

    if found:
        try:
            version = int(os.path.getmtime(found))
            return f'{url}?v={version}'
        except OSError:
            pass

    return url
