// ===========================================
// LAS MANOLAS — spotlight.js
// Halo que sigue el mouse dentro de cualquier tarjeta con
// data-spotlight (ver .spotlight en styles.css). Reusable en las
// cards de categoría del home y en las cards de producto del catálogo.
// ===========================================

document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll("[data-spotlight]").forEach((card) => {

        card.addEventListener("mousemove", (e) => {

            const rect = card.getBoundingClientRect();

            card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
            card.style.setProperty("--my", `${e.clientY - rect.top}px`);

        });

    });

});
