import uuid

from django.db import models


class Order(models.Model):

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pendiente de pago'
        PAID = 'paid', 'Pagado'
        DELIVERED = 'delivered', 'Entregado'
        CANCELLED = 'cancelled', 'Cancelado'

    # Estados en los que el pedido "tiene" el stock (ya se restó de las
    # variantes) — ver orders/stock.py::sync_stock_for_status. Pendiente
    # también reserva (se descuenta apenas se crea el pedido, para que dos
    # clientes no puedan "comprar" la misma última unidad); solo cancelado
    # lo devuelve.
    STOCK_HELD_STATUSES = (Status.PENDING, Status.PAID, Status.DELIVERED)

    class PaymentMethod(models.TextChoices):
        MERCADOPAGO = 'mercadopago', 'Mercado Pago'
        CASH = 'cash', 'Efectivo'
        TRANSFER = 'transfer', 'Transferencia'

    class DeliveryMethod(models.TextChoices):
        SHIPPING = 'shipping', 'Envío (La Plata / Magdalena y alrededores)'
        COURIER = 'courier', 'Andreani'

    class DeliveryZone(models.TextChoices):
        LA_PLATA = 'la_plata', 'La Plata'
        MAGDALENA = 'magdalena', 'Magdalena y alrededores'

    # UUID usado en las URLs públicas de confirmación (success/failure/
    # pending, la página de "gracias por tu compra"). El pk autoincremental
    # no se expone ahí: es secuencial y adivinable, y esas páginas muestran
    # nombre/dirección/teléfono del cliente — cualquiera podría curiosear
    # pedidos ajenos probando ids consecutivos.
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    # Datos del cliente — checkout como invitado, sin cuentas de usuario.
    full_name = models.CharField('nombre y apellido', max_length=140)
    email = models.EmailField('email')
    phone = models.CharField('teléfono', max_length=30)

    # Entrega
    delivery_method = models.CharField(
        'método de entrega', max_length=20, choices=DeliveryMethod.choices,
        default=DeliveryMethod.SHIPPING,
    )
    # Solo aplica cuando delivery_method=SHIPPING (envío propio, no Andreani)
    # — para Andreani no hay zona, se manda a cualquier lado.
    delivery_zone = models.CharField(
        'zona de envío', max_length=20, choices=DeliveryZone.choices, blank=True,
    )
    address = models.CharField('dirección', max_length=200, blank=True)
    city = models.CharField('localidad', max_length=100, blank=True)
    postal_code = models.CharField('código postal', max_length=20, blank=True)
    notes = models.TextField('notas del pedido', blank=True)

    payment_method = models.CharField('método de pago', max_length=20, choices=PaymentMethod.choices)
    status = models.CharField('estado', max_length=20, choices=Status.choices, default=Status.PENDING)
    # Si ya se restó el stock de las variantes para este pedido (pagado o
    # entregado) — evita restar/devolver dos veces al ir y volver entre
    # estados. Ver orders/stock.py.
    stock_deducted = models.BooleanField('stock ya descontado', default=False, editable=False)

    subtotal = models.DecimalField('subtotal', max_digits=10, decimal_places=2)
    shipping_cost = models.DecimalField('costo de envío', max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField('total', max_digits=10, decimal_places=2)

    # Referencias externas de Mercado Pago, para cruzar con el webhook.
    mp_preference_id = models.CharField('MP preference id', max_length=80, blank=True)
    mp_payment_id = models.CharField('MP payment id', max_length=80, blank=True)

    created_at = models.DateTimeField('creado', auto_now_add=True)
    updated_at = models.DateTimeField('actualizado', auto_now=True)

    class Meta:
        verbose_name = 'pedido'
        verbose_name_plural = 'pedidos'
        ordering = ['-created_at']

    def __str__(self):
        return f'Pedido #{self.pk} — {self.full_name}'


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    variant = models.ForeignKey(
        'catalog.ProductVariant', verbose_name='variante',
        null=True, blank=True, on_delete=models.SET_NULL,
    )

    # Snapshot de los datos al momento de la compra: si el producto cambia
    # de precio o se borra después, el pedido histórico no se altera.
    product_name = models.CharField('producto', max_length=140)
    size_name = models.CharField('talle', max_length=20, blank=True)
    color_name = models.CharField('color', max_length=40, blank=True)
    unit_price = models.DecimalField('precio unitario', max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField('cantidad')

    class Meta:
        verbose_name = 'ítem de pedido'
        verbose_name_plural = 'ítems de pedido'

    def __str__(self):
        return f'{self.product_name} x{self.quantity}'

    @property
    def subtotal(self):
        return self.unit_price * self.quantity
