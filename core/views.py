from django.shortcuts import render

from catalog.models import Product


def home(request):
    featured_products = (
        Product.objects
        .filter(is_active=True, is_featured=True)
        .select_related('category', 'category__parent')
        .prefetch_related('images')[:8]
    )

    return render(request, 'core/home.html', {
        'featured_products': featured_products,
    })
