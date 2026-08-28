from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('panel/', include('dashboard.urls')),
    # El panel vive en /panel/ (URLs en español, como el resto del sitio),
    # pero /dashboard/ redirige acá por si queda la costumbre del nombre.
    path('dashboard/', RedirectView.as_view(url='/panel/', permanent=False)),
    path('carrito/', include('cart.urls')),
    path('pedido/', include('orders.urls')),
    path('pagos/', include('payments.urls')),
    path('', include('core.urls')),
    path('', include('catalog.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
