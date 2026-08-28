from django.urls import path

from . import views

app_name = 'dashboard'

urlpatterns = [
    path('ingresar/', views.login_view, name='login'),
    path('salir/', views.logout_view, name='logout'),
    path('', views.overview, name='overview'),

    path('categorias/', views.category_list, name='category_list'),
    path('categorias/nueva/', views.category_create, name='category_create'),
    path('categorias/<int:pk>/editar/', views.category_edit, name='category_edit'),
    path('categorias/<int:pk>/eliminar/', views.category_delete, name='category_delete'),

    path('productos/', views.product_list, name='product_list'),
    path('productos/nuevo/', views.product_create, name='product_create'),
    path('productos/<int:pk>/editar/', views.product_edit, name='product_edit'),
    path('productos/<int:pk>/eliminar/', views.product_delete, name='product_delete'),

    path('talles-y-colores/', views.attributes, name='attributes'),
    path('talles-y-colores/talle/<int:pk>/eliminar/', views.size_delete, name='size_delete'),
    path('talles-y-colores/color/<int:pk>/eliminar/', views.color_delete, name='color_delete'),
    path('talles-y-colores/color/rapido/', views.color_quick_create, name='color_quick_create'),

    path('pedidos/', views.order_list, name='order_list'),
    path('pedidos/<int:pk>/', views.order_detail, name='order_detail'),

    path('configuracion/', views.site_config_edit, name='site_config'),
]
