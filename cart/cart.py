from catalog.models import ProductVariant

CART_SESSION_KEY = 'cart'


class Cart:
    """
    Carrito por sesión (checkout como invitado, sin cuentas de usuario).
    Guarda solo {variant_id: {"quantity": n}} en la sesión; el resto
    (precio, nombre, imagen) siempre se resuelve en vivo contra la base
    para que nunca quede desactualizado si el producto cambia de precio.
    """

    def __init__(self, request):
        self.session = request.session
        cart = self.session.get(CART_SESSION_KEY)
        if cart is None:
            cart = self.session[CART_SESSION_KEY] = {}
        self.cart = cart

    def add(self, variant, quantity=1):
        key = str(variant.id)
        current = self.cart.get(key, {}).get('quantity', 0)
        new_quantity = min(current + quantity, variant.stock)
        self.cart[key] = {'quantity': new_quantity}
        self.save()

    def update(self, variant_id, quantity):
        key = str(variant_id)
        if key not in self.cart:
            return
        if quantity > 0:
            self.cart[key]['quantity'] = quantity
        else:
            del self.cart[key]
        self.save()

    def remove(self, variant_id):
        key = str(variant_id)
        if key in self.cart:
            del self.cart[key]
            self.save()

    def clear(self):
        self.session[CART_SESSION_KEY] = {}
        self.save()

    def save(self):
        self.session.modified = True

    def __iter__(self):
        variants = (
            ProductVariant.objects
            .filter(id__in=self.cart.keys())
            .select_related('product', 'size', 'color')
            .prefetch_related('product__images')
        )
        variants_map = {str(v.id): v for v in variants}

        for key, item in self.cart.items():
            variant = variants_map.get(key)
            if not variant:
                continue
            quantity = item['quantity']
            yield {
                'variant': variant,
                'quantity': quantity,
                'subtotal': variant.product.price * quantity,
            }

    def __len__(self):
        return sum(item['quantity'] for item in self.cart.values())

    def get_total(self):
        return sum((item['subtotal'] for item in self), 0)
