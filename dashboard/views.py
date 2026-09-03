import json

from django.contrib import messages
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.decorators import user_passes_test
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Prefetch, Q
from django.db.models.deletion import ProtectedError
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse

from catalog.models import Category, Color, Product, Size
from core.models import SiteConfig
from orders.models import Order
from orders.stock import sync_stock_for_status

from .forms import (
    CategoryForm, ColorForm, ProductForm, ProductImageFormSet,
    ProductVariantFormSet, SiteConfigForm, SizeForm,
)


def staff_required(view_func):
    """Solo staff logueado entra. Redirige al login propio del panel, no al de /admin/."""
    return user_passes_test(
        lambda u: u.is_authenticated and u.is_staff,
        login_url='dashboard:login',
    )(view_func)


# ==========================================
# AUTH
# ==========================================

def login_view(request):
    if request.user.is_authenticated and request.user.is_staff:
        return redirect('dashboard:overview')

    error = None
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')

        # El teclado de varios celulares auto-capitaliza la primera letra
        # de un campo de texto ("admin" -> "Admin") — Django autentica por
        # username exacto (sensible a mayúsculas), así que eso rompía el
        # login sin ningún error visible que lo explique. Se resuelve el
        # username real (case-insensitive) antes de autenticar.
        User = get_user_model()
        try:
            username = User.objects.get(username__iexact=username).username
        except User.DoesNotExist:
            pass

        user = authenticate(request, username=username, password=password)
        if user is not None and user.is_staff:
            login(request, user)
            next_url = request.GET.get('next') or reverse('dashboard:overview')
            return redirect(next_url)
        error = 'Usuario o contraseña incorrectos.'

    return render(request, 'dashboard/login.html', {'error': error})


@staff_required
def logout_view(request):
    logout(request)
    return redirect('dashboard:login')


# ==========================================
# RESUMEN
# ==========================================

@staff_required
def overview(request):
    products = Product.objects.prefetch_related('variants')
    out_of_stock = [p for p in products if not p.in_stock]

    stats = {
        'products_count': products.count(),
        'active_products_count': Product.objects.filter(is_active=True).count(),
        'out_of_stock_count': len(out_of_stock),
        'sections_count': Category.objects.filter(parent__isnull=True).count(),
        'subcategories_count': Category.objects.filter(parent__isnull=False).count(),
        'pending_orders_count': Order.objects.filter(status=Order.Status.PENDING).count(),
    }

    recent_products = Product.objects.select_related('category', 'category__parent').order_by('-created_at')[:6]
    recent_orders = Order.objects.order_by('-created_at')[:6]

    return render(request, 'dashboard/overview.html', {
        'stats': stats,
        'recent_products': recent_products,
        'out_of_stock_products': out_of_stock[:6],
        'recent_orders': recent_orders,
    })


# ==========================================
# CATEGORÍAS
# ==========================================

@staff_required
def category_list(request):
    active_subs = Category.objects.order_by('order', 'name')
    sections = (
        Category.objects.filter(parent__isnull=True)
        .prefetch_related(Prefetch('subcategories', queryset=active_subs))
        .order_by('order', 'name')
    )
    return render(request, 'dashboard/category_list.html', {'sections': sections})


@staff_required
def category_create(request):
    if request.method == 'POST':
        form = CategoryForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            messages.success(request, 'Categoría creada correctamente.')
            return redirect('dashboard:category_list')
    else:
        initial = {}
        parent_id = request.GET.get('parent')
        if parent_id:
            initial['parent'] = parent_id
        form = CategoryForm(initial=initial)
    return render(request, 'dashboard/category_form.html', {
        'form': form, 'is_new': True, 'creating_section': not request.GET.get('parent'),
    })


