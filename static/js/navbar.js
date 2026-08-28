// ===========================================
// LAS MANOLAS — navbar.js
// Navbar glass que se oculta al bajar / reaparece al subir, menú
// mobile y drawer de carrito (abrir/cerrar + overlay).
// ===========================================

document.addEventListener("DOMContentLoaded", () => {

    initNavbarScroll();
    initMobileMenu();
    initCartDrawer();

});


// ===========================================
// NAVBAR: glass al scrollear + hide on scroll-down
// ===========================================

function initNavbarScroll() {

    const nav = document.getElementById("siteNavbar");

    if (!nav) return;

    let lastY = window.scrollY;
    let ticking = false;

    window.addEventListener("scroll", () => {

        if (ticking) return;
        ticking = true;

        requestAnimationFrame(() => {

            const y = window.scrollY;

            nav.classList.toggle("navbar--scrolled", y > 24);

            // Solo ocultamos pasado el hero, y solo bajando.
            const goingDown = y > lastY && y > 160;
            nav.classList.toggle("navbar--hidden", goingDown);

            lastY = y;
            ticking = false;

        });

    }, { passive: true });

}


// ===========================================
// MENÚ MOBILE
// ===========================================

function initMobileMenu() {

    const toggle = document.getElementById("mobileMenuToggle");
    const panel = document.getElementById("mobileMenuPanel");

    if (!toggle || !panel) return;

    toggle.addEventListener("click", () => {

        const isOpen = panel.classList.toggle("flex");
        panel.classList.toggle("hidden");

        toggle.setAttribute("aria-expanded", panel.classList.contains("flex") ? "true" : "false");
        document.body.classList.toggle("overflow-hidden", panel.classList.contains("flex"));

    });

}


// ===========================================
// DRAWER DE CARRITO
// ===========================================

function initCartDrawer() {

    const openers = document.querySelectorAll("[data-cart-open]");
    const closers = document.querySelectorAll("[data-cart-close]");
    const overlay = document.getElementById("cartOverlay");
    const panel = document.getElementById("cartPanel");

    if (!overlay || !panel) return;

    function open(e) {

        // Los openers son <a href="/carrito/"> para que funcionen sin JS
        // (progressive enhancement); con JS interceptamos y abrimos el drawer.
        if (e) e.preventDefault();

        overlay.classList.remove("hidden", "opacity-0");
        panel.classList.remove("translate-x-full");
        document.body.classList.add("overflow-hidden");

    }

    function close() {

        overlay.classList.add("opacity-0");
        panel.classList.add("translate-x-full");
        document.body.classList.remove("overflow-hidden");

        setTimeout(() => overlay.classList.add("hidden"), 400);

    }

    openers.forEach((btn) => btn.addEventListener("click", open));
    closers.forEach((btn) => btn.addEventListener("click", close));

    overlay.addEventListener("click", (e) => {

        if (e.target === overlay) close();

    });

    document.addEventListener("keydown", (e) => {

        if (e.key === "Escape") close();

    });

}
