// ===========================================
// LAS MANOLAS — home.js (hero "tendedero" + "Por qué Las Manolas")
// 1. Cada [data-reveal-section] recibe .is-in una sola vez al aparecer; el
//    CSS (home.css) anima sus partes en cascada.
// 2. Título: cada letra entra rebotando y se sacude al pasarle el mouse.
// 3. Tendedero: las prendas caen desde arriba, se enganchan en la soga (que
//    se hunde un poco con cada una) y quedan colgando como péndulos. El
//    mouse les hace viento, el scroll las sacude. Física simple de resortes
//    en un solo requestAnimationFrame que se apaga solo cuando todo quieto.
// Con "reducir movimiento": nada cae ni se balancea, quedan colgadas quietas.
// ===========================================

document.addEventListener("DOMContentLoaded", () => {

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    initBounceText();
    initSplitWords();
    initReveal();
    initScrollAnims();
    initClothesline(reduceMotion);

    if (!reduceMotion) {
        initScrollEffects();
        initVelocityMarquee();
        initMouseScenes();
    }

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


// Efectos atados al scroll (todo con transform, en un solo rAF por scroll):
// - [data-parallax="v"]: se corre v px por cada px de distancia al centro
//   de la pantalla (columnas de destacados a distinta velocidad, fotos
//   dentro de las fichas). En pantallas chicas se apaga.
// - [data-hero-parallax]: el texto del hero se queda atrás y se desvanece.
// - [data-scroll-grow]: la caja del cierre crece mientras te acercás.
function initScrollEffects() {

    const parallax = [...document.querySelectorAll("[data-parallax]")]
        .map((el) => ({ el, speed: parseFloat(el.dataset.parallax) || 0, center: 0 }))
        .filter((p) => p.speed !== 0);
    const heroText = document.querySelector("[data-hero-parallax]");
    const hero = heroText?.closest("[data-hero]");
    const grow = [...document.querySelectorAll("[data-scroll-grow]")];
    const tapes = [...document.querySelectorAll("[data-tape]")].map((el) => ({
        track: el.querySelector(".lm-tape-track"),
        group: el.querySelector(".lm-tape-group"),
    }));

    // Posición "de reposo" de cada elemento (sin su propio transform), para
    // no medir algo que ya movimos y entrar en un ida y vuelta.
    function measure() {
        parallax.forEach((p) => {
            const prev = p.el.style.transform;
            p.el.style.transform = "none";
            const r = p.el.getBoundingClientRect();
            p.center = r.top + window.scrollY + r.height / 2;
            p.el.style.transform = prev;
        });
    }

    let ticking = false;

    function update() {
        ticking = false;
        const y = window.scrollY;
        const vh = window.innerHeight;
        const wide = window.innerWidth >= 1024;

        parallax.forEach((p) => {
            const delta = p.center - (y + vh / 2);
            if (Math.abs(delta) > vh * 1.5) return;
            const speed = wide || p.el.tagName === "IMG" ? p.speed : 0;
            p.el.style.transform = speed ? `translate3d(0, ${(-delta * speed).toFixed(1)}px, 0)` : "";
        });

        if (heroText && hero) {
            const h = hero.offsetHeight;
            if (y < h) {
                heroText.style.transform = `translate3d(0, ${(y * 0.35).toFixed(1)}px, 0)`;
                heroText.style.opacity = String(Math.max(0, 1 - y / (h * 0.75)).toFixed(3));
            }
        }

        grow.forEach((el) => {
            const r = el.parentElement.getBoundingClientRect();
            const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.75)));
            el.style.transform = `scale(${(0.82 + 0.18 * p).toFixed(4)})`;
        });

        // La cinta métrica se desliza con el scroll (y vuelve a empezar sin salto).
        tapes.forEach(({ track, group }) => {
            if (!track || !group) return;
            const w = group.offsetWidth;
            const x = -((y * 0.6) % w) - w * 0.5;
            track.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
        });
    }

    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
    }

    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => { measure(); update(); });
    window.addEventListener("load", () => { measure(); update(); });

}


