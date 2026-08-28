from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.template.loader import render_to_string
from django.views.decorators.http import require_POST

from catalog.models import ProductVariant

from .cart import Cart


def _is_ajax(request):
    return request.headers.get('X-Requested-With') == 'XMLHttpRequest'


def _cart_items_html(request, cart):
    return render_to_string('cart/includes/cart_items.html', {'cart': cart}, request=request)


@require_POST
def cart_add(request):
    cart = Cart(request)
    variant = get_object_or_404(ProductVariant, id=request.POST.get('variant_id'))

    try:
        quantity = int(request.POST.get('quantity', 1))
    except (TypeError, ValueError):
        quantity = 1
    quantity = max(quantity, 1)

    if variant.stock <= 0:
        if _is_ajax(request):
            return JsonResponse({'success': False, 'error': 'Sin stock disponible en esa combinación.'}, status=400)
        return redirect(variant.product.get_absolute_url())

    cart.add(variant, quantity)

    if _is_ajax(request):
        return JsonResponse({
            'success': True,
            'count': len(cart),
            'total': str(cart.get_total()),
            'items_html': _cart_items_html(request, cart),
        })
    return redirect('cart:detail')


@require_POST
def cart_update(request, variant_id):
    cart = Cart(request)
    try:
        quantity = int(request.POST.get('quantity', 0))
    except (TypeError, ValueError):
        quantity = 0
    cart.update(variant_id, quantity)

    if _is_ajax(request):
        return JsonResponse({
            'success': True,
            'count': len(cart),
            'total': str(cart.get_total()),
            'items_html': _cart_items_html(request, cart),
        })
    return redirect('cart:detail')


@require_POST
def cart_remove(request, variant_id):
    cart = Cart(request)
    cart.remove(variant_id)

    if _is_ajax(request):
        return JsonResponse({
            'success': True,
            'count': len(cart),
            'total': str(cart.get_total()),
            'items_html': _cart_items_html(request, cart),
        })
    return redirect('cart:detail')


def cart_detail(request):
    cart = Cart(request)
    return render(request, 'cart/detail.html', {'cart': cart})
