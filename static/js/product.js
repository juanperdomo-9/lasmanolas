// ===========================================
// LAS MANOLAS — product.js (detalle de producto)
// - Cantidad: botones − / + que respetan el stock del talle elegido.
// - Barra fija del celu: aparece cuando el botón de agregar se fue de
//   pantalla; copia su texto/estado y, sin talle elegido, te lleva a los
//   talles y los sacude.
// - Acordeón "Detalle y composición" que se abre/cierra deslizando.
// - window.lmFlyToCart(form): la foto vuela en arco hasta el carrito del
//   navbar, que salta al recibirla (lo usa cart.js antes de abrir el drawer).
// ===========================================

const PD_REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("DOMContentLoaded", () => {

    initQtyStepper();
    initBuyBar();
    initAccordions();

});


// ---------- Cantidad ----------

function initQtyStepper() {

    document.querySelectorAll(".pd-qty").forEach((wrap) => {

        const input = wrap.querySelector("[data-quantity-input]");
        if (!input) return;

        const minus = wrap.querySelector('[data-qty-step="-1"]');
        const plus = wrap.querySelector('[data-qty-step="1"]');

        const limits = () => ({
            min: parseInt(input.min, 10) || 1,
            max: parseInt(input.max, 10) || Infinity,
        });

        function sync() {
            const { min, max } = limits();
            let value = parseInt(input.value, 10);
            if (isNaN(value)) value = min;
            value = Math.min(Math.max(value, min), max);
            if (String(value) !== input.value) input.value = value;
            if (minus) minus.disabled = value <= min;
            if (plus) plus.disabled = value >= max;
        }

        function bump(dir) {
            if (PD_REDUCE || !input.animate) return;
            input.animate(
                [{ translate: `0 ${dir * -10}px`, opacity: 0.2 }, { translate: "0 0", opacity: 1 }],
                { duration: 260, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
            );
        }

        wrap.querySelectorAll("[data-qty-step]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const step = parseInt(btn.dataset.qtyStep, 10);
                const before = input.value;
                input.value = (parseInt(input.value, 10) || 1) + step;
                sync();
                if (input.value !== before) bump(step);
            });
        });

        input.addEventListener("change", sync);

        // variant-selector.js cambia el max al elegir talle: re-chequeamos.
        new MutationObserver(sync).observe(input, { attributes: true, attributeFilter: ["max"] });

        sync();

    });

}


// ---------- Barra fija del celu ----------

function initBuyBar() {

    const bar = document.querySelector("[data-buybar]");
    const form = document.querySelector("[data-add-to-cart-form]");
    const actions = document.querySelector("[data-pd-actions]");
    const submit = form && form.querySelector("[data-add-to-cart-submit]");
    const barBtn = bar && bar.querySelector("[data-buybar-btn]");

    if (!bar || !form || !actions || !submit || !barBtn) return;

    function mirror() {
        barBtn.textContent = submit.textContent.trim();
        barBtn.classList.toggle("is-added", submit.classList.contains("is-added"));
        barBtn.setAttribute("aria-disabled", String(submit.disabled));
        barBtn.style.opacity = submit.disabled && !submit.classList.contains("is-added") ? "0.6" : "";
    }

    new MutationObserver(mirror).observe(submit, {
        childList: true, characterData: true, subtree: true,
        attributes: true, attributeFilter: ["disabled", "class"],
    });
    mirror();

    let shown = null;

    function setVisible(show) {
        if (show === shown) return;
        shown = show;
        bar.classList.toggle("is-visible", show);
        bar.setAttribute("aria-hidden", String(!show));
        barBtn.tabIndex = show ? 0 : -1;
        document.body.classList.toggle("has-buybar", show);
    }

    // Visible solo cuando el botón de agregar quedó ARRIBA de la pantalla
    // (ya lo pasaste). Se chequea en cada scroll y no con
    // IntersectionObserver: un salto de scroll (recargar a mitad de página,
    // un link con #) pasa de "abajo" a "arriba" sin cruzar la pantalla, y
    // el observer no se entera.
    let ticking = false;
    function check() {
        ticking = false;
        setVisible(actions.getBoundingClientRect().bottom < 0);
    }

    window.addEventListener("scroll", () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(check);
    }, { passive: true });

    window.addEventListener("resize", check);
    check();

    barBtn.addEventListener("click", () => {

        if (!submit.disabled) {
            form.requestSubmit(submit);
            return;
        }

        const sizes = document.querySelector("[data-size-block]");
        if (!sizes) return;

        sizes.scrollIntoView({ behavior: PD_REDUCE ? "auto" : "smooth", block: "center" });
        sizes.classList.remove("pd-shake");
        void sizes.offsetWidth;
        sizes.classList.add("pd-shake");
        sizes.addEventListener("animationend", () => sizes.classList.remove("pd-shake"), { once: true });

    });

}


