import json
import logging

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

from orders.models import Order
from orders.stock import sync_stock_for_status

from .mp_client import get_payment, is_configured

logger = logging.getLogger(__name__)


@csrf_exempt
def mp_webhook(request):
    """
    Notificación (IPN/webhook) de Mercado Pago. Siempre respondemos 200
    salvo un error nuestro real — si le devolvemos otra cosa, MP reintenta
    la notificación en bucle.
    """
    if not is_configured():
        return HttpResponse(status=200)

    topic = request.GET.get('type') or request.GET.get('topic')
    payment_id = request.GET.get('data.id') or request.GET.get('id')

    if not payment_id and request.body:
        try:
            body = json.loads(request.body)
            payment_id = body.get('data', {}).get('id')
            topic = topic or body.get('type')
        except (ValueError, AttributeError, TypeError):
            pass

    if topic != 'payment' or not payment_id:
        return HttpResponse(status=200)

    try:
        payment = get_payment(payment_id)
    except Exception:
        logger.exception('No se pudo consultar el pago %s en Mercado Pago', payment_id)
        return HttpResponse(status=200)

    order_public_id = payment.get('external_reference')
    status = payment.get('status')

    if not order_public_id:
        return HttpResponse(status=200)

    try:
        order = Order.objects.get(public_id=order_public_id)
    except (Order.DoesNotExist, ValueError):
        return HttpResponse(status=200)

    order.mp_payment_id = str(payment_id)
    if status == 'approved':
        order.status = Order.Status.PAID
    elif status in ('rejected', 'cancelled'):
        order.status = Order.Status.CANCELLED
    order.save(update_fields=['status', 'mp_payment_id', 'updated_at'])
    # Pagado con MP -> resta stock; rechazado/cancelado -> lo devuelve si
    # ya se había restado (ver orders/stock.py).
    sync_stock_for_status(order)

    return HttpResponse(status=200)
