// ===========================================
// LAS MANOLAS — variant-selector.js
// Pills de talle/color en el detalle de producto: resuelven qué
// ProductVariant (id + stock) corresponde a la combinación elegida, y
// si hay colores, el talle se filtra para mostrar SOLO los que existen
// en el color elegido (no todos los talles del producto).
// ===========================================

document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll("[data-variant-selector]").forEach(initSelector);

});

function initSelector(root) {

    const dataEl = root.querySelector("[data-variants-json]");
    if (!dataEl) return;

    const variants = JSON.parse(dataEl.textContent);

    const sizeButtons = [...root.querySelectorAll("[data-size-option]")];
    const colorButtons = [...root.querySelectorAll("[data-color-option]")];
    const variantInput = root.querySelector("[data-variant-input]");
    const stockMsg = root.querySelector("[data-stock-message]");
    const submitBtn = root.querySelector("[data-add-to-cart-submit]");
    const qtyInput = root.querySelector("[data-quantity-input]");

    let selectedColor = colorButtons[0] ? colorButtons[0].dataset.colorOption : null;

    function sizeIdsForColor(colorId) {

        if (!colorButtons.length) return null; // sin colores: todos los talles valen

        return new Set(
            variants
                .filter((v) => String(v.color_id) === String(colorId))
                .map((v) => String(v.size_id)),
        );

    }

    let validSizeIds = sizeIdsForColor(selectedColor);
    let selectedSize = pickFirstValidSize();

    function pickFirstValidSize() {

        const firstValid = sizeButtons.find((btn) => !validSizeIds || validSizeIds.has(btn.dataset.sizeOption));
        return firstValid ? firstValid.dataset.sizeOption : null;

    }

    function resolveVariant() {

        return variants.find((v) => {

            const sizeMatches = String(v.size_id) === String(selectedSize);
            const colorMatches = colorButtons.length === 0 || String(v.color_id) === String(selectedColor);

            return sizeMatches && colorMatches;

        });

    }

    function render() {

        // Talles que no vienen en el color elegido: se esconden del todo
        // (no solo deshabilitados) — así el usuario ve directamente "sus"
        // talles, sin ruido de combinaciones que no existen.
        sizeButtons.forEach((btn) => {

            const isValid = !validSizeIds || validSizeIds.has(btn.dataset.sizeOption);
            btn.classList.toggle("hidden", !isValid);
            btn.classList.toggle("is-selected", isValid && btn.dataset.sizeOption === String(selectedSize));

        });

        colorButtons.forEach((btn) => {

            btn.classList.toggle("is-selected", btn.dataset.colorOption === String(selectedColor));

        });

        if (colorButtons.length && window.filterGalleryByColor) {

            window.filterGalleryByColor(selectedColor);

        }

        const match = resolveVariant();

        if (match) {

            variantInput.value = match.id;

            const inStock = match.stock > 0;

            if (submitBtn) {

                submitBtn.disabled = !inStock;
                submitBtn.textContent = inStock ? "Agregar al carrito" : "Sin stock en esta combinación";

            }

            if (qtyInput) qtyInput.max = match.stock;
            if (stockMsg) stockMsg.textContent = inStock ? `${match.stock} disponibles` : "Sin stock";

        } else {

            variantInput.value = "";

            if (submitBtn) {

                submitBtn.disabled = true;
                submitBtn.textContent = colorButtons.length ? "Elegí talle y color" : "Elegí un talle";

            }

            if (stockMsg) stockMsg.textContent = "";

        }

    }

    sizeButtons.forEach((btn) => {

        btn.addEventListener("click", () => {

            selectedSize = btn.dataset.sizeOption;
            render();

        });

    });

    colorButtons.forEach((btn) => {

        btn.addEventListener("click", () => {

            selectedColor = btn.dataset.colorOption;
            validSizeIds = sizeIdsForColor(selectedColor);

            // Si el talle que tenía elegido no existe en el color nuevo,
            // salta automáticamente al primero que sí exista.
            if (!validSizeIds || !validSizeIds.has(String(selectedSize))) {
                selectedSize = pickFirstValidSize();
            }

            render();

        });

    });

    render();

}
