from django.db import models


class SiteConfig(models.Model):
    """
    Configuración global editable desde el admin (patrón singleton: siempre
    vive en pk=1). Acá el cliente puede cambiar el WhatsApp, el costo de
    envío o los datos de transferencia sin depender de un redeploy.
    """

    site_name = models.CharField('nombre del sitio', max_length=80, default='Las Manolas')
    tagline = models.CharField(
        'bajada', max_length=160, blank=True,
        default='Ropita linda y cómoda para bebés, niños y adolescentes.',
    )

    whatsapp_number = models.CharField(
        'WhatsApp', max_length=20,
        help_text='Formato internacional, solo números. Ej: 5491122334455',
    )
    instagram_url = models.URLField('Instagram', blank=True)
    contact_email = models.EmailField('email de contacto', blank=True)

    courier_cost = models.DecimalField(
        'costo de mensajería (Andreani)', max_digits=10, decimal_places=2, default=10000,
        help_text=(
            'Costo fijo que se muestra y cobra en el checkout para la opción '
            '"Mensajería (Andreani)". El envío propio (La Plata / Magdalena y '
            'alrededores) se coordina aparte con el cliente, no tiene costo fijo acá.'
        ),
    )

    bank_transfer_info = models.TextField(
        'datos para transferencia', blank=True,
        help_text='CBU, alias y titular. Se muestra en el checkout cuando el cliente elige "Transferencia".',
    )
    cash_payment_info = models.TextField(
        'instrucciones para efectivo', blank=True,
        help_text='Ej: dirección/horario de retiro, o cómo se coordina el pago en efectivo.',
    )

    class Meta:
        verbose_name = 'configuración del sitio'
        verbose_name_plural = 'configuración del sitio'

    def __str__(self):
        return 'Configuración del sitio'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(
            pk=1,
            defaults={'whatsapp_number': '5491100000000'},
        )
        return obj

    @property
    def whatsapp_link(self):
        return f'https://wa.me/{self.whatsapp_number}'
