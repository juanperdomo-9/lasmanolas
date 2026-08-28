from django.db.models import Q
from django.shortcuts import get_object_or_404, render

from .models import Category, Product


def section_detail(request, section_slug):
    section = get_object_or_404(Category, slug=section_slug, parent__isnull=True, is_active=True)
    subcategories = section.subcategories.filter(is_active=True).order_by('order', 'name')

    query = request.GET.get('q', '').strip()

    if query:
        # Con búsqueda activa: resultados en un solo grid, sin "estantes".
        search_results = (
            Product.objects
            .filter(is_active=True, category__parent=section)
            .filter(
                Q(name__icontains=query)
                | Q(description__icontains=query)
                | Q(category__name__icontains=query)
            )
            .select_related('category')
            .prefetch_related('images')
            .distinct()
        )
        return render(request, 'catalog/section.html', {
            'section': section,
            'subcategories': subcategories,
            'query': query,
            'search_results': search_results,
        })

    # Sin búsqueda: un "estante" horizontal por subcategoría con producto,
    # como pidió el cliente (Remeras: ... / Buzos: ... / etc.) en vez de un
    # único grid gigante. Se salta la subcategoría si no tiene productos.
    shelves = []
    for sub in subcategories:
        sub_products = list(
            Product.objects
            .filter(is_active=True, category=sub)
            .prefetch_related('images')[:8]
        )
        if sub_products:
            shelves.append({'subcategory': sub, 'products': sub_products})

    return render(request, 'catalog/section.html', {
        'section': section,
        'subcategories': subcategories,
        'shelves': shelves,
        'has_any_product': bool(shelves),
    })


def subcategory_detail(request, section_slug, subcategory_slug):
    section = get_object_or_404(Category, slug=section_slug, parent__isnull=True, is_active=True)
    subcategory = get_object_or_404(
        Category, slug=subcategory_slug, parent=section, is_active=True,
    )

    products = (
        Product.objects
        .filter(is_active=True, category=subcategory)
        .prefetch_related('images')
    )

    return render(request, 'catalog/subcategory.html', {
        'section': section,
        'subcategory': subcategory,
        'products': products,
    })


def product_detail(request, section_slug, subcategory_slug, product_slug):
    section = get_object_or_404(Category, slug=section_slug, parent__isnull=True, is_active=True)
    subcategory = get_object_or_404(Category, slug=subcategory_slug, parent=section, is_active=True)
    product = get_object_or_404(
        Product.objects.select_related('category').prefetch_related('images', 'variants__size', 'variants__color'),
        slug=product_slug, category=subcategory, is_active=True,
    )

    sizes = sorted({v.size for v in product.variants.all()}, key=lambda s: (s.order, s.name))
    colors = sorted({v.color for v in product.variants.all() if v.color}, key=lambda c: c.name)

    return render(request, 'catalog/product_detail.html', {
        'section': section,
        'subcategory': subcategory,
        'product': product,
        'sizes': sizes,
        'colors': colors,
    })