// [data-mouse-scene]: adentro, cada [data-depth="n"] se corre hasta n px
// siguiendo al mouse (los negativos para el otro lado → efecto de capas).
// Se suaviza con un lerp y el loop se apaga cuando llegó.
function initMouseScenes() {

    document.querySelectorAll("[data-mouse-scene]").forEach((scene) => {

        const layers = [...scene.querySelectorAll("[data-depth]")].map((el) => ({
            el, depth: parseFloat(el.dataset.depth) || 0, x: 0, y: 0,
        }));
        if (!layers.length) return;

        let tx = 0;
        let ty = 0;
        let rafId = null;

        function frame() {
            let moving = false;
            layers.forEach((l) => {
                l.x += (tx * l.depth - l.x) * 0.08;
                l.y += (ty * l.depth - l.y) * 0.08;
                if (Math.abs(tx * l.depth - l.x) > 0.1 || Math.abs(ty * l.depth - l.y) > 0.1) moving = true;
                l.el.style.transform = `translate3d(${l.x.toFixed(2)}px, ${l.y.toFixed(2)}px, 0)`;
            });
            rafId = moving ? requestAnimationFrame(frame) : null;
        }

        function wake() {
            if (!rafId) rafId = requestAnimationFrame(frame);
        }

        scene.addEventListener("pointermove", (e) => {
            if (e.pointerType !== "mouse") return;
            const r = scene.getBoundingClientRect();
            tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
            ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
            wake();
        });

        scene.addEventListener("pointerleave", () => {
            tx = 0;
            ty = 0;
            wake();
        });

    });

}


