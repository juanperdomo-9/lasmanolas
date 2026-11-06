// ===========================================
// LAS MANOLAS — gallery.js (galería del detalle de producto)
// - Miniaturas: la foto nueva entra deslizándose desde el lado que
//   corresponde (siguiente → desde la derecha) con un fundido, recién
//   cuando ya cargó (sin parpadeo en blanco).
// - Celu: se pasa de foto deslizando el dedo sobre la foto grande.
// - Compu: zoom que sigue al mouse.
// - Color: variant-selector.js llama a window.filterGalleryByColor, que
//   muestra las fotos de ESE color (más las generales) y salta a la primera.
// Con "reducir movimiento": cambio de foto con un fundido simple, sin zoom.
// ===========================================

const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll("[data-gallery]").forEach(initGallery);

});

function visibleThumbs(root) {
    return [...root.querySelectorAll("[data-gallery-thumb]")].filter((t) => !t.classList.contains("hidden"));
}

function initGallery(root) {

    const frame = root.querySelector("[data-gallery-frame]");
    const main = root.querySelector("[data-gallery-main]");
    const thumbs = root.querySelectorAll("[data-gallery-thumb]");

    if (!main) return;

    thumbs.forEach((thumb) => {
        thumb.addEventListener("click", () => selectThumb(root, thumb));
    });

    if (frame && thumbs.length > 1) initSwipe(root, frame, main);
    if (frame && !REDUCE_MOTION) initZoom(frame, main);

}

function selectThumb(root, thumb, direction) {

    const main = root.querySelector("[data-gallery-main]");
    const frame = root.querySelector("[data-gallery-frame]");
    const all = [...root.querySelectorAll("[data-gallery-thumb]")];
    const current = all.find((t) => t.classList.contains("is-selected"));

    all.forEach((t) => t.classList.toggle("is-selected", t === thumb));

    const src = thumb.dataset.full;
    if (!src || !main || src === main.getAttribute("src")) return;

    const dir = direction ?? (all.indexOf(thumb) >= all.indexOf(current) ? 1 : -1);
    swapImage(frame, main, src, dir);

}

function swapImage(frame, main, src, dir) {

    if (REDUCE_MOTION || !frame || !main.animate) {
        main.src = src;
        return;
    }

    const next = new Image();
    next.src = src;
    next.alt = "";
    next.className = "pd-main-next";

    const ready = next.decode ? next.decode().catch(() => {}) : Promise.resolve();

    ready.then(() => {
        frame.querySelectorAll(".pd-main-next").forEach((el) => el.remove());
        frame.appendChild(next);

        const easing = "cubic-bezier(0.23, 1, 0.32, 1)";
        next.animate(
            [
                { opacity: 0, transform: `translateX(${dir * 12}%) scale(1.04)`, filter: "blur(4px)" },
                { opacity: 1, transform: "none", filter: "blur(0)" },
            ],
            { duration: 520, easing },
        ).finished.then(() => {
            main.src = src;
            next.remove();
        });

        main.animate(
            [{ transform: "none", opacity: 1 }, { transform: `translateX(${dir * -8}%)`, opacity: 0.4 }],
            { duration: 520, easing },
        );
    });

}

// Deslizar con el dedo: la foto sigue al dedo y al soltar pasa a la
// siguiente/anterior si el gesto fue suficiente (por distancia o velocidad).
function initSwipe(root, frame, main) {

    let start = null;

    frame.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse") return;
        start = { x: e.clientX, y: e.clientY, t: performance.now(), dx: 0, locked: null };
    });

    frame.addEventListener("pointermove", (e) => {
        if (!start) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (start.locked === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
            start.locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        }
        if (start.locked !== "x") return;
        start.dx = dx;
        main.style.transition = "none";
        main.style.transform = `translateX(${dx * 0.6}px)`;
    });

    const end = () => {
        if (!start) return;
        const { dx, t, locked } = start;
        start = null;
        main.style.transition = "";
        main.style.transform = "";
        if (locked !== "x") return;

        const speed = Math.abs(dx) / Math.max(performance.now() - t, 1);
        if (Math.abs(dx) < 50 && speed < 0.4) return;

        const thumbs = visibleThumbs(root);
        const index = thumbs.findIndex((th) => th.classList.contains("is-selected"));
        const step = dx < 0 ? 1 : -1;
        const target = thumbs[(index + step + thumbs.length) % thumbs.length];
        if (target) selectThumb(root, target, step);
    };

    frame.addEventListener("pointerup", end);
    frame.addEventListener("pointercancel", end);

}

// Zoom que sigue al mouse (solo mouse, nunca en touch).
function initZoom(frame, main) {

    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    frame.classList.add("is-zoomable");

    frame.addEventListener("pointerenter", (e) => {
        if (e.pointerType === "mouse") frame.classList.add("is-zoomed");
    });

    frame.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        const r = frame.getBoundingClientRect();
        main.style.setProperty("--zx", `${((e.clientX - r.left) / r.width) * 100}%`);
        main.style.setProperty("--zy", `${((e.clientY - r.top) / r.height) * 100}%`);
    });

    frame.addEventListener("pointerleave", () => frame.classList.remove("is-zoomed"));

}


// ===========================================
// FILTRO POR COLOR — llamado desde variant-selector.js
// ===========================================

window.filterGalleryByColor = function (colorId) {

    document.querySelectorAll("[data-gallery]").forEach((root) => {

        const thumbs = [...root.querySelectorAll("[data-gallery-thumb]")];

        if (!thumbs.length) return;

        const idStr = colorId === null || colorId === undefined ? "" : String(colorId);

        // "de ese color" o "general" (sin color asignado, data-color-id vacío)
        const matching = thumbs.filter((t) => t.dataset.colorId === idStr || t.dataset.colorId === "");

        // Si ninguna foto está etiquetada con ese color, no hay nada que
        // filtrar: se muestran todas como venían.
        const visible = matching.length ? matching : thumbs;

        thumbs.forEach((t) => t.classList.toggle("hidden", !visible.includes(t)));

        if (matching.length && !matching.some((t) => t.classList.contains("is-selected"))) {

            selectThumb(root, matching[0], 1);

        }

    });

};
