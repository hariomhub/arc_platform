/**
 * voice.js - lets a robot read its lines aloud with the browser's own speech synthesis.
 *
 * Nothing is downloaded and no audio files are shipped: the browser (or operating system) supplies the voice, so it
 * costs the page nothing while silent. How natural it sounds depends on the voices installed on the visitor's device,
 * so this module does what it can with them:
 *   - it ranks the English voices and picks the most natural one (neural / "Natural" voices first, then Google's and
 *     Apple's good ones, and the old built-in Windows voices last); the visitor can override the choice and it is
 *     remembered;
 *   - it speaks a line one phrase at a time, so the voice breathes where a person would, instead of one flat run;
 *   - it keeps pitch and rate close to normal (stretching them is what makes speech sound robotic);
 *   - acronyms are spelled the way people say them.
 * Rules it follows:
 *   - it only speaks after the visitor has interacted with the page (browsers refuse otherwise), so a page opened
 *     straight from a bookmark stays quiet until the first click;
 *   - the visitor can switch it off (remembered in localStorage) and every spoken line is also shown as a caption;
 *   - a new line, a new activity or leaving the page stops whatever is being said.
 */
const synth = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined' ? window.speechSynthesis : null;
const KEY_ON = 'rac-bot-voice';
const KEY_NAME = 'rac-bot-voice-name';

const read = (key, fallback) => { try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch { return fallback; } };
const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* storage unavailable: it just won't be remembered */ } };

let enabled = read(KEY_ON, 'on') !== 'off';
let picked = read(KEY_NAME, '');
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

let voices = [];
const loadVoices = () => { voices = synth ? synth.getVoices() : []; notify(); };
if (synth) { voices = synth.getVoices(); synth.addEventListener?.('voiceschanged', loadVoices); }

let interacted = false;
if (typeof window !== 'undefined') {
    const mark = () => { interacted = true; };
    window.addEventListener('pointerdown', mark, { once: true, passive: true });
    window.addEventListener('keydown', mark, { once: true, passive: true });
}
const activated = () => (typeof navigator !== 'undefined' && navigator.userActivation ? navigator.userActivation.hasBeenActive : interacted);

export const voiceSupported = () => !!synth;
export const voiceEnabled = () => enabled;
export const canSpeak = () => !!synth && enabled && activated();
export const onVoiceChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

// ── choosing a voice ─────────────────────────────────────────────────────────────────────────────────────────────
const isNatural = (v) => /natural|neural|online|enhanced|premium|siri/i.test(v.name) || /^google/i.test(v.name);

const scoreOf = (v) => {
    if (!/^en/i.test(v.lang)) return null;
    let s = 1;
    if (/^en[-_]IN/i.test(v.lang)) s += 2;
    else if (/^en[-_](GB|AU|IE|ZA|NZ|US)/i.test(v.lang)) s += 1;
    if (/natural|neural/i.test(v.name)) s += 12;
    if (/online/i.test(v.name)) s += 5;
    if (/enhanced|premium|siri/i.test(v.name)) s += 7;
    if (/^google/i.test(v.name)) s += 6;
    if (!v.localService) s += 2;
    if (/^microsoft/i.test(v.name) && v.localService && !/online|natural/i.test(v.name)) s -= 3;   // the older built-in Windows voices
    if (/^(samantha|karen|daniel|moira|rishi|veena|tessa|serena)\b/i.test(v.name)) s += 3;           // good Apple voices
    return s;
};

const ranked = () => voices
    .map((v) => [scoreOf(v), v])
    .filter(([sc]) => sc !== null)
    .sort((a, b) => b[0] - a[0])
    .map(([, v]) => v);

const tidy = (v) => `${v.name.replace(/^Microsoft\s+/i, '').replace(/\s*-\s*English.*$/i, '')} (${v.lang.replace('_', '-')})`;

/** The English voices this browser has, best first: [{ name, label, natural }]. */
export const voiceChoices = () => ranked().slice(0, 14).map((v) => ({ name: v.name, label: tidy(v), natural: isNatural(v) }));
export const voicePick = () => picked;
export const setVoicePick = (name) => { picked = name; write(KEY_NAME, name); notify(); };

const chosenVoice = () => {
    const list = ranked();
    return (picked && list.find((v) => v.name === picked)) || list[0] || null;
};

// ── speaking ─────────────────────────────────────────────────────────────────────────────────────────────────────
let pending = null;   // { resolve, timer, cancelled } of the line being spoken
const settle = () => {
    if (!pending) return;
    clearTimeout(pending.timer);
    pending.cancelled = true;
    const { resolve } = pending;
    pending = null;
    resolve();
};

export const stopVoice = () => {
    if (!synth) return;
    try { synth.cancel(); } catch { /* nothing to cancel */ }
    settle();
};

export const setVoiceEnabled = (on) => {
    enabled = !!on;
    write(KEY_ON, enabled ? 'on' : 'off');
    if (!enabled) stopVoice();
    notify();
};

// Say acronyms the way people do.
const PRONOUNCE = [
    [/ISO\/IEC 42001/g, 'I S O, I E C, forty two thousand and one'],
    [/FREE-AI/g, 'FREE A I'],
    [/\bAIMS\b/g, 'aims'],
    [/\bAI\b/g, 'A I'],
    [/\bEU\b/g, 'E U'],
    [/\bRMF\b/g, 'R M F'],
    [/\bRBI\b/g, 'R B I'],
    [/\bNIST\b/g, 'nist'],
    [/’/g, "'"],
];
const speakable = (text) => PRONOUNCE.reduce((t, [re, to]) => t.replace(re, to), text);

// One phrase at a time: split at sentence ends and colons, and long sentences again at a comma.
const phrases = (text) => {
    const out = [];
    (text.match(/[^.!?;:]+[.!?;:]*/g) || [text]).forEach((part) => {
        let t = part.trim();
        while (t.length > 110) {
            const cut = t.lastIndexOf(',', 100);
            if (cut < 40) break;
            out.push(t.slice(0, cut + 1));
            t = t.slice(cut + 1).trim();
        }
        if (t) out.push(t);
    });
    return out;
};

/** Read a line aloud. Resolves when the voice has finished (or could not start), never rejects. */
export const speak = (text, { pitch = 1, rate = 1 } = {}) => {
    if (!canSpeak() || !text) return Promise.resolve();
    stopVoice();
    const queue = phrases(speakable(text));
    const voice = chosenVoice();
    return new Promise((resolve) => {
        const job = { resolve, cancelled: false, timer: setTimeout(settle, Math.max(5000, text.length * 150)) };   // never leave a script waiting on a voice that stalled
        pending = job;
        const next = (i) => {
            if (job.cancelled) return;
            if (i >= queue.length) { if (pending === job) settle(); return; }
            const u = new SpeechSynthesisUtterance(queue[i]);
            if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'en-IN';
            u.pitch = pitch;
            u.rate = rate;
            u.volume = 1;
            u.onend = () => next(i + 1);
            u.onerror = () => { if (pending === job) settle(); };
            try { synth.speak(u); } catch { if (pending === job) settle(); }
        };
        setTimeout(() => next(0), 60);       // browsers drop a line spoken in the same instant as a cancel
    });
};
