from django import forms

from catalog.models import Category, Color, Product, ProductImage, ProductVariant, Size
from core.models import SiteConfig

INPUT_CLASSES = (
    'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white '
    'placeholder:text-white/30 transition focus:border-lilac-400 focus:outline-none focus:ring-2 focus:ring-lilac-400/30'
)
CHECK_CLASSES = 'h-5 w-5 rounded border-white/20 bg-white/5 text-lilac-500 focus:ring-lilac-400'
FILE_CLASSES = (
    'block w-full text-sm text-white/60 file:mr-4 file:rounded-full file:border-0 file:bg-lilac-500/20 '
    'file:px-4 file:py-2 file:text-sm file:font-bold file:text-lilac-300 hover:file:bg-lilac-500/30'
)


class StyledFormMixin:
    """Aplica clases Tailwind a todos los widgets del form automáticamente,
    para no repetir `attrs={'class': ...}` en cada campo de cada form."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            widget = field.widget
            if isinstance(widget, forms.CheckboxInput):
                widget.attrs.setdefault('class', CHECK_CLASSES)
            elif isinstance(widget, forms.ClearableFileInput):
                widget.attrs.setdefault('class', FILE_CLASSES)
            else:
                widget.attrs.setdefault('class', INPUT_CLASSES)


class CategoryForm(StyledFormMixin, forms.ModelForm):
    class Meta:
        model = Category
        fields = ['parent', 'name', 'color', 'image', 'order', 'is_active']
        widgets = {
            # Color libre — el cliente elige cualquiera, sin lista fija.
            'color': forms.TextInput(attrs={'type': 'color'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['parent'].queryset = Category.objects.filter(parent__isnull=True).order_by('order', 'name')
        self.fields['parent'].required = False
        self.fields['parent'].empty_label = 'Es una sección principal (Bebés / Niños / Adolescentes)'


class ProductForm(StyledFormMixin, forms.ModelForm):
    class Meta:
        model = Product
        fields = ['category', 'name', 'description', 'price', 'compare_at_price', 'is_active', 'is_featured']
        widgets = {
            'description': forms.Textarea(attrs={'rows': 4}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['category'].queryset = (
            Category.objects.filter(parent__isnull=False)
            .select_related('parent')
            .order_by('parent__order', 'order')
        )
        self.fields['category'].label_from_instance = lambda obj: f'{obj.parent.name} / {obj.name}'


class BaseStyledModelForm(StyledFormMixin, forms.ModelForm):
    """Base para los forms generados por los inline formsets de abajo."""
    pass


class ProductImageForm(BaseStyledModelForm):
    class Meta:
        model = ProductImage
        fields = ['image', 'color', 'alt_text', 'order']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['color'].required = False
        self.fields['color'].empty_label = 'General (todos los colores)'


# extra=0: el editor de producto (dashboard/templates .../product_form.html
# + static/js/product-colors.js) arma TODAS las filas por JS agrupadas por
# color — no se rinden filas "extra" en blanco del formset acá.
ProductImageFormSet = forms.inlineformset_factory(
    Product, ProductImage,
    form=ProductImageForm,
    fields=['image', 'color', 'alt_text', 'order'],
    extra=0, can_delete=True,
)

ProductVariantFormSet = forms.inlineformset_factory(
    Product, ProductVariant,
    form=BaseStyledModelForm,
    fields=['size', 'color', 'sku', 'stock'],
    extra=0, can_delete=True,
)


class SizeForm(StyledFormMixin, forms.ModelForm):
    class Meta:
        model = Size
        fields = ['name', 'order']


class ColorForm(StyledFormMixin, forms.ModelForm):
    class Meta:
        model = Color
        fields = ['name', 'hex_code']
        widgets = {
            # Selector visual de color en vez de pedir el código hex a mano
            # (el cliente no tiene por qué saber códigos hexadecimales).
            'hex_code': forms.TextInput(attrs={'type': 'color'}),
        }


class SiteConfigForm(StyledFormMixin, forms.ModelForm):
    class Meta:
        model = SiteConfig
        fields = [
            'site_name', 'tagline', 'whatsapp_number', 'instagram_url', 'contact_email',
            'courier_cost',
            'bank_transfer_info', 'cash_payment_info',
        ]
        widgets = {
            'bank_transfer_info': forms.Textarea(attrs={'rows': 3}),
            'cash_payment_info': forms.Textarea(attrs={'rows': 3}),
        }
