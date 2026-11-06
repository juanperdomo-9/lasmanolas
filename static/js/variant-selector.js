// ===========================================
// LAS MANOLAS — variant-selector.js
// Pills de talle/color en el detalle de producto: resuelven qué
// ProductVariant (id + stock) corresponde a la combinación elegida, y
// si hay colores, el talle se filtra para mostrar SOLO los que existen
// en el color elegido (no todos los talles del producto).
// ===========================================

const VS_REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll("[data-variant-selector]").forEach(initSelector);

});

// Saltito (resorte) al elegir una pill o al aparecer un talle nuevo.
function popIn(el, delay = 0, from = 0.6) {

    if (VS_REDUCE || !el.animate) return;

    el.animate(
        [{ scale: from, opacity: from < 0.8 ? 0 : 1 }, { scale: 1, opacity: 1 }],
        { duration: 480, delay, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)", fill: "backwards" },
    );

}

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

    let firstRender = true;
    let lastStockText = null;

    function render(changed) {

        // Talles que no vienen en el color elegido: se esconden del todo
        // (no solo deshabilitados) — así el usuario ve directamente "sus"
        // talles, sin ruido de combinaciones que no existen.
        sizeButtons.forEach((btn) => {

            const isValid = !validSizeIds || validSizeIds.has(btn.dataset.sizeOption);
            const wasHidden = btn.classList.contains("hidden");
            btn.classList.toggle("hidden", !isValid);

            // Al cambiar de color, los talles que aparecen entran de a uno
            if (!firstRender && isValid && (wasHidden || changed === "color")) {
                popIn(btn, sizeButtons.filter((b) => !b.classList.contains("hidden")).indexOf(btn) * 45);
            }
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
            setStock(inStock ? `${match.stock} disponibles` : "Sin stock");

        } else {

            variantInput.value = "";

            if (submitBtn) {

                submitBtn.disabled = true;
                submitBtn.textContent = colorButtons.length ? "Elegí talle y color" : "Elegí un talle";

            }

            setStock("");

        }

        firstRender = false;

    }

    // El texto de stock entra subiendo cuando cambia
    function setStock(text) {

        if (!stockMsg || text === lastStockText) return;
        lastStockText = text;
        stockMsg.textContent = text;

        if (!firstRender && text && !VS_REDUCE && stockMsg.animate) {
            stockMsg.animate(
                [{ translate: "0 6px", opacity: 0 }, { translate: "0 0", opacity: 1 }],
                { duration: 320, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
            );
        }

    }

    sizeButtons.forEach((btn) => {

        btn.addEventListener("click", () => {

            selectedSize = btn.dataset.sizeOption;
            render("size");
            popIn(btn, 0, 0.82);

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

            render("color");
            popIn(btn, 0, 0.75);

        });

    });

    render();

}
