from decimal import Decimal

from django.contrib import messages
from django.db import transaction
from django.shortcuts import get_object_or_404, redirect, render

from cart.cart import Cart
from core.models import SiteConfig
from payments.mp_client import create_preference
from payments.mp_client import is_configured as mp_is_configured

from .forms import CheckoutForm
from .models import Order, OrderItem
from .stock import sync_stock_for_status
from .whatsapp import coordinate_delivery_link, coordinate_payment_link


def _calculate_shipping(delivery_method, config):
    if delivery_method == Order.DeliveryMethod.COURIER:
        return config.courier_cost or Decimal('0')
    # Envío propio (La Plata / Magdalena y alrededores): el costo se
    # coordina aparte con el cliente, no se cobra un monto fijo acá.
    return Decimal('0')


def checkout(request):
    cart = Cart(request)

    if not cart:
        messages.info(request, 'Tu carrito está vacío.')
        return redirect('cart:detail')

    config = SiteConfig.load()
    mp_available = mp_is_configured()

    if request.method == 'POST':
        form = CheckoutForm(request.POST, mp_available=mp_available)

        if form.is_valid():
            # Revalidar stock: puede haber cambiado desde que se armó el
            # carrito (otro cliente comprando lo mismo, ajuste manual, etc.).
            insufficient = [
                item for item in cart
                if item['quantity'] > item['variant'].stock
            ]
            if insufficient:
                names = ', '.join(f"{i['variant'].product.name} ({i['variant'].size})" for i in insufficient)
                messages.error(request, f'Sin stock suficiente de: {names}. Ajustá las cantidades en tu carrito.')
                return redirect('cart:detail')

            shipping_cost = _calculate_shipping(form.cleaned_data['delivery_method'], config)

            with transaction.atomic():
                order = form.save(commit=False)
                order.subtotal = cart.get_total()
                order.shipping_cost = shipping_cost
                order.total = cart.get_total() + shipping_cost
                order.save()

                for item in cart:
                    variant = item['variant']
                    OrderItem.objects.create(
                        order=order,
                        variant=variant,
                        product_name=variant.product.name,
                        size_name=str(variant.size),
                        color_name=str(variant.color) if variant.color else '',
                        unit_price=variant.product.price,
                        quantity=item['quantity'],
                    )

                # El pedido nace "pendiente de pago" pero YA reserva el
                # stock (Order.STOCK_HELD_STATUSES incluye PENDING) — así
                # dos clientes no pueden "comprar" la misma última unidad
                # mientras uno de los dos todavía no confirmó el pago.
                # Misma función que usan el panel y el webhook de MP, para
                # que quede consistente pase lo que pase después con el
                # estado (ver orders/stock.py).
                sync_stock_for_status(order)

            cart.clear()

            if order.payment_method == Order.PaymentMethod.MERCADOPAGO and mp_available:
                try:
                    preference = create_preference(order)
                except Exception:
                    # No se pudo iniciar Mercado Pago: el pedido quedó
                    # guardado igual, pero como no hay pago resuelto todavía
                    # esto también termina en WhatsApp (coordinar pago).
                    return redirect(coordinate_payment_link(order, config))

                order.mp_preference_id = preference.get('id', '')
                order.save(update_fields=['mp_preference_id'])
                init_point = preference.get('init_point')
                if init_point:
                    return redirect(init_point)

                return redirect(coordinate_payment_link(order, config))

            # Efectivo/transferencia: no hay pago resuelto en el momento —
            # el pedido recién se vuelve real cuando el cliente coordina
            # precio/entrega, así que va directo a WhatsApp con todos los
            # datos ya cargados (pedido explícito: "TODO TIENE QUE
            # TERMINAR EN WSP"). La página de confirmación sigue existiendo
            # como respaldo (link directo, o si el cliente vuelve después).
            return redirect(coordinate_payment_link(order, config))
    else:
        form = CheckoutForm(mp_available=mp_available, initial={
            'payment_method': Order.PaymentMethod.MERCADOPAGO if mp_available else Order.PaymentMethod.TRANSFER,
            'delivery_method': Order.DeliveryMethod.SHIPPING,
        })

    # Costo de envío para pintar el resumen al cargar/reenviar la página
    # (si el POST fue inválido, esto NO es lo que se termina cobrando — eso
    # se recalcula de nuevo arriba con datos ya validados). El cliente
    # cambiando de método en vivo lo actualiza por JS en el template.
    selected_delivery_method = form.data.get('delivery_method') if form.is_bound else form.initial.get('delivery_method')
    shipping_cost = _calculate_shipping(selected_delivery_method, config)

    return render(request, 'orders/checkout.html', {
        'form': form,
        'cart': cart,
        'shipping_cost': shipping_cost,
        'total': cart.get_total() + shipping_cost,
        'mp_available': mp_available,
        'courier_cost': config.courier_cost,
    })


def order_confirmation(request, public_id):
    order = get_object_or_404(Order, public_id=public_id)
    config = SiteConfig.load()
    # Resultado inmediato que devuelve MP al volver (success/failure/
    # pending). El estado real (order.status) lo confirma el webhook
    # aparte, esto es solo para el mensaje que ve el cliente al toque.
    mp_result = request.GET.get('mp')

    # Esta página normalmente ya no es la primera parada de efectivo/
    # transferencia (van derecho a WhatsApp al confirmar, ver checkout()) —
    # queda como respaldo si el cliente vuelve después. Mercado Pago sí
    # aterriza acá siempre (pago resuelto en su sitio). En los dos casos
    # el botón de acá termina en WhatsApp — pagado: coordinar envío;
    # no pagado todavía (efectivo/transferencia, o MP pendiente/fallido):
    # coordinar el pago primero.
    is_paid = order.status == Order.Status.PAID or (
        order.payment_method == Order.PaymentMethod.MERCADOPAGO and mp_result == 'success'
    )
    whatsapp_url = (
        coordinate_delivery_link(order, config) if is_paid
        else coordinate_payment_link(order, config)
    )

    return render(request, 'orders/confirmation.html', {
        'order': order,
        'mp_result': mp_result,
        'whatsapp_url': whatsapp_url,
    })
