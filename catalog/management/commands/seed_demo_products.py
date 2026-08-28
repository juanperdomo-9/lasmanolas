import random

from django.core.management.base import BaseCommand
from django.db import transaction

from catalog.models import Category, Color, Product, ProductVariant, Size

# Un producto por subcategoría, para poder ver el catálogo completo poblado
# (estantes del home, estantes de cada sección, destacados, etc.)
# Formato: (sección, subcategoría, nombre, precio, precio_anterior, destacado, talles, colores)
PRODUCTS = [
    # ---------- BEBÉS ----------
    ('Bebés', 'Ajuares', 'Ajuar 3 piezas algodón pima', 18000, None, True,
     ['RN', '0-3M'], ['Blanco', 'Celeste']),
    ('Bebés', 'Conjuntos', 'Conjunto remera + short verano', 12500, 15000, True,
     ['0-3M', '3-6M', '6-9M'], ['Amarillo', 'Blanco']),
    ('Bebés', 'Remeras', 'Remera manga corta estampada', 6500, None, False,
     ['3-6M', '6-9M', '9-12M'], ['Celeste', 'Rosa', 'Blanco']),
    ('Bebés', 'Buzos', 'Buzo frisa con capucha', 14500, 18000, False,
     ['6-9M', '9-12M', '12-18M'], ['Gris Melange', 'Lila']),
    ('Bebés', 'Joggins', 'Joggin algodón rústico', 11000, None, False,
     ['3-6M', '6-9M', '9-12M'], ['Beige', 'Gris Melange']),
    ('Bebés', 'Pijamas', 'Pijama algodón dos piezas', 13500, None, False,
     ['0-3M', '3-6M', '6-9M'], ['Celeste', 'Rosa']),
    ('Bebés', 'Camperas', 'Campera de abrigo impermeable', 32000, None, True,
     ['6-9M', '9-12M', '12-18M'], ['Celeste', 'Rosa']),
    ('Bebés', 'Baberos y Accesorios', 'Set de baberos estampados x3', 7000, None, False,
     [], []),

    # ---------- NIÑOS ----------
    ('Niños', 'Remeras', 'Remera niño manga corta', 7500, None, False,
     ['2', '4', '6', '8'], ['Blanco', 'Celeste', 'Verde Agua']),
    ('Niños', 'Buzos', 'Buzo canguro niño', 16500, 19500, True,
     ['4', '6', '8', '10'], ['Gris Melange', 'Negro']),
    ('Niños', 'Joggins', 'Joggin deportivo niño', 13000, None, False,
     ['2', '4', '6', '8'], ['Gris Melange', 'Negro']),
    ('Niños', 'Camperas', 'Campera rompeviento niño', 28000, None, False,
     ['6', '8', '10'], ['Celeste', 'Negro']),
    ('Niños', 'Conjuntos', 'Conjunto remera + jogging', 18500, None, False,
     ['4', '6', '8'], ['Verde Agua', 'Gris Melange']),
    ('Niños', 'Pijamas', 'Pijama polar niño', 15500, None, False,
     ['4', '6', '8', '10'], ['Celeste', 'Gris Melange']),
    ('Niños', 'Vestidos', 'Vestido niña estampado floral', 16000, 19000, True,
     ['2', '4', '6', '8'], ['Rosa', 'Lila', 'Blanco']),
    ('Niños', 'Pantalones', 'Pantalón cargo niño', 14000, None, False,
     ['4', '6', '8', '10'], ['Beige', 'Negro']),

    # ---------- ADOLESCENTES ----------
    ('Adolescentes', 'Remeras', 'Remera oversize algodón', 9500, None, False,
     ['S', 'M', 'L', 'XL'], ['Blanco', 'Negro', 'Gris Melange']),
    ('Adolescentes', 'Buzos', 'Buzo oversize frisa', 19500, 24000, True,
     ['S', 'M', 'L', 'XL'], ['Negro', 'Beige', 'Gris Melange']),
    ('Adolescentes', 'Joggins', 'Joggin cargo adolescente', 17500, None, False,
     ['S', 'M', 'L', 'XL'], ['Negro', 'Beige']),
    ('Adolescentes', 'Camperas', 'Campera de jean', 38000, None, False,
     ['S', 'M', 'L'], ['Celeste']),
    ('Adolescentes', 'Pantalones', 'Pantalón jean mom fit', 22000, None, False,
     ['S', 'M', 'L', 'XL'], ['Celeste']),
    ('Adolescentes', 'Conjuntos', 'Conjunto buzo + jogging oversize', 32000, 38000, True,
     ['S', 'M', 'L'], ['Negro', 'Gris Melange', 'Lila']),
]

DESCRIPTION_TEMPLATE = (
    'Prenda de {seccion_lower} de calidad premium, tela suave y cómoda para '
    'el uso diario. {extra}'
)


class Command(BaseCommand):
    help = 'Carga un producto de muestra por cada subcategoría del catálogo, con variantes y stock.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset', action='store_true',
            help='Borra los productos de muestra cargados por este comando antes de recrearlos.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options['reset']:
            deleted, _ = Product.objects.filter(name__in=[p[2] for p in PRODUCTS]).delete()
            self.stdout.write(self.style.WARNING(f'Borrados {deleted} productos de muestra previos.'))

        created_count = 0
        skipped_count = 0
        variant_count = 0

        for section_name, subcat_name, name, price, compare_at, featured, size_names, color_names in PRODUCTS:
            try:
                category = Category.objects.get(name=subcat_name, parent__name=section_name)
            except Category.DoesNotExist:
                self.stderr.write(self.style.ERROR(
                    f'No existe la subcategoría "{subcat_name}" en "{section_name}" — '
                    f'¿corriste "seed_catalog" antes?'
                ))
                continue

            if Product.objects.filter(name=name, category=category).exists():
                skipped_count += 1
                continue

            product = Product.objects.create(
                category=category,
                name=name,
                description=DESCRIPTION_TEMPLATE.format(
                    seccion_lower=section_name.lower(),
                    extra='Ideal para el día a día o para regalar.',
                ),
                price=price,
                compare_at_price=compare_at,
                is_active=True,
                is_featured=featured,
            )
            created_count += 1

            sizes = list(Size.objects.filter(name__in=size_names)) if size_names else [None]
            colors = list(Color.objects.filter(name__in=color_names)) if color_names else [None]

            # Si no hay talles (ej. accesorios), se crea una sola variante "talle único".
            if sizes == [None]:
                unique_size, _ = Size.objects.get_or_create(name='Único', defaults={'order': 99})
                sizes = [unique_size]

            for size in sizes:
                for color in colors:
                    ProductVariant.objects.create(
                        product=product,
                        size=size,
                        color=color,
                        stock=random.randint(4, 18),
                    )
                    variant_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'Listo: {created_count} productos creados, {skipped_count} ya existían, '
            f'{variant_count} variantes generadas.'
        ))
