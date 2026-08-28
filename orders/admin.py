from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product_name', 'size_name', 'color_name', 'unit_price', 'quantity', 'variant')
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'full_name', 'payment_method', 'status', 'total', 'created_at')
    list_filter = ('status', 'payment_method', 'created_at')
    search_fields = ('full_name', 'email', 'phone')
    readonly_fields = (
        'public_id', 'subtotal', 'shipping_cost', 'total',
        'mp_preference_id', 'mp_payment_id', 'created_at', 'updated_at',
    )
    inlines = (OrderItemInline,)
