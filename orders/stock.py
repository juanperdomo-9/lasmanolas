# ===========================================
# LAS MANOLAS — orders/stock.py
# Regla de negocio del cliente: el stock se descuenta cuando un pedido
# queda PAGADO o ENTREGADO (no antes — "pendiente de pago" no reserva
# nada), y se devuelve si se CANCELA. `Order.stock_deducted` guarda si
# ESTE pedido ya tiene su stock restado, así que llamar a
# sync_stock_for_status() después de cualquier cambio de estado (desde
# el panel o desde el webhook de Mercado Pago) es siempre seguro: no
# resta ni devuelve dos veces sin importar qué camino tomó el estado
# (pendiente→pagado→entregado, pagado→cancelado, pagado→pendiente, etc.).
# ===========================================

from django.db import transaction

from .models import Order


def sync_stock_for_status(order):
    should_hold_stock = order.status in Order.STOCK_HELD_STATUSES

    if should_hold_stock and not order.stock_deducted:
        _adjust_variant_stock(order, sign=-1)
        order.stock_deducted = True
        order.save(update_fields=['stock_deducted'])
    elif not should_hold_stock and order.stock_deducted:
        _adjust_variant_stock(order, sign=1)
        order.stock_deducted = False
        order.save(update_fields=['stock_deducted'])


@transaction.atomic
def _adjust_variant_stock(order, sign):
    for item in order.items.select_related('variant'):
        if not item.variant:
            continue
        item.variant.stock = max(item.variant.stock + sign * item.quantity, 0)
        item.variant.save(update_fields=['stock'])
