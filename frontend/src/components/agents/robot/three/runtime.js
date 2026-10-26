import {
    DirectionalLight, HemisphereLight, NeutralToneMapping, PerspectiveCamera, PMREMGenerator, Scene, WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildRobot } from './model.js';
import { delist, enlist, frameHooks, reducedMotion, wake } from '../engine.js';

/**
 * runtime.js - puts one or more bot-robots on a single transparent WebGL canvas laid over a page element.
 *
 * One canvas and one renderer for everything on the element (the five launcher bots share one), drawn from the
 * engine's per-frame hook and only when a bot actually moved. The camera is set so one unit on the z = 0 plane is one
 * CSS pixel, which lets the page decide where each robot stands (`layout`) in ordinary pixels.
 *
 *   mount(host, { items, layout, pixelRatioCap, onError })
 *     items   [{ bot, finish, held, p, detail, getEl }]
 *     layout  (host) => [{ x, ground, scale, k }]  per item, in CSS pixels from the host's top-left:
 *             x = where the robot stands, ground = where its feet are, scale = pixels per robot unit,
 *             k = pixels per engine "scene px" (walking distance)
 *   onError is called once if drawing ever throws, so the page can fall back to the flat drawing.
 *   returns { dispose, relayout }, or null when WebGL is not available.
 */
const FOV = 14;
const D2R = Math.PI / 180;

export const mount = (host, { items, layout, pixelRatioCap = 2, onError }) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'bot-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    let renderer;
    try {
        renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
        return null;
    }
    host.appendChild(canvas);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = NeutralToneMapping;

    const scene = new Scene();
    const pmrem = new PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.62;
    pmrem.dispose();

    scene.add(new HemisphereLight(0xe3eeff, 0x20304f, 0.85));
    const key = new DirectionalLight(0xffffff, 2.3); key.position.set(-300, 620, 720); scene.add(key);
    const rim = new DirectionalLight(0x9cc3ff, 1.5); rim.position.set(520, 300, -620); scene.add(rim);
    const fill = new DirectionalLight(0xffe6c7, 0.55); fill.position.set(420, 100, 520); scene.add(fill);

    const camera = new PerspectiveCamera(FOV, 1, 50, 8000);

    let broken = false;
    const fail = (err) => {
        if (broken) return;
        broken = true;
        console.error('[bot] the 3D robots stopped', err);
        onError?.();
    };

    const robots = items.map((it) => {
        const r = buildRobot({ finish: it.finish, held: it.held, detail: it.detail });
        scene.add(r.root);
        r.unbind = r.bindProps(it.p);
        it.bot.render = (o) => { try { r.apply(o); } catch (err) { fail(err); } };
        it.bot.el = it.getEl ? it.getEl() : host;
        it.bot.snap();
        return r;
    });

    let dirty = true;
    const draw = () => {
        if (broken || (!dirty && !robots.some((r) => r.dirty))) return;
        try { renderer.render(scene, camera); } catch (err) { fail(err); }
        dirty = false;
        robots.forEach((r) => r.clean());
    };

    const relayout = () => {
        const w = host.clientWidth; const h = host.clientHeight;
        if (!w || !h) return;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.position.set(w / 2, h / 2, (h / 2) / Math.tan((FOV * D2R) / 2));
        camera.lookAt(w / 2, h / 2, 0);
        camera.updateProjectionMatrix();
        const places = layout(host);
        robots.forEach((r, i) => {
            const pl = places[i];
            if (!pl) return;
            r.place.x = pl.x; r.place.y = h - pl.ground; r.place.scale = pl.scale; r.place.k = pl.k;
            items[i].bot.el = items[i].getEl ? items[i].getEl() : host;
            try { r.apply(items[i].bot.o); } catch (err) { fail(err); }
        });
        dirty = true;
        draw();
    };
    relayout();

    const still = reducedMotion();
    let io = null;
    if (!still) {
        io = new IntersectionObserver((entries) => {
            const on = entries.some((e) => e.isIntersecting);
            items.forEach((it) => { it.bot.visible = on; });
            if (on) { dirty = true; wake(); }
        }, { threshold: 0.01 });
        io.observe(host);
        items.forEach((it) => enlist(it.bot));
        frameHooks.add(draw);
    }
    const ro = new ResizeObserver(relayout);
    ro.observe(host);

    const onLost = (e) => e.preventDefault();
    const onRestored = () => { dirty = true; draw(); };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    const dispose = () => {
        frameHooks.delete(draw);
        io?.disconnect();
        ro.disconnect();
        items.forEach((it) => { delist(it.bot); it.bot.stopRun(); it.bot.render = null; it.bot.visible = false; });
        robots.forEach((r) => { r.unbind?.(); scene.remove(r.root); r.dispose(); });
        envRT.dispose();
        canvas.removeEventListener('webglcontextlost', onLost);
        canvas.removeEventListener('webglcontextrestored', onRestored);
        renderer.dispose();
        renderer.forceContextLoss();
        canvas.remove();
    };

    return { dispose, relayout };
};
