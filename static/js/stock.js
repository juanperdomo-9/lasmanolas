// ===========================================
// LAS MANOLAS — stock.js (pantalla /panel/stock/)
// Cada fila guarda sola: − / + o escribir el número dispara un POST
// (con un pequeño delay, así varios toques seguidos se mandan juntos).
// Al lado aparece ✓ cuando quedó guardado, o ! si falló.
// ===========================================

document.addEventListener("DOMContentLoaded", () => {

    const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]').value;

    document.querySelectorAll("[data-stock-row]").forEach((row) => {

        const input = row.querySelector("[data-stock-input]");
        const status = row.querySelector("[data-stock-status]");
        let timer = null;
        let lastSaved = input.value;

        function setStatus(text, colorClass) {
            status.textContent = text;
            status.className = `w-5 shrink-0 text-center text-base font-extrabold ${colorClass}`;
        }

        async function save() {
            const value = Math.max(parseInt(input.value, 10) || 0, 0);
            input.value = value;
            if (String(value) === lastSaved) return;

            setStatus("…", "text-white/40");
            const body = new FormData();
            body.append("stock", value);

            try {
                const res = await fetch(row.dataset.url, {
                    method: "POST",
                    headers: { "X-CSRFToken": csrfToken },
                    body,
                });
                if (!res.ok) throw new Error();
                lastSaved = String(value);
                setStatus("✓", "text-mint-300");
            } catch {
                setStatus("!", "text-blush-300");
                status.title = "No se pudo guardar — revisá la conexión y probá de nuevo";
            }
        }

        function scheduleSave() {
            clearTimeout(timer);
            setStatus("", "");
            timer = setTimeout(save, 500);
        }

        row.querySelectorAll("[data-step]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const next = (parseInt(input.value, 10) || 0) + parseInt(btn.dataset.step, 10);
                input.value = Math.max(next, 0);
                scheduleSave();
            });
        });

        input.addEventListener("input", scheduleSave);
        input.addEventListener("blur", () => { clearTimeout(timer); save(); });

    });

});
