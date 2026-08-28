from django.urls import path

from . import views

app_name = 'catalog'

urlpatterns = [
    path('<slug:section_slug>/', views.section_detail, name='section'),
    path('<slug:section_slug>/<slug:subcategory_slug>/', views.subcategory_detail, name='subcategory'),
    path('<slug:section_slug>/<slug:subcategory_slug>/<slug:product_slug>/', views.product_detail, name='product_detail'),
]
