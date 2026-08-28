# ===========================================
# LAS MANOLAS — orders/whatsapp.py
# Todo el checkout tiene que terminar en WhatsApp (pedido explícito del
# cliente): efectivo/transferencia van DIRECTO a WhatsApp apenas se
# confirma el pedido (necesitan coordinar precio/entrega antes de que
# valga como venta real); Mercado Pago paga solo, pero después también
# se ofrece un botón a WhatsApp para coordinar el envío o consultar el
# seguimiento. Este módulo arma el texto + link de wa.me para los dos
# casos a partir de un Order ya guardado.
# ===========================================

from urllib.parse import quote

from .models import Order


def _order_summary_lines(order):
    lines = [f'Pedido #{order.pk}']

    for item in order.items.all():
        detail = item.size_name
        if item.color_name:
            detail += f' · {item.color_name}'
        lines.append(f'• {item.product_name} ({detail}) x{item.quantity}')

    if order.delivery_method == Order.DeliveryMethod.SHIPPING:
        lines.append(f'Entrega: Envío — {order.get_delivery_zone_display()} (costo a coordinar)')
    else:
        lines.append(f'Entrega: Mensajería (Andreani) — ${order.shipping_cost}')

    if order.address:
        address = order.address
        if order.city:
            address += f', {order.city}'
        if order.postal_code:
            address += f' (CP {order.postal_code})'
        lines.append(f'Dirección: {address}')

    lines.append(f'Total: ${order.total}')

    return lines


def _wa_link(config, text):
    return f'{config.whatsapp_link}?text={quote(text)}'


def coordinate_payment_link(order, config):
    """Efectivo/transferencia: el pedido recién queda "real" cuando se
    coordina el pago y la entrega por WhatsApp — es a donde se manda al
    cliente apenas confirma el pedido."""
    intro = (
        f'Hola! Quiero coordinar mi pedido #{order.pk} '
        f'({order.get_payment_method_display()}).'
    )
    text = '\n'.join([intro, '', *_order_summary_lines(order)])
    return _wa_link(config, text)


def coordinate_delivery_link(order, config):
    """Mercado Pago: el pago ya está resuelto solo, esto es para coordinar
    envío o pedir seguimiento — botón en la página de confirmación."""
    intro = f'Hola! Mi pedido #{order.pk} ya está pagado con Mercado Pago. Quiero coordinar el envío / consultar el seguimiento.'
    text = '\n'.join([intro, '', *_order_summary_lines(order)])
    return _wa_link(config, text)
