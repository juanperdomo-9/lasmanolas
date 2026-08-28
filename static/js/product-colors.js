// ===========================================
// LAS MANOLAS — product-colors.js
// Editor de producto: agrupa talles+stock y fotos por color en un solo
// bloque por color, en vez de dos listas sueltas. Arma toda la UI en JS
// a partir de un JSON con los datos actuales (si se está editando) más
// las listas maestras de talles/colores, y por debajo sigue alimentando
// los mismos formsets de Django de siempre (variants-N-*, images-N-*)
// clonando su empty_form — la parte agrupada es una capa arriba de eso.
// ===========================================

document.addEventListener("DOMContentLoaded", () => {

    const dataEl = document.getElementById("productFormData");
    if (!dataEl) return; // no estamos en el form de producto

    initProductColors(JSON.parse(dataEl.textContent));

});

function initProductColors(data) {

    const variantRowsContainer = document.querySelector("[data-variant-rows]");
    const imageRowsContainer = document.querySelector("[data-image-rows]");
    const variantEmptyTpl = document.querySelector("[data-variant-empty-form]");
    const imageEmptyTpl = document.querySelector("[data-image-empty-form]");
    const variantTotalInput = document.querySelector('input[name="variants-TOTAL_FORMS"]');
    const imageTotalInput = document.querySelector('input[name="images-TOTAL_FORMS"]');
    const groupsEl = document.getElementById("colorGroups");
    const addColorBtn = document.getElementById("addColorGroupBtn");
    const noVariantsHint = document.getElementById("noVariantsHint");

    if (!variantRowsContainer || !imageRowsContainer || !groupsEl) return;

    // El management_form de Django ya viene con TOTAL_FORMS = cantidad de
    // filas existentes (porque el formset conoce el queryset aunque acá no
    // se rendericen sus forms) — pero como TODAS las filas las arma este
    // script desde cero clonando el empty_form, hay que arrancar a contar
    // de 0 nosotros, si no las filas reconstruidas terminan en los índices
    // 6..11 en vez de 0..5 y Django nunca encuentra datos en 0..5 (esto
    // era el bug real de "no se guarda": todo quedaba "obligatorio y
    // vacío" porque los índices no coincidían).
    variantTotalInput.value = "0";
    imageTotalInput.value = "0";

    const masterSizes = data.sizes || [];
    const masterColors = data.colors || [];
    const groups = []; // { colorId: number|null, variants: [{sizeId, sizeName, stock, row}], images: [{previewUrl, row}] }


    // ===========================================
    // FILAS REALES DEL FORMSET (ocultas, lo que Django procesa)
    // ===========================================

    function cloneRow(kind) {

        const isVariant = kind === "variant";
        const container = isVariant ? variantRowsContainer : imageRowsContainer;
        const template = isVariant ? variantEmptyTpl : imageEmptyTpl;
        const totalInput = isVariant ? variantTotalInput : imageTotalInput;

        const index = parseInt(totalInput.value, 10);
        const html = template.innerHTML.replace(/__prefix__/g, index);

        const wrapper = document.createElement("div");
        wrapper.innerHTML = html.trim();
        const row = wrapper.firstElementChild;

        container.appendChild(row);
        totalInput.value = index + 1;

        return row;

    }

    function setRowField(row, suffix, value) {

        const field = row.querySelector(`[name$="-${suffix}"]`);
        if (field) field.value = value;

    }

    function markRowDeleted(row) {

        const deleteInput = row.querySelector('[name$="-DELETE"]');
        if (deleteInput) deleteInput.checked = true;

    }

    function removeOrDeleteRow(row) {

        const idField = row.querySelector('[name$="-id"]');

        if (idField && idField.value) {
            // fila que ya existe en la base: se marca DELETE, Django la borra al guardar.
            markRowDeleted(row);
        } else {
            // fila nueva sin guardar todavía: no hay nada que borrar en la base.
            row.remove();
        }

    }


    // ===========================================
    // ESTADO INICIAL (producto existente) o vacío (producto nuevo)
    // ===========================================

    function findOrCreateGroup(colorId) {

        let group = groups.find((g) => g.colorId === colorId);
        if (!group) {
            group = { colorId, variants: [], images: [] };
            groups.push(group);
        }
        return group;

    }

    (data.variants || []).forEach((v) => {

        const row = cloneRow("variant");
        setRowField(row, "id", v.id);
        setRowField(row, "size", v.size_id);
        setRowField(row, "color", v.color_id || "");
        setRowField(row, "stock", v.stock);
        setRowField(row, "sku", v.sku || "");

        findOrCreateGroup(v.color_id).variants.push({
            sizeId: v.size_id, sizeName: v.size_name, stock: v.stock, row,
        });

    });

    (data.images || []).forEach((img) => {

        const row = cloneRow("image");
        setRowField(row, "id", img.id);
        setRowField(row, "color", img.color_id || "");
        setRowField(row, "alt_text", img.alt_text || "");
        setRowField(row, "order", img.order || 0);

        findOrCreateGroup(img.color_id).images.push({
            previewUrl: img.image_url, row,
        });

    });

    // "General" ya NO se fuerza siempre: solo aparece si el producto ya
    // tenía de antes talles/fotos sin color asignado (quedan ahí para
    // poder reasignarlos a un color real, ver renderGroup). En un
    // producto nuevo no aparece nada hasta que se elige un color con
    // "+ Agregar color" — cada prenda va solo con colores de verdad.
    groups.sort((a) => (a.colorId === null ? -1 : 1));


    // ===========================================
    // RENDER
    // ===========================================

    function colorMeta(colorId) {

        if (colorId === null) return { name: "General", hex: null };
        const c = masterColors.find((mc) => mc.id === colorId);
        return c ? { name: c.name, hex: c.hex } : { name: "Color", hex: "#ccc" };

    }

    function render() {

        groupsEl.innerHTML = "";
        groups.forEach((group) => groupsEl.appendChild(renderGroup(group)));

        const hasAnyVariant = groups.some((g) => g.variants.length > 0);
        if (noVariantsHint) noVariantsHint.classList.toggle("hidden", hasAnyVariant);

    }

    function renderGroup(group) {

        const meta = colorMeta(group.colorId);

        const card = document.createElement("div");
        card.className = "rounded-2xl border border-white/10 bg-white/[.03] p-5";

        // ---- header ----
        const header = document.createElement("div");
        header.className = "flex items-center justify-between gap-3";

        const titleWrap = document.createElement("div");
        titleWrap.className = "flex items-center gap-2.5";

        if (meta.hex) {
            const swatch = document.createElement("span");
            swatch.className = "h-5 w-5 shrink-0 rounded-full border border-white/20";
            swatch.style.background = meta.hex;
            titleWrap.appendChild(swatch);
        }

        const title = document.createElement("p");
        title.className = "font-bold text-white";
        title.textContent = meta.name;
        titleWrap.appendChild(title);
        header.appendChild(titleWrap);

        if (group.colorId === null) {

            // "General" no se puede quitar tocando un botón (no hay
            // "color" que sacar) — se resuelve asignándole un color real,
            // lo que en los hechos lo convierte en un grupo normal.
            header.appendChild(renderReassignColorControl(group));

        } else {

            const removeGroupBtn = document.createElement("button");
            removeGroupBtn.type = "button";
            removeGroupBtn.className = "text-xs font-bold text-white/40 hover:text-blush-300";
            removeGroupBtn.textContent = "Quitar color";
            removeGroupBtn.addEventListener("click", () => {

                [...group.variants].forEach((v) => removeOrDeleteRow(v.row));
                [...group.images].forEach((img) => removeOrDeleteRow(img.row));
                groups.splice(groups.indexOf(group), 1);
                render();

            });
            header.appendChild(removeGroupBtn);

        }

        card.appendChild(header);

        // ---- talles ----
        card.appendChild(sectionLabel("Talles y stock"));

        const sizesRow = document.createElement("div");
        sizesRow.className = "flex flex-wrap items-center gap-2";
        group.variants.forEach((v) => sizesRow.appendChild(renderVariantChip(group, v)));
        sizesRow.appendChild(renderAddSizeControl(group));
        card.appendChild(sizesRow);

        // ---- fotos ----
        card.appendChild(sectionLabel("Fotos"));

        const photosRow = document.createElement("div");
        photosRow.className = "flex flex-wrap items-center gap-2";
        group.images.forEach((img) => photosRow.appendChild(renderImageChip(group, img)));
        photosRow.appendChild(renderAddPhotoControl(group));
        card.appendChild(photosRow);

        return card;

    }

    function sectionLabel(text) {

        const p = document.createElement("p");
        p.className = "mt-5 mb-2 text-[11px] font-bold uppercase tracking-wider text-white/30 first:mt-4";
        p.textContent = text;
        return p;

    }

    function renderReassignColorControl(group) {

        const usedColorIds = groups.map((g) => g.colorId).filter((id) => id !== null);
        const available = masterColors.filter((c) => !usedColorIds.includes(c.id));

        const wrap = document.createElement("div");
        wrap.className = "flex items-center gap-2";

        const label = document.createElement("span");
        label.className = "text-xs font-bold text-white/40";
        label.textContent = "Asignar color:";
        wrap.appendChild(label);

        const select = document.createElement("select");
        select.className = "rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white";

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Elegir…";
        select.appendChild(placeholder);

        available.forEach((c) => {

            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = c.name;
            select.appendChild(opt);

        });

        select.addEventListener("change", () => {

            const colorId = parseInt(select.value, 10);
            if (!colorId) return;

            // Reasigna TODAS las filas de este grupo (talles y fotos) al
            // color elegido — de ahí en más deja de ser "General".
            group.variants.forEach((v) => setRowField(v.row, "color", colorId));
            group.images.forEach((img) => setRowField(img.row, "color", colorId));
            group.colorId = colorId;

            render();

        });

        wrap.appendChild(select);
        return wrap;

    }

    function renderVariantChip(group, v) {

        const chip = document.createElement("div");
        chip.className = "flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-3 pr-2";

        const label = document.createElement("span");
        label.className = "text-sm font-bold text-white";
        label.textContent = v.sizeName;
        chip.appendChild(label);

        const stockInput = document.createElement("input");
        stockInput.type = "number";
        stockInput.min = "0";
        stockInput.value = v.stock;
        stockInput.title = "Stock";
        stockInput.className = "w-16 rounded-full border border-white/10 bg-white/10 px-2 py-1 text-center text-xs text-white";
        stockInput.addEventListener("input", () => setRowField(v.row, "stock", stockInput.value || 0));
        chip.appendChild(stockInput);

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "flex h-6 w-6 items-center justify-center rounded-full text-sm text-white/40 hover:bg-blush-500/20 hover:text-blush-300";
        removeBtn.textContent = "×";
        removeBtn.addEventListener("click", () => {

            removeOrDeleteRow(v.row);
            group.variants.splice(group.variants.indexOf(v), 1);
            render();

        });
        chip.appendChild(removeBtn);

        return chip;

    }

    function renderAddSizeControl(group) {

        const available = masterSizes.filter((s) => !group.variants.some((v) => v.sizeId === s.id));

        const select = document.createElement("select");
        select.className = "rounded-full border border-dashed border-white/20 bg-transparent px-3 py-1.5 text-xs font-bold text-white/50";

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "+ Talle…";
        select.appendChild(placeholder);

        available.forEach((s) => {

            const opt = document.createElement("option");
            opt.value = s.id;
            opt.textContent = s.name;
            select.appendChild(opt);

        });

        if (!available.length) select.disabled = true;

        select.addEventListener("change", () => {

            const sizeId = parseInt(select.value, 10);
            if (!sizeId) return;

            const sizeMeta = masterSizes.find((s) => s.id === sizeId);
            const row = cloneRow("variant");
            setRowField(row, "size", sizeId);
            setRowField(row, "color", group.colorId || "");
            setRowField(row, "stock", 0);

            group.variants.push({ sizeId, sizeName: sizeMeta ? sizeMeta.name : "", stock: 0, row });
            render();

        });

        return select;

    }

    function renderImageChip(group, img) {

        const chip = document.createElement("div");
        chip.className = "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/10";

        if (img.previewUrl) {
            const image = document.createElement("img");
            image.src = img.previewUrl;
            image.className = "h-full w-full object-cover";
            chip.appendChild(image);
        }

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-blush-500";
        removeBtn.textContent = "×";
        removeBtn.addEventListener("click", () => {

            removeOrDeleteRow(img.row);
            group.images.splice(group.images.indexOf(img), 1);
            render();

        });
        chip.appendChild(removeBtn);

        return chip;

    }

    function renderAddPhotoControl(group) {

        const label = document.createElement("label");
        label.className = "flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-white/15 text-lg font-bold text-white/40 hover:border-lilac-400/50 hover:text-lilac-300";
        label.textContent = "+";

        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.multiple = true;
        input.className = "hidden";

        input.addEventListener("change", () => {

            [...input.files].forEach((file) => {

                const row = cloneRow("image");
                setRowField(row, "color", group.colorId || "");

                const fileInput = row.querySelector('input[type="file"]');
                if (fileInput) {

                    const dt = new DataTransfer();
                    dt.items.add(file);
                    fileInput.files = dt.files;

                }

                const reader = new FileReader();
                reader.onload = (e) => {

                    group.images.push({ previewUrl: e.target.result, row });
                    render();

                };
                reader.readAsDataURL(file);

            });

        });

        label.appendChild(input);
        return label;

    }


    // ===========================================
    // "+ AGREGAR COLOR"
    // ===========================================

    if (addColorBtn) {

        addColorBtn.addEventListener("click", () => showColorPicker());

    }

    function showColorPicker() {

        // Nunca dos selectores de color abiertos a la vez — si ya hay uno
        // (ej. doble click en "+ Agregar color"), se saca antes de abrir
        // otro. Esto es justo lo que causaba el bug de "no se guarda":
        // dos selectores abiertos ofrecían el mismo color todavía "libre"
        // en ambos (ninguno se había confirmado aún), y si se confirmaban
        // los dos con el mismo color + mismo talle, la base rechazaba el
        // talle duplicado y el guardado fallaba en silencio.
        closeColorPicker();
        addColorBtn.disabled = true;

        // El color se define ACÁ mismo con nombre + hex (color picker
        // nativo), en vez de elegirlo de la lista ya cargada en "Talles y
        // colores" — se crea (o reutiliza si el nombre ya existe) al
        // confirmar, vía color_quick_create.
        const picker = document.createElement("div");
        picker.setAttribute("data-color-picker", "");
        picker.className = "flex flex-wrap items-center gap-3 rounded-2xl border border-lilac-400/40 bg-lilac-500/10 p-4";

        const colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.value = "#CCCCCC";
        colorInput.title = "Hex del color";
        colorInput.className = "h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0";

        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.placeholder = "Nombre del color (ej. Azul oscuro)";
        nameInput.className = "min-w-[10rem] flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30";

        const confirmBtn = document.createElement("button");
        confirmBtn.type = "button";
        confirmBtn.className = "shrink-0 rounded-full bg-aurora px-4 py-2 text-xs font-bold text-white disabled:opacity-50";
        confirmBtn.textContent = "Agregar";

        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "shrink-0 rounded-full bg-white/5 px-4 py-2 text-xs font-bold text-white/60 hover:bg-white/10";
        cancelBtn.textContent = "Cancelar";
        cancelBtn.addEventListener("click", () => {

            addColorBtn.disabled = false;
            render();

        });

        const errorMsg = document.createElement("p");
        errorMsg.className = "hidden w-full text-xs font-semibold text-blush-300";

        confirmBtn.addEventListener("click", () => {

            const name = nameInput.value.trim();
            errorMsg.classList.add("hidden");

            if (!name) {
                errorMsg.textContent = "Escribí un nombre para el color.";
                errorMsg.classList.remove("hidden");
                nameInput.focus();
                return;
            }

            const quickCreateUrl = addColorBtn.dataset.quickCreateUrl;
            const form = addColorBtn.closest("form");
            const csrfToken = form.querySelector('input[name="csrfmiddlewaretoken"]').value;

            const body = new FormData();
            body.append("name", name);
            body.append("hex_code", colorInput.value);

            confirmBtn.disabled = true;
            confirmBtn.textContent = "Agregando…";

            fetch(quickCreateUrl, { method: "POST", headers: { "X-CSRFToken": csrfToken }, body })
                .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
                .then(({ ok, data }) => {

                    if (!ok) throw new Error(data.error || "No se pudo crear el color");

                    // Lo suma a la lista maestra local si no la conocía
                    // (recién creado), para que el resto del editor
                    // (ej. "Asignar color" del grupo General) ya lo vea.
                    if (!masterColors.some((c) => c.id === data.id)) {
                        masterColors.push({ id: data.id, name: data.name, hex: data.hex });
                    }

                    // Red de seguridad: si por lo que sea ya existe un
                    // grupo con este color (ej. reutilizó un nombre ya
                    // usado en este mismo producto), no se duplica el
                    // grupo.
                    if (!groups.some((g) => g.colorId === data.id)) {
                        groups.push({ colorId: data.id, variants: [], images: [] });
                    }

                    addColorBtn.disabled = false;
                    render();

                })
                .catch((err) => {

                    confirmBtn.disabled = false;
                    confirmBtn.textContent = "Agregar";
                    errorMsg.textContent = err.message;
                    errorMsg.classList.remove("hidden");

                });

        });

        picker.appendChild(colorInput);
        picker.appendChild(nameInput);
        picker.appendChild(confirmBtn);
        picker.appendChild(cancelBtn);
        picker.appendChild(errorMsg);

        groupsEl.prepend(picker);
        nameInput.focus();

    }

    function closeColorPicker() {

        const existing = groupsEl.querySelector("[data-color-picker]");
        if (existing) existing.remove();

    }


    render();

}
