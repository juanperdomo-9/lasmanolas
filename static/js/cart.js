// ===========================================
// LAS MANOLAS — cart.js
// Agregar al carrito sin recargar la página (abre el drawer con el
// item ya adentro) + quitar ítems desde el drawer, también por AJAX.
// La página completa del carrito (/carrito/) usa forms normales: ahí
// la prioridad es que nunca falle, no la fluidez.
// ===========================================

document.addEventListener("DOMContentLoaded", () => {

    initAddToCartForms();
    initCartMutateForms();
    initQtyForms();

});


async function submitCartForm(form) {

    const response = await fetch(form.action, {

        method: "POST",
        body: new FormData(form),
        headers: { "X-Requested-With": "XMLHttpRequest" },

    });

    return response.json();

}

function applyCartResponse(data) {

    if (!data.success) return;

    document.querySelectorAll(".cart-count").forEach((el) => {

        el.textContent = data.count;

    });

    const total = document.getElementById("cartTotal");
    if (total) total.textContent = "$" + data.total;

    const itemsEl = document.getElementById("cartItems");

    if (itemsEl && data.items_html !== undefined) {

        itemsEl.innerHTML = data.items_html;
        initCartMutateForms();

    }

    const viewCartBtn = document.getElementById("cartViewLink");

    if (viewCartBtn) {

        viewCartBtn.classList.toggle("opacity-60", data.count === 0);
        viewCartBtn.classList.toggle("pointer-events-none", data.count === 0);

    }

}

function openCartDrawer() {

    const overlay = document.getElementById("cartOverlay");
    const panel = document.getElementById("cartPanel");

    if (!overlay || !panel) return;

    overlay.classList.remove("hidden", "opacity-0");
    panel.classList.remove("translate-x-full");
    document.body.classList.add("overflow-hidden");

}


// ===========================================
// FORM: agregar al carrito (product_detail.html)
// ===========================================

function initAddToCartForms() {

    document.querySelectorAll("[data-add-to-cart-form]").forEach((form) => {

        form.addEventListener("submit", async (e) => {

            e.preventDefault();

            const btn = form.querySelector("[data-add-to-cart-submit]");
            const originalText = btn ? btn.textContent : "";

            if (btn) {
                btn.disabled = true;
                btn.textContent = "Agregando...";
            }

            try {

                const data = await submitCartForm(form);

                if (!data.success) {
                    alert(data.error || "No se pudo agregar al carrito.");
                    return;
                }

                applyCartResponse(data);
                openCartDrawer();

            } catch (error) {

                console.error("Error al agregar al carrito:", error);

            } finally {

                if (btn) {
                    btn.disabled = false;
                    btn.textContent = originalText;
                }

            }

        });

    });

}


// ===========================================
// STEPPER +/- de cantidad (página completa /carrito/)
// Los botones − / + cambian el <input type="number"> y mandan el form
// normal (sin fetch, sin preventDefault) — recarga la página como
// cualquier submit, a propósito: esta página prioriza que nunca falle
// por sobre la fluidez (ver comentario arriba del todo del archivo).
// ===========================================

function initQtyForms() {

    document.querySelectorAll("[data-qty-form]").forEach((form) => {

        const input = form.querySelector("[data-qty-input]");
        if (!input) return;

        const min = parseInt(input.min, 10) || 1;
        const max = parseInt(input.max, 10) || Infinity;

        function clamp(value) {
            return Math.min(Math.max(value, min), max);
        }

        form.querySelectorAll("[data-qty-step]").forEach((btn) => {

            btn.addEventListener("click", () => {

                const step = parseInt(btn.dataset.qtyStep, 10);
                const current = parseInt(input.value, 10) || min;
                const next = clamp(current + step);

                if (next === current) return;

                input.value = next;
                form.requestSubmit();

            });

        });

        input.addEventListener("change", () => {

            const parsed = parseInt(input.value, 10);
            input.value = clamp(isNaN(parsed) ? min : parsed);
            form.requestSubmit();

        });

    });

}


// ===========================================
// FORMS: quitar ítem desde el drawer
// ===========================================

function initCartMutateForms() {

    document.querySelectorAll("[data-cart-mutate-form]").forEach((form) => {

        if (form.dataset.bound) return;
        form.dataset.bound = "true";

        form.addEventListener("submit", async (e) => {

            e.preventDefault();

            try {

                const data = await submitCartForm(form);
                applyCartResponse(data);

            } catch (error) {

                console.error("Error al actualizar el carrito:", error);

            }

        });

    });

}
