from django.contrib import admin
from django.utils.html import format_html

from .models import Category, Color, Product, ProductImage, ProductVariant, Size


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent', 'order', 'is_active', 'thumb')
    list_filter = ('parent', 'is_active')
    list_editable = ('order', 'is_active')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}
    autocomplete_fields = ('parent',)
    search_help_text = 'Buscar por nombre'

    def thumb(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="height:32px;width:32px;object-fit:cover;border-radius:6px">', obj.image.url)
        return '—'
    thumb.short_description = 'Imagen'


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ('image', 'preview', 'alt_text', 'order')
    readonly_fields = ('preview',)

    def preview(self, obj):
        if obj.pk and obj.image:
            return format_html('<img src="{}" style="height:60px;width:60px;object-fit:cover;border-radius:8px">', obj.image.url)
        return '—'
    preview.short_description = 'Vista previa'


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 3
    autocomplete_fields = ('size', 'color')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'compare_at_price', 'total_stock_display', 'is_active', 'is_featured')
    list_filter = ('category__parent', 'category', 'is_active', 'is_featured')
    list_editable = ('is_active', 'is_featured')
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    autocomplete_fields = ('category',)
    inlines = (ProductImageInline, ProductVariantInline)
    fieldsets = (
        (None, {'fields': ('category', 'name', 'slug', 'description')}),
        ('Precio', {'fields': ('price', 'compare_at_price')}),
        ('Visibilidad', {'fields': ('is_active', 'is_featured')}),
    )

    def total_stock_display(self, obj):
        return obj.total_stock
    total_stock_display.short_description = 'Stock total'


@admin.register(Size)
class SizeAdmin(admin.ModelAdmin):
    list_display = ('name', 'order')
    list_editable = ('order',)
    search_fields = ('name',)


@admin.register(Color)
class ColorAdmin(admin.ModelAdmin):
    list_display = ('name', 'swatch', 'hex_code')
    search_fields = ('name',)

    def swatch(self, obj):
        if obj.hex_code:
            return format_html('<span style="display:inline-block;height:18px;width:18px;border-radius:50%;background:{};border:1px solid #ddd"></span>', obj.hex_code)
        return '—'
    swatch.short_description = ''
