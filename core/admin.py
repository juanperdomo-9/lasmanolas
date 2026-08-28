from django.contrib import admin
from django.shortcuts import redirect

from .models import SiteConfig


@admin.register(SiteConfig)
class SiteConfigAdmin(admin.ModelAdmin):
    """
    Singleton: un solo registro de configuración. Se oculta la lista y se
    redirige siempre a editar el pk=1, y se bloquea "Agregar"/"Eliminar"
    para que el cliente no termine con dos configuraciones distintas.
    """

    fieldsets = (
        ('Sitio', {'fields': ('site_name', 'tagline')}),
        ('Contacto', {'fields': ('whatsapp_number', 'instagram_url', 'contact_email')}),
        ('Envío', {'fields': ('courier_cost',)}),
        ('Pagos manuales', {'fields': ('bank_transfer_info', 'cash_payment_info')}),
    )

    def has_add_permission(self, request):
        return not SiteConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        obj = SiteConfig.load()
        return redirect('admin:core_siteconfig_change', obj.pk)
