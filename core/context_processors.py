from django.db.models import Prefetch

from cart.cart import Cart
from catalog.models import Category

from .models import SiteConfig


def site_context(request):
    """
    Disponible en todos los templates. `nav_sections` trae las 3 secciones
    con sus subcategorías por prenda ya precargadas (para el mega-menu del
    navbar sin pegarle a la base por cada una).
    """
    active_subcategories = Category.objects.filter(is_active=True).order_by('order', 'name')

    nav_sections = (
        Category.objects
        .filter(parent__isnull=True, is_active=True)
        .prefetch_related(Prefetch('subcategories', queryset=active_subcategories))
        .order_by('order', 'name')
    )

    return {
        'nav_sections': nav_sections,
        'site_config': SiteConfig.load(),
        'cart': Cart(request),
    }
