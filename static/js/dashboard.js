// ===========================================
// LAS MANOLAS — dashboard.js
// Sidebar mobile + filas dinámicas de formsets (imágenes/variantes) +
// preview de imagen al elegir archivo.
// ===========================================

document.addEventListener("DOMContentLoaded", () => {

    initSidebarToggle();
    initFormsets();

});


// ===========================================
// SIDEBAR MOBILE
// ===========================================

function initSidebarToggle() {

    const toggle = document.getElementById("dashSidebarToggle");
    const sidebar = document.getElementById("dashSidebar");
    const overlay = document.getElementById("dashOverlay");

    if (!toggle || !sidebar || !overlay) return;

    function open() {
        sidebar.classList.remove("-translate-x-full");
        overlay.classList.remove("hidden");
    }

    function close() {
        sidebar.classList.add("-translate-x-full");
        overlay.classList.add("hidden");
    }

    toggle.addEventListener("click", open);
    overlay.addEventListener("click", close);
}


// ===========================================
// FORMSETS DINÁMICOS (imágenes / variantes)
// Cada [data-formset] tiene: contenedor de filas, un <template> con la
// fila vacía (empty_form de Django) y un botón "agregar".
// ===========================================

function initFormsets() {

    document.querySelectorAll("[data-formset]").forEach(initFormset);

}

function initFormset(root) {

    const rowsContainer = root.querySelector("[data-formset-rows]");
    const templateEl = root.querySelector("[data-formset-empty]");
    const addBtn = root.querySelector("[data-formset-add]");
    const totalFormsInput = root.querySelector('input[name$="-TOTAL_FORMS"]');

    if (!rowsContainer || !templateEl || !addBtn || !totalFormsInput) return;

    // Cada fila (nueva o existente) recibe su botón "Quitar" + preview de imagen.
    rowsContainer.querySelectorAll("[data-formset-row]").forEach(bindRow);

    addBtn.addEventListener("click", () => {

        const index = parseInt(totalFormsInput.value, 10);
        const html = templateEl.innerHTML.replace(/__prefix__/g, index);

        const wrapper = document.createElement("div");
        wrapper.innerHTML = html.trim();
        const newRow = wrapper.firstElementChild;

        rowsContainer.appendChild(newRow);
        bindRow(newRow);

        totalFormsInput.value = index + 1;

    });

    function bindRow(row) {

        bindRemove(row);
        bindImagePreview(row);

    }

    function bindRemove(row) {

        const removeBtn = row.querySelector("[data-formset-remove]");
        const deleteInput = row.querySelector('input[name$="-DELETE"]');
        const idInput = row.querySelector('input[name$="-id"]');

        if (!removeBtn) return;

        removeBtn.addEventListener("click", () => {

            const isExisting = idInput && idInput.value;

            if (isExisting && deleteInput) {

                // Fila que ya existe en la base: se marca DELETE y se
                // oculta, pero sigue en el DOM para que el form la mande.
                deleteInput.checked = true;
                row.classList.add("hidden");

            } else {

                // Fila nueva sin guardar todavía: se puede sacar del DOM
                // directamente, no hay nada que borrar en la base.
                row.remove();

            }

        });

    }

}


// ===========================================
// PREVIEW DE IMAGEN AL ELEGIR ARCHIVO
// (se llama por cada fila, tanto las que ya existían como las que se
// agregan dinámicamente con el botón "+ Agregar foto")
// ===========================================

function bindImagePreview(row) {

    const input = row.querySelector('input[type="file"]');
    const preview = row.querySelector("[data-preview-img]");

    if (!input || !preview) return;

    input.addEventListener("change", () => {

        const file = input.files && input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            preview.classList.remove("hidden");
        };
        reader.readAsDataURL(file);

    });

}
