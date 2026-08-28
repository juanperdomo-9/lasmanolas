from django import forms

from .models import Order

INPUT_CLASSES = (
    'w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 text-sm text-ink '
    'placeholder:text-ink-soft/50 transition focus:border-lilac-400 focus:outline-none'
)


class CheckoutForm(forms.ModelForm):
    class Meta:
        model = Order
        fields = [
            'full_name', 'email', 'phone',
            'delivery_method', 'delivery_zone',
            'address', 'city', 'postal_code', 'notes',
            'payment_method',
        ]
        widgets = {
            'full_name': forms.TextInput(attrs={'placeholder': 'Nombre y apellido'}),
            'email': forms.EmailInput(attrs={'placeholder': 'tu@email.com'}),
            'phone': forms.TextInput(attrs={'placeholder': '11 2233 4455'}),
            'delivery_method': forms.RadioSelect(),
            # sr-only: el radio real queda invisible, el <label> alrededor
            # (ver checkout.html) es el que se dibuja como chip — el
            # estado ":checked" del input sigue funcionando igual para el
            # CSS (has-[:checked]) aunque no se vea el círculo nativo.
            'delivery_zone': forms.RadioSelect(attrs={'class': 'sr-only peer'}),
            'address': forms.TextInput(attrs={'placeholder': 'Calle y número'}),
            'city': forms.TextInput(attrs={'placeholder': 'Localidad'}),
            'postal_code': forms.TextInput(attrs={'placeholder': 'CP'}),
            'notes': forms.Textarea(attrs={'rows': 3, 'placeholder': 'Referencias de entrega, aclaraciones, etc. (opcional)'}),
            'payment_method': forms.RadioSelect(),
        }
        labels = {
            'full_name': 'Nombre y apellido',
            'email': 'Email',
            'phone': 'Teléfono',
            'delivery_method': 'Método de entrega',
            'delivery_zone': 'Zona de envío',
            'address': 'Dirección',
            'city': 'Localidad',
            'postal_code': 'Código postal',
            'notes': 'Notas (opcional)',
            'payment_method': 'Método de pago',
        }

    def __init__(self, *args, mp_available=True, **kwargs):
        super().__init__(*args, **kwargs)

        if not mp_available:
            self.fields['payment_method'].choices = [
                choice for choice in Order.PaymentMethod.choices
                if choice[0] != Order.PaymentMethod.MERCADOPAGO
            ]

        # La zona solo es obligatoria si se elige "Envío" (no Andreani) — se
        # valida a mano en clean(), acá se la deja opcional a nivel campo.
        # Django arma el choice field con una opción en blanco ("---------")
        # de más porque el modelo tiene blank=True — sin este reset
        # aparecía como un tercer chip fantasma ya tildado por defecto.
        self.fields['delivery_zone'].required = False
        self.fields['delivery_zone'].choices = Order.DeliveryZone.choices

        for name, field in self.fields.items():
            if name not in ('payment_method', 'delivery_method', 'delivery_zone'):
                field.widget.attrs.setdefault('class', INPUT_CLASSES)

    def clean(self):
        cleaned = super().clean()

        if cleaned.get('delivery_method') == Order.DeliveryMethod.SHIPPING:
            if not cleaned.get('delivery_zone'):
                self.add_error('delivery_zone', 'Elegí tu zona de envío.')
        else:
            # Mensajería (Andreani): la zona no aplica, se limpia por las dudas.
            cleaned['delivery_zone'] = ''

        return cleaned