// La cinta de beneficios: anda sola, pero el scroll la acelera, le cambia
// el sentido (bajás → a la izquierda, subís → a la derecha) y la estira un
// poco cuando scrolleás rápido.
function initVelocityMarquee() {

    const section = document.querySelector("[data-velocity-marquee]");
    const track = section?.querySelector(".marquee-track");
    if (!track) return;

    section.classList.add("is-driven");

    const BASE = 45; // px/s
    let x = 0;
    let dir = -1;
    let boost = 0;
    let lastScroll = window.scrollY;
    let last = performance.now();
    let rafId = null;
    let visible = true;

    window.addEventListener("scroll", () => {
        const dy = window.scrollY - lastScroll;
        lastScroll = window.scrollY;
        if (dy !== 0) dir = dy > 0 ? -1 : 1;
        boost = Math.min(1600, boost + Math.abs(dy) * 6);
    }, { passive: true });

    function frame(now) {
        const dt = Math.min((now - last) / 1000, 1 / 30);
        last = now;
        boost *= Math.pow(0.04, dt); // el envión se va apagando
        const half = track.scrollWidth / 2;
        x += dir * (BASE + boost) * dt;
        if (x <= -half) x += half;
        if (x > 0) x -= half;
        const skew = Math.max(-10, Math.min(10, -dir * boost * 0.012));
        track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0) skewX(${skew.toFixed(2)}deg)`;
        rafId = visible && !document.hidden ? requestAnimationFrame(frame) : null;
    }

    function start() {
        if (rafId) return;
        last = performance.now();
        rafId = requestAnimationFrame(frame);
    }

    new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
    }).observe(section);

    document.addEventListener("visibilitychange", () => { if (!document.hidden && visible) start(); });

}


function initReveal() {

    const sections = document.querySelectorAll("[data-reveal-section]");

    if (!("IntersectionObserver" in window)) {
        sections.forEach((s) => s.classList.add("is-in"));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.12 });

    sections.forEach((s) => observer.observe(s));

}


function initBounceText() {

    const heading = document.querySelector("[data-bounce]");
    if (!heading) return;

    const colors = ["--color-lilac-500", "--color-blush-500", "--color-sky-500", "--color-mint-700", "--color-amber-700"];
    const wrapper = document.createElement("span");
    wrapper.setAttribute("aria-hidden", "true");
    let index = 0;

    heading.childNodes.forEach((node) => {

        if (node.nodeName === "BR") {
            wrapper.appendChild(document.createElement("br"));
            return;
        }

        node.textContent.split(/(\s+)/).forEach((chunk) => {

            if (!chunk) return;
            if (/^\s+$/.test(chunk)) {
                wrapper.appendChild(document.createTextNode(" "));
                return;
            }

            const word = document.createElement("span");
            word.className = "lm-word";

            [...chunk].forEach((char) => {
                const outer = document.createElement("span");
                const inner = document.createElement("span");
                outer.className = "lm-ch";
                inner.className = "lm-ch-i";
                inner.textContent = char;
                outer.style.setProperty("--d", index);
                outer.style.setProperty("--r", `${Math.round(Math.random() * 50 - 25)}deg`);
                outer.style.setProperty("--hc", `var(${colors[index % colors.length]})`);
                outer.appendChild(inner);
                word.appendChild(outer);
                index += 1;
            });

            wrapper.appendChild(word);

        });

    });

    heading.replaceChildren(wrapper);

}


function initClothesline(reduceMotion) {

    const line = document.querySelector("[data-clothesline]");
    if (!line) return;

    const hero = line.closest("[data-hero]");
    const rope = line.querySelector("[data-rope]");
    const all = [...line.querySelectorAll("[data-hang]")];

    line.classList.add("is-live");

    // Constantes de la "física" (unidades: px y segundos)
    const GRAVITY = 3200;          // caída libre
    const SWING_K = 34;            // resorte del péndulo (más alto = más rápido)
    const SWING_DAMP = 1.5;        // cuánto tarda en frenar (bajo = muchas idas y vueltas)
    const BOUNCE_K = 140;          // rebote vertical al engancharse
    const BOUNCE_DAMP = 11;
    const SAG_K = 110;             // la soga hundiéndose y volviendo
    const SAG_DAMP = 6.5;

    const state = new Map(all.map((el) => [el, { a: 0, v: 0, y: 0, vy: 0, falling: false, landed: reduceMotion, startAt: 0 }]));
    let items = [];
    let width = 0;
    let ropeTop = 0;
    let baseSag = 0;
    let sag = 0;
    let sagV = 0;
    let rafId = null;
    let last = 0;
    let onScreen = true;

    function ropeY(t) {
        return ropeTop + 4 * (baseSag + sag) * t * (1 - t);
    }

    function layout() {
        width = line.clientWidth;
        const height = line.clientHeight;
        ropeTop = Math.min(46, height * 0.12);
        baseSag = Math.min(64, height * 0.13);

        const visible = all.filter((el) => getComputedStyle(el).display !== "none");
        const n = visible.length;

        items = visible.map((el, i) => {
            const t = n === 1 ? 0.5 : 0.08 + (0.84 * i) / (n - 1);
            const s = n === 1 ? 1 : 0.72 + (0.62 * i) / (n - 1);
            el.style.setProperty("--s", s.toFixed(3));
            return { el, t, w: el.offsetWidth, st: state.get(el) };
        });

        // Quietas (movimiento reducido): cada una apenas torcida, distinta.
        if (reduceMotion) {
            items.forEach((it, i) => { it.st.a = ((i * 37) % 7 - 3) * 0.012; });
        }
    }

    function render() {
        rope.setAttribute("d", `M -20 ${ropeTop} Q ${width / 2} ${ropeTop + 2 * (baseSag + sag)} ${width + 20} ${ropeTop}`);
        items.forEach(({ el, t, w, st }) => {
            const x = t * width - w / 2;
            const y = ropeY(t) - 4 + st.y;
            el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${st.a}rad)`;
        });
    }

    function step(now) {
        const dt = Math.min((now - last) / 1000, 1 / 30);
        last = now;
        let moving = Math.abs(sag) > 0.05 || Math.abs(sagV) > 0.05;

        items.forEach((it) => {
            const st = it.st;

            if (st.dragging) { moving = true; return; }

            if (!st.landed) {
                if (now < st.startAt) { moving = true; return; }
                st.falling = true;
                st.vy += GRAVITY * dt;
                st.y += st.vy * dt;
                if (st.y >= 0) {
                    // Enganchó en la soga: rebota, se balancea y la soga se hunde.
                    st.y = 0;
                    st.landed = true;
                    st.falling = false;
                    st.vy *= 0.35;
                    st.v += (Math.random() < 0.5 ? -1 : 1) * (1.6 + Math.random() * 1.6);
                    sagV += 70 + it.t * 40;
                }
                moving = true;
                return;
            }

            const len = 0.85 + it.w / 260;            // las más grandes van más lento
            st.v += (-(SWING_K / len) * st.a - SWING_DAMP * st.v) * dt;
            st.a += st.v * dt;
            st.vy += (-BOUNCE_K * st.y - BOUNCE_DAMP * st.vy) * dt;
            st.y += st.vy * dt;

            if (Math.abs(st.a) > 0.0015 || Math.abs(st.v) > 0.0015 || Math.abs(st.y) > 0.05 || Math.abs(st.vy) > 0.05) moving = true;
        });

        sagV += (-SAG_K * sag - SAG_DAMP * sagV) * dt;
        sag += sagV * dt;

        render();

        if (moving && onScreen && !document.hidden) {
            rafId = requestAnimationFrame(step);
        } else {
            rafId = null;
        }
    }

    function wake() {
        if (rafId || reduceMotion) return;
        last = performance.now();
        rafId = requestAnimationFrame(step);
    }

    function kick(it, amount) {
        it.st.v = Math.max(-7, Math.min(7, it.st.v + amount));
    }

    layout();

    if (reduceMotion) {
        render();
    } else {
        // Arrancan bien arriba (pasan cayendo por el título) y de a una.
        const start = performance.now() + 450;
        items.forEach((it, i) => {
            it.st.y = -(line.offsetTop + it.w * 1.6 + 120);
            it.st.startAt = start + i * 160;
        });
        render();
        wake();
    }

    // Viento: el mouse (o el dedo) que pasa cerca las empuja según su velocidad.
    let lastX = null;
    let lastTime = 0;

    function wind(clientX, clientY) {
        const now = performance.now();
        const box = line.getBoundingClientRect();
        if (lastX !== null && clientY > box.top - 80 && clientY < box.bottom) {
            const vx = (clientX - lastX) / Math.max(now - lastTime, 8); // px/ms
            const mx = clientX - box.left;
            items.forEach((it) => {
                if (!it.st.landed) return;
                const d = Math.abs(mx - it.t * width);
                if (d < 230) kick(it, vx * 0.55 * (1 - d / 230));
            });
            wake();
        }
        lastX = clientX;
        lastTime = now;
    }

    if (!reduceMotion) {
        hero.addEventListener("pointermove", (e) => wind(e.clientX, e.clientY), { passive: true });
        hero.addEventListener("pointerleave", () => { lastX = null; });
        hero.addEventListener("touchmove", (e) => wind(e.touches[0].clientX, e.touches[0].clientY), { passive: true });

        // Scroll: la soga se sacude y cada prenda para un lado distinto.
        let lastScroll = window.scrollY;
        window.addEventListener("scroll", () => {
            const dy = window.scrollY - lastScroll;
            lastScroll = window.scrollY;
            if (!onScreen) return;
            const push = Math.max(-1.6, Math.min(1.6, dy * 0.03));
            items.forEach((it, i) => { if (it.st.landed) kick(it, i % 2 ? push : -push * 0.8); });
            sagV += Math.max(-60, Math.min(60, dy * 1.5));
            wake();
        }, { passive: true });

        // Un toquecito al entrar el mouse a una prenda.
        all.forEach((el) => {
            el.addEventListener("pointerenter", (e) => {
                const it = items.find((x) => x.el === el);
                if (!it || e.pointerType !== "mouse" || !it.st.landed) return;
                kick(it, (Math.random() < 0.5 ? -1 : 1) * 1.4);
                wake();
            });
        });

        // Agarrar una prenda y revolearla: mientras la arrastrás sigue al
        // dedo/mouse como péndulo; al soltar se lleva el envión. Si se movió,
        // el click no navega (fue un juego, no un "quiero verla").
        all.forEach((el) => {
            let drag = null;

            el.addEventListener("dragstart", (e) => e.preventDefault());

            el.addEventListener("pointerdown", (e) => {
                const it = items.find((x) => x.el === el);
                if (!it || !it.st.landed || e.button > 0) return;
                drag = { it, x0: e.clientX, moved: false, lastA: it.st.a, lastT: performance.now() };
                it.st.dragging = true;
                el.setPointerCapture(e.pointerId);
            });

            el.addEventListener("pointermove", (e) => {
                if (!drag) return;
                const { it } = drag;
                if (Math.abs(e.clientX - drag.x0) > 6) drag.moved = true;
                if (!drag.moved) return;
                const box = line.getBoundingClientRect();
                const pinX = box.left + it.t * width;
                const pinY = box.top + ropeY(it.t);
                const target = Math.atan2(-(e.clientX - pinX), Math.max(e.clientY - pinY, 30));
                const now = performance.now();
                it.st.a = Math.max(-1.3, Math.min(1.3, target));
                it.st.v = (it.st.a - drag.lastA) / Math.max((now - drag.lastT) / 1000, 0.008);
                drag.lastA = it.st.a;
                drag.lastT = now;
                render();
            });

            const release = () => {
                if (!drag) return;
                drag.it.st.dragging = false;
                if (drag.moved) {
                    drag.it.st.v = Math.max(-9, Math.min(9, drag.it.st.v));
                    el.dataset.dragged = "1";
                    wake();
                }
                drag = null;
            };

            el.addEventListener("pointerup", release);
            el.addEventListener("pointercancel", release);

            el.addEventListener("click", (e) => {
                if (el.dataset.dragged) {
                    e.preventDefault();
                    delete el.dataset.dragged;
                }
            });
        });

        document.addEventListener("visibilitychange", () => { if (!document.hidden) wake(); });

        new IntersectionObserver(([entry]) => {
            onScreen = entry.isIntersecting;
            if (onScreen) wake();
        }).observe(hero);
    }

    let resizeTimer = null;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { layout(); render(); wake(); }, 120);
    });

    // Las fotos pueden terminar de cargar después: recalcular anchos.
    line.querySelectorAll("img").forEach((img) => {
        if (!img.complete) img.addEventListener("load", () => { layout(); render(); }, { once: true });
    });

}