@staff_required
def category_edit(request, pk):
    category = get_object_or_404(Category, pk=pk)
    if request.method == 'POST':
        form = CategoryForm(request.POST, request.FILES, instance=category)
        if form.is_valid():
            form.save()
            messages.success(request, 'Categoría actualizada.')
            return redirect('dashboard:category_list')
    else:
        form = CategoryForm(instance=category)
    return render(request, 'dashboard/category_form.html', {
        'form': form, 'category': category, 'is_new': False,
    })


@staff_required
def category_delete(request, pk):
    category = get_object_or_404(Category, pk=pk)
    if request.method == 'POST':
        name = str(category)
        try:
            category.delete()
            messages.success(request, f'"{name}" eliminada.')
        except ProtectedError:
            messages.error(
                request,
                f'No se puede eliminar "{name}" porque todavía tiene productos cargados. '
                f'Movelos a otra categoría o borralos primero.',
            )
        return redirect('dashboard:category_list')

    warning = (
        'Esto también borra sus subcategorías y — si tienen productos cargados — no va a dejar continuar.'
        if not category.parent_id else
        'Si esta categoría tiene productos cargados, no se va a poder borrar hasta moverlos.'
    )
    return render(request, 'dashboard/confirm_delete.html', {
        'title': f'¿Eliminar "{category}"?',
        'warning': warning,
        'cancel_url': 'dashboard:category_list',
    })


# ==========================================
# PRODUCTOS
# ==========================================

@staff_required
def product_list(request):
    query = request.GET.get('q', '').strip()

    products = Product.objects.select_related('category', 'category__parent').prefetch_related('images')
    if query:
        products = products.filter(Q(name__icontains=query) | Q(category__name__icontains=query))
    products = products.order_by('-created_at')

    page_obj = Paginator(products, 20).get_page(request.GET.get('page'))

    return render(request, 'dashboard/product_list.html', {'page_obj': page_obj, 'query': query})


def _collect_form_errors(form):
    return [f'{form.fields[field].label or field}: {e}' for field, errs in form.errors.items() for e in errs]


def _collect_formset_errors(formset, label):
    out = [f'{label}: {e}' for e in formset.non_form_errors()]
    for i, f in enumerate(formset.forms):
        for field, errs in f.errors.items():
            field_label = f.fields[field].label if field in f.fields else field
            for e in errs:
                out.append(f'{label} #{i + 1} — {field_label}: {e}')
    return out


def _product_form_json(product):
    """
    Todo lo que necesita product-colors.js para armar el editor agrupado
    por color: talles y colores maestros (para los selectores de "+
    agregar"), y — si el producto ya existe — sus variantes/fotos
    actuales, ya agrupables por color_id del lado del navegador.
    Se arma en Python (no iterando las forms del formset) porque es
    mucho más simple serializar los datos crudos que la maquinaria de
    Django forms.
    """
    sizes = [{'id': s.id, 'name': s.name} for s in Size.objects.all()]
    colors = [{'id': c.id, 'name': c.name, 'hex': c.hex_code or '#CCCCCC'} for c in Color.objects.all()]

    variants, images = [], []
    if product and product.pk:
        variants = [
            {
                'id': v.id, 'size_id': v.size_id, 'size_name': str(v.size),
                'color_id': v.color_id, 'stock': v.stock, 'sku': v.sku,
            }
            for v in product.variants.select_related('size', 'color').all()
        ]
        images = [
            {
                'id': img.id, 'color_id': img.color_id,
                'image_url': img.image.url if img.image else '',
                'alt_text': img.alt_text, 'order': img.order,
            }
            for img in product.images.all()
        ]

    return json.dumps({'sizes': sizes, 'colors': colors, 'variants': variants, 'images': images})


