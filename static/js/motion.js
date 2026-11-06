// ===========================================
// LAS MANOLAS — motion.js (sistema de movimiento compartido, todas las páginas)
// [data-split]: parte el título en palabras que suben de a una.
// [data-anim] / [data-split]: reciben .is-in (una sola vez) al aparecer en
// pantalla; el CSS (motion.css) hace el resto.
// Corre antes que los scripts de cada página (está antes en base.html).
// ===========================================

document.addEventListener("DOMContentLoaded", () => {

    initSplitWords();
    initScrollAnims();

});


// Títulos [data-split]: cada palabra en su "ventanita" para subir de a una.
function initSplitWords() {

    document.querySelectorAll("[data-split]").forEach((el) => {

        const words = el.textContent.trim().split(/\s+/);
        el.replaceChildren(...words.flatMap((word, i) => {
            const mask = document.createElement("span");
            const inner = document.createElement("span");
            mask.className = "lm-wm";
            inner.className = "lm-wi";
            inner.style.setProperty("--w", i);
            inner.textContent = word;
            mask.appendChild(inner);
            return i < words.length - 1 ? [mask, document.createTextNode(" ")] : [mask];
        }));

    });

}


// [data-anim] y [data-split]: entran (una sola vez) al aparecer en pantalla.
function initScrollAnims() {

    const targets = document.querySelectorAll("[data-anim], [data-split]");

    if (!("IntersectionObserver" in window)) {
        targets.forEach((el) => el.classList.add("is-in"));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });

    // El "telón" arranca recortado a ancho cero y el navegador nunca lo da
    // por visible (ni a él ni a lo que tiene adentro): se mira su posición a
    // mano al scrollear, y cuando se abre arrancan también sus textos.
    const wipes = [...targets].filter((el) => el.dataset.anim === "wipe");
    const insideWipe = (el) => wipes.some((w) => w !== el && w.contains(el));
    targets.forEach((el) => { if (!wipes.includes(el) && !insideWipe(el)) observer.observe(el); });

    if (wipes.length) {
        const check = () => {
            wipes.forEach((el) => {
                if (el.classList.contains("is-in")) return;
                const r = el.getBoundingClientRect();
                if (r.top < window.innerHeight * 0.85 && r.bottom > 0) {
                    el.classList.add("is-in");
                    el.querySelectorAll("[data-anim], [data-split]").forEach((child) => child.classList.add("is-in"));
                }
            });
            if (wipes.every((el) => el.classList.contains("is-in"))) window.removeEventListener("scroll", check);
        };
        window.addEventListener("scroll", check, { passive: true });
        check();
    }

}
