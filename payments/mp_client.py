"""
Integración con Mercado Pago Checkout Pro.

Mientras MP_ACCESS_TOKEN esté vacío en .env (todavía no se sacaron las
credenciales), is_configured() devuelve False y el checkout oculta la
opción de pagar con Mercado Pago en vez de romperse.
"""
import mercadopago
from django.conf import settings


def is_configured():
    return bool(settings.MP_ACCESS_TOKEN)


def get_sdk():
    return mercadopago.SDK(settings.MP_ACCESS_TOKEN)


def create_preference(order):
    """Crea la preferencia de pago para un pedido y devuelve el dict de MP
    (usamos preference['init_point'] para redirigir al checkout)."""
    sdk = get_sdk()

    items = [
        {
            'title': item.product_name + (f' ({item.size_name})' if item.size_name else ''),
            'quantity': item.quantity,
            'unit_price': float(item.unit_price),
            'currency_id': 'ARS',
        }
        for item in order.items.all()
    ]

    if order.shipping_cost:
        items.append({
            'title': 'Envío',
            'quantity': 1,
            'unit_price': float(order.shipping_cost),
            'currency_id': 'ARS',
        })

    site_url = settings.SITE_URL.rstrip('/')

    preference_data = {
        'items': items,
        'payer': {
            'name': order.full_name,
            'email': order.email,
        },
        # El mismo public_id (no el pk secuencial) para las 3, más un
        # query param con el resultado inmediato que devuelve MP — el
        # estado real del pedido lo actualiza el webhook por separado,
        # esto es solo para el mensaje que ve el cliente al volver.
        'back_urls': {
            'success': f'{site_url}/pedido/{order.public_id}/?mp=success',
            'failure': f'{site_url}/pedido/{order.public_id}/?mp=failure',
            'pending': f'{site_url}/pedido/{order.public_id}/?mp=pending',
        },
        'auto_return': 'approved',
        # public_id (UUID), no el pk: es lo que el webhook usa para
        # encontrar el pedido de vuelta (ver payments/views.py).
        'external_reference': str(order.public_id),
        'notification_url': f'{site_url}/pagos/webhook/',
    }

    response = sdk.preference().create(preference_data)
    return response.get('response', {})


def get_payment(payment_id):
    sdk = get_sdk()
    response = sdk.payment().get(payment_id)
    return response.get('response', {})
