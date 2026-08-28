// ===========================================
// LAS MANOLAS — gallery.js
// Galería de fotos del detalle de producto: click en una miniatura
// cambia la foto principal con un fade suave, y al elegir un color en
// el selector de variantes (variant-selector.js llama a
// window.filterGalleryByColor) se muestran primero las fotos de ESE
// color — si no tiene ninguna propia, se ven todas igual.
// ===========================================

document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll("[data-gallery]").forEach(initGallery);

});

function initGallery(root) {

    const main = root.querySelector("[data-gallery-main]");
    const thumbs = root.querySelectorAll("[data-gallery-thumb]");

    if (!main || !thumbs.length) return;

    thumbs.forEach((thumb) => {

        thumb.addEventListener("click", () => selectThumb(main, thumbs, thumb));

    });

}

function selectThumb(main, thumbs, thumb) {

    const fullSrc = thumb.dataset.full;
    if (!fullSrc) return;

    if (fullSrc !== main.src) {

        main.style.opacity = "0";

        setTimeout(() => {

            main.src = fullSrc;
            main.style.opacity = "1";

        }, 180);

    }

    thumbs.forEach((t) => t.classList.remove("is-selected"));
    thumb.classList.add("is-selected");

}


// ===========================================
// FILTRO POR COLOR — llamado desde variant-selector.js
// ===========================================

window.filterGalleryByColor = function (colorId) {

    document.querySelectorAll("[data-gallery]").forEach((root) => {

        const main = root.querySelector("[data-gallery-main]");
        const thumbs = [...root.querySelectorAll("[data-gallery-thumb]")];

        if (!main || !thumbs.length) return;

        const idStr = colorId === null || colorId === undefined ? "" : String(colorId);

        // "de ese color" o "general" (sin color asignado, data-color-id vacío)
        const matching = thumbs.filter((t) => t.dataset.colorId === idStr || t.dataset.colorId === "");

        // Si ninguna foto está etiquetada con ese color, no hay nada que
        // filtrar: se muestran todas como venían.
        const visible = matching.length ? matching : thumbs;

        thumbs.forEach((t) => t.classList.toggle("hidden", !visible.includes(t)));

        if (matching.length && !matching.some((t) => t.classList.contains("is-selected"))) {

            selectThumb(main, thumbs, matching[0]);

        }

    });

};