@staff_required
@transaction.atomic
def product_create(request):
    save_errors = []

    if request.method == 'POST':
        form = ProductForm(request.POST)
        product = form.instance
        image_formset = ProductImageFormSet(request.POST, request.FILES, instance=product, prefix='images')
        variant_formset = ProductVariantFormSet(request.POST, instance=product, prefix='variants')

        if form.is_valid() and image_formset.is_valid() and variant_formset.is_valid():
            form.save()
            image_formset.save()
            variant_formset.save()
            messages.success(request, 'Producto creado correctamente.')
            return redirect('dashboard:product_list')

        save_errors = (
            _collect_form_errors(form)
            + _collect_formset_errors(image_formset, 'Fotos')
            + _collect_formset_errors(variant_formset, 'Talles/color')
        )
    else:
        form = ProductForm()
        image_formset = ProductImageFormSet(prefix='images')
        variant_formset = ProductVariantFormSet(prefix='variants')

    return render(request, 'dashboard/product_form.html', {
        'form': form, 'image_formset': image_formset, 'variant_formset': variant_formset, 'is_new': True,
        'product_form_json': _product_form_json(None), 'save_errors': save_errors,
    })


@staff_required
@transaction.atomic
def product_edit(request, pk):
    product = get_object_or_404(Product, pk=pk)
    save_errors = []

    if request.method == 'POST':
        form = ProductForm(request.POST, instance=product)
        image_formset = ProductImageFormSet(request.POST, request.FILES, instance=product, prefix='images')
        variant_formset = ProductVariantFormSet(request.POST, instance=product, prefix='variants')

        if form.is_valid() and image_formset.is_valid() and variant_formset.is_valid():
            form.save()
            image_formset.save()
            variant_formset.save()
            messages.success(request, 'Producto actualizado.')
            return redirect('dashboard:product_list')

        save_errors = (
            _collect_form_errors(form)
            + _collect_formset_errors(image_formset, 'Fotos')
            + _collect_formset_errors(variant_formset, 'Talles/color')
        )
    else:
        form = ProductForm(instance=product)
        image_formset = ProductImageFormSet(instance=product, prefix='images')
        variant_formset = ProductVariantFormSet(instance=product, prefix='variants')

    return render(request, 'dashboard/product_form.html', {
        'form': form, 'image_formset': image_formset, 'variant_formset': variant_formset,
        'product': product, 'is_new': False,
        'product_form_json': _product_form_json(product), 'save_errors': save_errors,
    })


@staff_required
def product_delete(request, pk):
    product = get_object_or_404(Product, pk=pk)
    if request.method == 'POST':
        name = product.name
        product.delete()
        messages.success(request, f'"{name}" eliminado.')
        return redirect('dashboard:product_list')
    return render(request, 'dashboard/confirm_delete.html', {
        'title': f'¿Eliminar "{product.name}"?',
        'warning': 'Esta acción no se puede deshacer. Se borran también sus fotos y variantes de talle/color.',
        'cancel_url': 'dashboard:product_list',
    })


# ==========================================
# TALLES Y COLORES
# ==========================================

@staff_required
def attributes(request):
    size_form, color_form = SizeForm(prefix='size'), ColorForm(prefix='color')

    if request.method == 'POST':
        if request.POST.get('form_type') == 'size':
            size_form = SizeForm(request.POST, prefix='size')
            if size_form.is_valid():
                size_form.save()
                messages.success(request, 'Talle agregado.')
                return redirect('dashboard:attributes')
        elif request.POST.get('form_type') == 'color':
            color_form = ColorForm(request.POST, prefix='color')
            if color_form.is_valid():
                color_form.save()
                messages.success(request, 'Color agregado.')
                return redirect('dashboard:attributes')

    return render(request, 'dashboard/attributes.html', {
        'sizes': Size.objects.all(),
        'colors': Color.objects.all(),
        'size_form': size_form,
        'color_form': color_form,
    })


@staff_required
def size_delete(request, pk):
    size = get_object_or_404(Size, pk=pk)
    if request.method == 'POST':
        try:
            size.delete()
            messages.success(request, 'Talle eliminado.')
        except ProtectedError:
            messages.error(request, f'No se puede borrar "{size}": hay variantes de producto usándolo.')
    return redirect('dashboard:attributes')


