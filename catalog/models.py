from decimal import Decimal

from django.db import models
from django.urls import reverse
from django.utils.text import slugify


class Category(models.Model):
    """
    Un solo modelo para las dos capas del catálogo que pidió el cliente:

    - Secciones (parent=None): Bebés, Niños, Adolescentes.
    - Subcategorías por prenda (parent=<sección>): Remera, Buzo, Joggin...

    El navbar, el home y las páginas de categoría se arman todos leyendo
    de acá (ver core.context_processors.site_context), así que agregar o
    reordenar una prenda nueva es editar el admin, no tocar templates.
    """

    name = models.CharField('nombre', max_length=80)
    slug = models.SlugField('slug', max_length=90, blank=True)
    color = models.CharField(
        'color', max_length=7, default='#A97FDE',
        help_text='Color libre de la card en el home. Solo se usa en las secciones principales.',
    )
    parent = models.ForeignKey(
        'self', verbose_name='sección',
        null=True, blank=True,
        related_name='subcategories',
        on_delete=models.CASCADE,
        help_text='Vacío = es una sección principal (Bebés/Niños/Adolescentes). '
                   'Completo = es una subcategoría por prenda dentro de esa sección.',
    )
    image = models.ImageField('imagen', upload_to='categories/', blank=True, null=True)
    order = models.PositiveIntegerField('orden', default=0)
    is_active = models.BooleanField('activa', default=True)

    class Meta:
        verbose_name = 'categoría'
        verbose_name_plural = 'categorías'
        ordering = ['parent_id', 'order', 'name']
        constraints = [
            models.UniqueConstraint(fields=['parent', 'slug'], name='unique_category_slug_per_parent'),
        ]

    def __str__(self):
        if self.parent_id:
            return f'{self.parent.name} / {self.name}'
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        if self.parent_id:
            return reverse('catalog:subcategory', args=[self.parent.slug, self.slug])
        return reverse('catalog:section', args=[self.slug])

    @property
    def is_section(self):
        return self.parent_id is None


class Size(models.Model):
    """Talles reutilizables entre productos: RN, 0-3M, 3-6M, 2, 4, 6, S, M, L..."""

    name = models.CharField('talle', max_length=20, unique=True)
    order = models.PositiveIntegerField('orden', default=0)

    class Meta:
        verbose_name = 'talle'
        verbose_name_plural = 'talles'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class Color(models.Model):
    name = models.CharField('color', max_length=40, unique=True)
    hex_code = models.CharField(
        'código hex', max_length=7, blank=True,
        help_text='Opcional, para pintar un swatch. Ej: #F6D2DE',
    )

    class Meta:
        verbose_name = 'color'
        verbose_name_plural = 'colores'
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(
        Category, verbose_name='subcategoría', related_name='products',
        on_delete=models.PROTECT,
        limit_choices_to={'parent__isnull': False},
        help_text='La subcategoría por prenda (no la sección).',
    )
    name = models.CharField('nombre', max_length=140)
    slug = models.SlugField('slug', max_length=160, unique=True, blank=True)
    description = models.TextField('descripción', blank=True)

    price = models.DecimalField('precio', max_digits=10, decimal_places=2)
    compare_at_price = models.DecimalField(
        'precio anterior', max_digits=10, decimal_places=2, null=True, blank=True,
        help_text='Completalo solo si está en oferta: se muestra tachado arriba del precio actual.',
    )

    is_active = models.BooleanField('publicado', default=True)
    is_featured = models.BooleanField('destacado', default=False, help_text='Aparece en la home.')

    created_at = models.DateTimeField('creado', auto_now_add=True)
    updated_at = models.DateTimeField('actualizado', auto_now=True)

    class Meta:
        verbose_name = 'producto'
        verbose_name_plural = 'productos'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            i = 2
            while Product.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base_slug}-{i}'
                i += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        section = self.category.parent
        return reverse(
            'catalog:product_detail',
            args=[section.slug, self.category.slug, self.slug],
        )

    @property
    def section(self):
        return self.category.parent

    @property
    def main_image(self):
        first = self.images.first()
        return first.image if first else None

    @property
    def total_stock(self):
        return sum(v.stock for v in self.variants.all())

    @property
    def in_stock(self):
        return self.total_stock > 0

    @property
    def discount_percent(self):
        if not self.compare_at_price or self.compare_at_price <= self.price:
            return 0
        discount = (self.compare_at_price - self.price) / self.compare_at_price * Decimal('100')
        return int(discount)


class ProductImage(models.Model):
    """
    Galería de fotos del producto. Cada foto puede quedar "etiquetada"
    con un color (varias fotos por color, sin límite) — al elegir ese
    color en el detalle, la galería muestra esas fotos primero. Sin
    color asignado = foto general, se muestra sea cual sea el color
    elegido (útil para una sola foto de packaging, detalle de tela, etc).
    """

    product = models.ForeignKey(Product, related_name='images', on_delete=models.CASCADE)
    color = models.ForeignKey(
        Color, verbose_name='color', null=True, blank=True,
        related_name='product_images', on_delete=models.SET_NULL,
        help_text='Vacío = foto general (se muestra con cualquier color elegido).',
    )
    image = models.ImageField('imagen', upload_to='products/')
    alt_text = models.CharField('texto alternativo', max_length=140, blank=True)
    order = models.PositiveIntegerField('orden', default=0)

    class Meta:
        verbose_name = 'imagen de producto'
        verbose_name_plural = 'imágenes de producto'
        ordering = ['order', 'id']

    def __str__(self):
        return f'{self.product.name} — foto {self.order}'


class ProductVariant(models.Model):
    """Combinación talle + color con su propio stock."""

    product = models.ForeignKey(Product, related_name='variants', on_delete=models.CASCADE)
    size = models.ForeignKey(Size, verbose_name='talle', on_delete=models.PROTECT)
    color = models.ForeignKey(
        Color, verbose_name='color', on_delete=models.PROTECT,
        null=True, blank=True,
    )
    sku = models.CharField('SKU', max_length=40, blank=True)
    stock = models.PositiveIntegerField('stock', default=0)

    class Meta:
        verbose_name = 'variante'
        verbose_name_plural = 'variantes (talle / color / stock)'
        ordering = ['size__order']
        constraints = [
            models.UniqueConstraint(fields=['product', 'size', 'color'], name='unique_variant_per_product'),
        ]

    def __str__(self):
        color_part = f' · {self.color}' if self.color else ''
        return f'{self.size}{color_part} — stock: {self.stock}'

    @property
    def in_stock(self):
        return self.stock > 0
