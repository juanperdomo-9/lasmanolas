from django.urls import path

from . import views

app_name = 'cart'

urlpatterns = [
    path('', views.cart_detail, name='detail'),
    path('agregar/', views.cart_add, name='add'),
    path('actualizar/<int:variant_id>/', views.cart_update, name='update'),
    path('eliminar/<int:variant_id>/', views.cart_remove, name='remove'),
]
