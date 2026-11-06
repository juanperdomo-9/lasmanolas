from django.db.models import Prefetch
from django.shortcuts import render

from catalog.models import Product, ProductImage, ProductVariant, Size
from payments.mp_client import is_configured as mp_is_configured


def _is_one_size(name):
    # "Único" no es un talle de crecimiento; se compara en Python porque
    # SQLite no iguala mayúsculas/minúsculas con tilde (Ú/ú).
    return name.strip().lower() in ('único', 'unico')


def _smallest_size(product):
    """El talle más chico con stock (el que se cuelga en la etiqueta del tendedero)."""
    sizes = [v.size for v in product.variants.all() if v.stock > 0 and not _is_one_size(v.size.name)]
    return min(sizes, key=lambda s: (s.order, s.name)) if sizes else None


def home(request):
    image_qs = ProductImage.objects.order_by('order', 'id')
    variant_qs = ProductVariant.objects.select_related('size')
    base = (
        Product.objects
        .filter(is_active=True)
        .select_related('category', 'category__parent')
        .prefetch_related(Prefetch('images', queryset=image_qs), Prefetch('variants', queryset=variant_qs))
    )

    featured_products = base.filter(is_featured=True)[:8]

    # Fotos reales para el tendedero del hero y "Por qué Las Manolas":
    # primero destacados con foto; si no alcanzan, cualquier publicado con foto.
    featured_with_photo = [p for p in base.filter(is_featured=True) if p.main_image]
    others_with_photo = [p for p in base.filter(is_featured=False) if p.main_image]
    with_photo = (featured_with_photo + others_with_photo)[:7]

    # En el tendedero van de más chico a más grande: el "ropa para crecer".
    hanging = []
    for p in with_photo:
        size = _smallest_size(p)
        hanging.append({'product': p, 'size': size.name if size else '', 'order': size.order if size else 999})
    hanging.sort(key=lambda h: h['order'])

    return render(request, 'core/home.html', {
        'featured_products': featured_products,
        'clothesline': hanging,
        'why_photos': with_photo[:3],
        'size_count': sum(1 for s in Size.objects.all() if not _is_one_size(s.name)),
        'mp_available': mp_is_configured(),
    })
