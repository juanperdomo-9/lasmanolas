// ===========================================
// LAS MANOLAS — checkout.js
// (1) Método de entrega: "Envío" (La Plata / Magdalena y alrededores,
// costo a coordinar) vs "Mensajería (Andreani)" (costo fijo). Al cambiar
// de método: se muestra/esconde la zona de envío (solo aplica a "Envío")
// y se recalcula en vivo el "Envío"/"Total" del resumen — el servidor
// vuelve a calcularlo de cero al confirmar, esto es solo para que el
// cliente vea el total correcto ANTES de mandar el formulario.
// (2) Estado visual "seleccionado" de las tarjetas/chips de radio
// (entrega, zona, pago): se marca a mano con JS togglando `.is-selected`
// en vez de depender de la variante `has-[:checked]` de Tailwind — esa
// variante matcheaba (confirmado con `.matches(':has(:checked)')`) pero
// el navegador nunca terminaba de repintar el fondo/borde ahí, así que
// se usa el mismo patrón ya probado que `.option-pill`/`.color-swatch`
// en el detalle de producto.
// ===========================================

document.addEventListener("DOMContentLoaded", () => {

    const form = document.querySelector("[data-checkout-form]");
    if (!form) return;

    highlightRadioGroup("delivery_method");
    highlightRadioGroup("delivery_zone");
    highlightRadioGroup("payment_method");

    initDeliveryPricing(form);

});

function highlightRadioGroup(name) {

    const inputs = [...document.querySelectorAll(`input[name="${name}"]`)];
    if (!inputs.length) return;

    function render() {

        inputs.forEach((input) => {

            const label = input.closest("label");
            if (label) label.classList.toggle("is-selected", input.checked);

        });

    }

    inputs.forEach((input) => input.addEventListener("change", render));
    render();

}

function initDeliveryPricing(form) {

    const pricingEl = form.querySelector("[data-checkout-pricing]");
    const pricing = pricingEl ? JSON.parse(pricingEl.textContent) : { subtotal: 0, courierCost: 0 };

    const methodInputs = [...form.querySelectorAll('input[name="delivery_method"]')];
    const zoneWrap = form.querySelector("[data-shipping-zone-wrap]");
    const courierNote = form.querySelector("[data-courier-note]");
    const shippingLine = form.querySelector("[data-shipping-line]");
    const totalLine = form.querySelector("[data-total-line]");

    if (!methodInputs.length) return;

    function money(n) {
        return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function render() {

        const selected = methodInputs.find((input) => input.checked);
        const isCourier = selected && selected.value === "courier";

        if (zoneWrap) zoneWrap.classList.toggle("hidden", isCourier);
        if (courierNote) courierNote.classList.toggle("hidden", !isCourier);

        const shippingCost = isCourier ? Number(pricing.courierCost) : 0;

        if (shippingLine) {
            shippingLine.textContent = isCourier ? money(shippingCost) : "A coordinar";
        }
        if (totalLine) {
            totalLine.textContent = money(Number(pricing.subtotal) + shippingCost);
        }

    }

    methodInputs.forEach((input) => input.addEventListener("change", render));

    render();

}
