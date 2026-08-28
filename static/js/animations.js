// ===========================================
// LAS MANOLAS — animations.js
// Reveal on scroll + stagger de cards + lift en botones.
// ===========================================

document.addEventListener("DOMContentLoaded", () => {

    // Orden importa: animateCards() es quien AGREGA la clase .reveal a
    // las cards dentro de [data-stagger]. Si revealElements() corriera
    // antes, arma su lista de "targets" a observar sin esas cards adentro
    // (todavía no tenían la clase) y quedan con opacity:0 para siempre —
    // ni el IntersectionObserver ni el timeout de seguridad las alcanzan.
    animateCards();
    revealElements();
    buttonHover();

});


// ===========================================
// REVEAL ON SCROLL
// ===========================================

function revealElements() {

    const targets = document.querySelectorAll(".reveal, .reveal-scale");

    // threshold bajo: en mobile, secciones muy altas (grillas en una
    // sola columna) nunca llegan a cubrir un % grande del viewport,
    // así que con threshold alto se quedarían invisibles para siempre.
    const observer = new IntersectionObserver((entries) => {

        entries.forEach((entry) => {

            if (entry.isIntersecting) {

                entry.target.classList.add("revealed");
                observer.unobserve(entry.target);

            }

        });

    }, { threshold: 0.05, rootMargin: "0px 0px -40px 0px" });

    targets.forEach((el) => observer.observe(el));

    // Red de seguridad: si el observer no llega a disparar (bug de
    // navegador, elemento fuera de flujo), no queda invisible para siempre.
    setTimeout(() => {

        targets.forEach((el) => el.classList.add("revealed"));

    }, 2500);

}


// ===========================================
// STAGGER DE CARDS (catálogo, categorías, etc.)
// ===========================================

function animateCards() {

    document.querySelectorAll("[data-stagger]").forEach((group) => {

        Array.from(group.children).forEach((card, index) => {

            card.classList.add("reveal");
            card.style.transitionDelay = `${index * 70}ms`;

        });

    });

}


// ===========================================
// LIFT EN BOTONES
// ===========================================

function buttonHover() {

    document.querySelectorAll(".btn-lift").forEach((btn) => {

        btn.addEventListener("mouseenter", () => {

            btn.style.transform = "translateY(-3px)";

        });

        btn.addEventListener("mouseleave", () => {

            btn.style.transform = "";

        });

    });

}
