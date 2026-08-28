from django.core.management.base import BaseCommand

from catalog.models import Category, Color, Size

SECTIONS = {
    'Bebés': [
        'Bodys', 'Ajuares', 'Conjuntos', 'Remeras', 'Buzos',
        'Joggins', 'Pijamas', 'Camperas', 'Baberos y Accesorios',
    ],
    'Niños': [
        'Remeras', 'Buzos', 'Joggins', 'Camperas',
        'Conjuntos', 'Pijamas', 'Vestidos', 'Pantalones',
    ],
    'Adolescentes': [
        'Remeras', 'Buzos', 'Joggins', 'Camperas', 'Pantalones', 'Conjuntos',
    ],
}

SIZES = [
    'RN', '0-3M', '3-6M', '6-9M', '9-12M', '12-18M', '18-24M',
    '2', '4', '6', '8', '10', '12', '14', '16',
    'S', 'M', 'L', 'XL',
]

COLORS = {
    'Blanco': '#FFFFFF',
    'Celeste': '#B8E3F0',
    'Rosa': '#F6D2DE',
    'Lila': '#D8C7EE',
    'Gris Melange': '#D8D6D9',
    'Beige': '#E9DFCF',
    'Amarillo': '#F7E4A1',
    'Verde Agua': '#BFE7DC',
    'Negro': '#222222',
    'Rayas': '',
}


class Command(BaseCommand):
    help = 'Carga las 3 secciones (Bebés/Niños/Adolescentes) con sus subcategorías por prenda, talles y colores base.'

    def handle(self, *args, **options):
        sections_created = 0
        subcats_created = 0

        for order, (section_name, subcats) in enumerate(SECTIONS.items()):
            section, created = Category.objects.get_or_create(
                name=section_name, parent=None, defaults={'order': order},
            )
            sections_created += created

            for sub_order, subcat_name in enumerate(subcats):
                _, created = Category.objects.get_or_create(
                    name=subcat_name, parent=section, defaults={'order': sub_order},
                )
                subcats_created += created

        sizes_created = 0
        for order, size_name in enumerate(SIZES):
            _, created = Size.objects.get_or_create(name=size_name, defaults={'order': order})
            sizes_created += created

        colors_created = 0
        for color_name, hex_code in COLORS.items():
            _, created = Color.objects.get_or_create(name=color_name, defaults={'hex_code': hex_code})
            colors_created += created

        self.stdout.write(self.style.SUCCESS(
            f'Listo: {sections_created} secciones, {subcats_created} subcategorías, '
            f'{sizes_created} talles y {colors_created} colores nuevos.'
        ))