// ---------- Acordeón ----------

function initAccordions() {

    document.querySelectorAll("[data-accordion]").forEach((details) => {

        const summary = details.querySelector("summary");
        const body = details.querySelector("[data-accordion-body]");
        if (!summary || !body || PD_REDUCE || !body.animate) return;

        let anim = null;

        summary.addEventListener("click", (e) => {

            e.preventDefault();

            const from = body.offsetHeight;
            const opening = !details.open || details.classList.contains("is-closing");

            if (anim) anim.cancel();

            if (opening) {
                details.classList.remove("is-closing");
                details.open = true;
            } else {
                details.classList.add("is-closing");
            }

            const to = opening ? body.scrollHeight : 0;
            const easing = "cubic-bezier(0.23, 1, 0.32, 1)";

            anim = body.animate(
                [{ height: `${from}px`, opacity: opening ? 0.4 : 1 }, { height: `${to}px`, opacity: opening ? 1 : 0 }],
                { duration: opening ? 420 : 300, easing },
            );

            anim.onfinish = () => {
                anim = null;
                if (!opening) {
                    details.open = false;
                    details.classList.remove("is-closing");
                }
            };

        });

    });

}


// ---------- Vuelo al carrito ----------

window.lmFlyToCart = function (form) {

    const img = document.querySelector("[data-gallery-main]");

    const carts = [...document.querySelectorAll("[data-cart-open]")];
    const cart = carts.find((el) => el.getClientRects().length && el.offsetParent !== null);

    if (PD_REDUCE || !img || !cart || !img.animate) return Promise.resolve();

    // Si el navbar estaba escondido (bajando), lo traemos de vuelta: el
    // carrito tiene que estar a la vista para recibir la prenda.
    const nav = cart.closest(".navbar");
    let navOffset = 0;
    if (nav && nav.classList.contains("navbar--hidden")) {
        navOffset = nav.getBoundingClientRect().height;
        nav.classList.remove("navbar--hidden");
    }

    const from = img.getBoundingClientRect();
    const to = cart.getBoundingClientRect();

    // Si la foto ya no está a la vista, sale desde el botón de agregar.
    const submit = form && form.querySelector("[data-add-to-cart-submit]");
    const visible = from.bottom > 0 && from.top < window.innerHeight;
    const origin = visible ? from : (submit || img).getBoundingClientRect();

    const size = Math.min(origin.width, origin.height, 220);
    const startX = origin.left + origin.width / 2 - size / 2;
    const startY = origin.top + origin.height / 2 - size / 2;
    const endX = to.left + to.width / 2 - size / 2;
    const endY = to.top + navOffset + to.height / 2 - size / 2;

    const ghost = document.createElement("img");
    ghost.src = img.currentSrc || img.src;
    ghost.alt = "";
    ghost.setAttribute("aria-hidden", "true");
    Object.assign(ghost.style, {
        position: "fixed",
        left: `${startX}px`,
        top: `${startY}px`,
        width: `${size}px`,
        height: `${size}px`,
        objectFit: "cover",
        borderRadius: "24px",
        zIndex: "80",
        pointerEvents: "none",
        boxShadow: "0 20px 40px -12px rgba(36, 31, 46, 0.45)",
    });
    document.body.appendChild(ghost);

    const dx = endX - startX;
    const dy = endY - startY;
    const lift = Math.min(160, Math.abs(dy) * 0.35 + 60); // altura del arco

    const flight = ghost.animate(
        [
            { transform: "translate(0, 0) scale(1) rotate(0deg)", borderRadius: "24px", opacity: 1 },
            { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - lift}px) scale(0.55) rotate(-8deg)`, borderRadius: "40%", opacity: 1, offset: 0.45 },
            { transform: `translate(${dx}px, ${dy}px) scale(0.12) rotate(8deg)`, borderRadius: "50%", opacity: 0.6 },
        ],
        { duration: 780, easing: "cubic-bezier(0.55, 0, 0.45, 1)", fill: "forwards" },
    );

    return flight.finished.catch(() => {}).then(() => {

        ghost.remove();
        cart.classList.remove("pd-cart-bump");
        void cart.offsetWidth;
        cart.classList.add("pd-cart-bump");
        cart.addEventListener("animationend", () => cart.classList.remove("pd-cart-bump"), { once: true });

        return new Promise((resolve) => setTimeout(resolve, 260));

    });

};
