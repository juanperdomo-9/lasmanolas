// ===========================================
// LAS MANOLAS — counters.js
// Números que "suman" cuando entran en pantalla (franja de confianza
// tipo "+500 familias / +60 talles / envíos a todo el país").
// Uso: <span data-counter data-to="500" data-suffix="+"></span>
// ===========================================

document.addEventListener("DOMContentLoaded", initCounters);

function initCounters() {

    const counters = document.querySelectorAll("[data-counter]");

    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {

        entries.forEach((entry) => {

            if (!entry.isIntersecting) return;

            runCounter(entry.target);
            observer.unobserve(entry.target);

        });

    }, { threshold: 0.5 });

    counters.forEach((el) => observer.observe(el));

}

function runCounter(el) {

    const to = parseFloat(el.dataset.to || "0");
    const suffix = el.dataset.suffix || "";
    const duration = parseInt(el.dataset.duration || "1600", 10);
    const start = performance.now();

    function tick(now) {

        const progress = Math.min((now - start) / duration, 1);

        // easeOutExpo — arranca rápido y frena suave, se siente "premium"
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const value = Math.round(to * eased);

        el.textContent = value.toLocaleString("es-AR") + suffix;

        if (progress < 1) requestAnimationFrame(tick);

    }

    requestAnimationFrame(tick);

}