@staff_required
def color_delete(request, pk):
    color = get_object_or_404(Color, pk=pk)
    if request.method == 'POST':
        try:
            color.delete()
            messages.success(request, 'Color eliminado.')
        except ProtectedError:
            messages.error(request, f'No se puede borrar "{color}": hay variantes de producto usándolo.')
    return redirect('dashboard:attributes')


@staff_required
def color_quick_create(request):
    """Crea (o reutiliza) un color al vuelo desde el editor de producto:
    ahí el color se define escribiendo nombre + hex directo, en vez de
    tener que ir antes a "Talles y colores" a cargarlo. Usado por
    product-colors.js vía fetch."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)

    name = request.POST.get('name', '').strip()
    hex_code = request.POST.get('hex_code', '').strip()

    if not name:
        return JsonResponse({'error': 'Falta el nombre del color'}, status=400)

    color = Color.objects.filter(name__iexact=name).first()
    if color:
        if hex_code and not color.hex_code:
            color.hex_code = hex_code
            color.save(update_fields=['hex_code'])
    else:
        form = ColorForm(data={'name': name, 'hex_code': hex_code})
        if not form.is_valid():
            errors = ' '.join(e for field in form.errors.values() for e in field)
            return JsonResponse({'error': errors or 'Color inválido'}, status=400)
        color = form.save()

    return JsonResponse({'id': color.id, 'name': color.name, 'hex': color.hex_code or '#CCCCCC'})


# ==========================================
# CONFIGURACIÓN DEL SITIO
# ==========================================

@staff_required
def site_config_edit(request):
    config = SiteConfig.load()
    if request.method == 'POST':
        form = SiteConfigForm(request.POST, instance=config)
        if form.is_valid():
            form.save()
            messages.success(request, 'Configuración actualizada.')
            return redirect('dashboard:site_config')
    else:
        form = SiteConfigForm(instance=config)
    return render(request, 'dashboard/site_config_form.html', {'form': form})


# ==========================================
# PEDIDOS
# ==========================================

@staff_required
def order_list(request):
    status = request.GET.get('status', '')

    orders = Order.objects.prefetch_related('items')
    if status:
        orders = orders.filter(status=status)
    orders = orders.order_by('-created_at')

    page_obj = Paginator(orders, 20).get_page(request.GET.get('page'))

    return render(request, 'dashboard/order_list.html', {
        'page_obj': page_obj,
        'status': status,
        'status_choices': Order.Status.choices,
        'pending_count': Order.objects.filter(status=Order.Status.PENDING).count(),
    })


@staff_required
def order_detail(request, pk):
    order = get_object_or_404(Order.objects.prefetch_related('items'), pk=pk)

    if request.method == 'POST':
        action = request.POST.get('action')
        status_actions = {
            'mark_paid': (Order.Status.PAID, f'Pedido #{order.pk} marcado como pagado.'),
            'mark_delivered': (Order.Status.DELIVERED, f'Pedido #{order.pk} marcado como entregado.'),
            'mark_pending': (Order.Status.PENDING, f'Pedido #{order.pk} vuelto a pendiente.'),
            'cancel': (Order.Status.CANCELLED, f'Pedido #{order.pk} cancelado.'),
        }
        if action in status_actions:
            new_status, success_message = status_actions[action]
            order.status = new_status
            order.save(update_fields=['status', 'updated_at'])
            # Pagado/Entregado restan stock de las variantes; Cancelado lo
            # devuelve; Pendiente no toca nada — todo centralizado acá para
            # que no importa qué camino tomó el estado, nunca se resta o
            # devuelve dos veces (ver orders/stock.py).
            sync_stock_for_status(order)
            messages.success(request, success_message)
        return redirect('dashboard:order_detail', pk=order.pk)

    return render(request, 'dashboard/order_detail.html', {'order': order})
