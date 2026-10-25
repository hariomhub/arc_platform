/**
 * portalService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * What the chapter-team dashboard needs besides the programme numbers:
 *
 *   The tour video       one video an administrator sets (a YouTube / Vimeo link, a direct link to a
 *                        video file, or an uploaded file) that every Chapter Lead and Chapter Ambassador
 *                        sees on their dashboard. Stored in app_settings under 'team_tour'.
 *   Referral counts      how many people joined with the member's code.
 *   Setup signals        the few facts the "Get started" checklist needs (has the person posted yet,
 *                        have they chosen what shows on the public chapter page).
 *
 * Embeds are rebuilt from the video id on the server, never taken as pasted, so a stored value can only
 * ever point at youtube.com / player.vimeo.com (what the Content-Security-Policy allows) or at a plain file.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';
import { uploadToBlob, deleteFromBlob, getBlobSasUrl } from './azureBlobService.js';
import { recordAudit } from './auditService.js';
import { teamError, isMissingSchema } from './chapterLeadService.js';

const TOUR_KEY = 'team_tour';
const FILE_EXTENSIONS = /\.(mp4|webm|m4v|mov|ogv)$/i;
const UPLOAD_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
export const TOUR_UPLOAD_LIMIT_BYTES = 100 * 1024 * 1024;   // longer videos belong on YouTube / Vimeo
const SAS_HOURS = 4;

const WRONG_LINK = 'Use a YouTube or Vimeo link, or a direct https link to an .mp4 or .webm file.';

// ── The link, understood ─────────────────────────────────────────────────────

const youtubeId = (u) => {
    const host = u.hostname.replace(/^www\.|^m\./, '');
    let id = null;
    if (host === 'youtu.be') id = u.pathname.split('/')[1];
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
        const [, first, second] = u.pathname.split('/');
        if (first === 'watch') id = u.searchParams.get('v');
        else if (['embed', 'shorts', 'live', 'v'].includes(first)) id = second;
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
};

const vimeoParts = (u) => {
    const host = u.hostname.replace(/^www\./, '');
    if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;
    const parts = u.pathname.split('/').filter(Boolean);
    const at = parts.findIndex((p) => /^\d+$/.test(p));
    if (at < 0) return null;
    // vimeo.com/123456/abcdef0123 (unlisted) carries a privacy hash; keep it
    const hash = u.searchParams.get('h') || (/^[0-9a-f]{6,}$/i.test(parts[at + 1] || '') ? parts[at + 1] : null);
    return { id: parts[at], hash };
};

/** Turns whatever an admin pasted into { kind: 'embed'|'file', provider, src }, or says what is wrong. */
export const parseTourLink = (raw) => {
    let u;
    try { u = new URL(String(raw || '').trim()); } catch { throw teamError(422, WRONG_LINK); }
    if (u.protocol !== 'https:') throw teamError(422, 'The video link must start with https://.');

    const yt = youtubeId(u);
    if (yt) return { kind: 'embed', provider: 'youtube', src: `https://www.youtube.com/embed/${yt}?rel=0&modestbranding=1` };

    const vm = vimeoParts(u);
    if (vm) return { kind: 'embed', provider: 'vimeo', src: `https://player.vimeo.com/video/${vm.id}${vm.hash ? `?h=${vm.hash}` : ''}` };

    if (FILE_EXTENSIONS.test(u.pathname)) return { kind: 'file', provider: 'file', src: u.toString() };
    throw teamError(422, WRONG_LINK);
};

const cleanText = (value, max, label) => {
    const s = value === undefined || value === null ? '' : String(value).trim();
    if (s.length > max) throw teamError(422, `${label} must be ${max} characters or fewer.`);
    return s || null;
};

// ── Storage ──────────────────────────────────────────────────────────────────

const readSetting = async () => {
    try {
        const [[row]] = await pool.query(
            `SELECT s.value_json, s.updated_at, u.name AS updated_by_name
             FROM app_settings s LEFT JOIN users u ON u.id = s.updated_by WHERE s.setting_key = ?`,
            [TOUR_KEY],
        );
        if (!row) return null;
        const value = typeof row.value_json === 'string' ? JSON.parse(row.value_json) : row.value_json;
        return { ...value, updated_at: row.updated_at, updated_by_name: row.updated_by_name };
    } catch (err) {
        if (isMissingSchema(err)) return null;   // migration 0024 not applied yet: no video, nothing breaks
        throw err;
    }
};

const writeSetting = async (actor, value) => {
    await pool.query(
        `INSERT INTO app_settings (setting_key, value_json, updated_by) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_by = VALUES(updated_by)`,
        [TOUR_KEY, JSON.stringify(value), actor.id],
    );
};

/** What a page may show: for an uploaded file the stored blob address becomes a short-lived signed link. */
const present = (value) => {
    if (!value) return null;
    const src = value.source === 'upload' ? getBlobSasUrl(value.blob_url, SAS_HOURS, true) : value.src;
    // `version` changes whenever the video is replaced, so "I watched it" can reset for the new one.
    const version = value.updated_at ? new Date(value.updated_at).getTime() : null;
    return { kind: value.kind, provider: value.provider, src, title: value.title, description: value.description, version };
};

// ── Reads ────────────────────────────────────────────────────────────────────

/** For the member dashboard. Null when no video has been set. */
export const getTourForMember = async () => present(await readSetting());

/** For the admin screen: the same plus where it came from and who set it. */
export const getTourForAdmin = async () => {
    const value = await readSetting();
    if (!value) return null;
    return {
        ...present(value),
        source: value.source,
        original_url: value.source === 'link' ? value.original_url : null,
        file_name: value.source === 'upload' ? value.file_name : null,
        updated_at: value.updated_at,
        updated_by_name: value.updated_by_name,
    };
};

// ── Admin writes ─────────────────────────────────────────────────────────────

const forget = async (previous) => {
    if (previous?.source === 'upload' && previous.blob_url) await deleteFromBlob(previous.blob_url);
};

export const saveTourLink = async (actor, { url, title, description }, ip = null) => {
    const parsed = parseTourLink(url);
    const previous = await readSetting();
    const value = {
        source: 'link', original_url: String(url).trim().slice(0, 500), ...parsed,
        title: cleanText(title, 120, 'The title') || 'How to use your dashboard',
        description: cleanText(description, 500, 'The description'),
    };
    await writeSetting(actor, value);
    await forget(previous);
    await recordAudit(pool, {
        actor, action: 'portal.tour_set', entityType: 'app_setting', entityId: null,
        before: previous ? { source: previous.source, title: previous.title } : null,
        after: { source: 'link', provider: parsed.provider, title: value.title }, ip,
    });
    return getTourForAdmin();
};

export const saveTourUpload = async (actor, file, { title, description }, ip = null) => {
    if (!file?.buffer?.length) throw teamError(422, 'Choose a video file to upload.');
    if (!UPLOAD_TYPES.includes(file.mimetype)) throw teamError(422, 'Upload an .mp4, .webm or .mov video, or paste a YouTube or Vimeo link instead.');
    const previous = await readSetting();
    const blobUrl = await uploadToBlob('team/tour', file.originalname || 'tour.mp4', file.buffer, file.mimetype, { private: true });
    const value = {
        source: 'upload', blob_url: blobUrl, file_name: String(file.originalname || 'tour').slice(0, 200),
        kind: 'file', provider: 'file',
        title: cleanText(title, 120, 'The title') || 'How to use your dashboard',
        description: cleanText(description, 500, 'The description'),
    };
    await writeSetting(actor, value);
    await forget(previous);
    await recordAudit(pool, {
        actor, action: 'portal.tour_set', entityType: 'app_setting', entityId: null,
        before: previous ? { source: previous.source, title: previous.title } : null,
        after: { source: 'upload', title: value.title }, ip,
    });
    return getTourForAdmin();
};

/** Changes only the title and description of the video that is already set. */
export const updateTourText = async (actor, { title, description }, ip = null) => {
    const previous = await readSetting();
    if (!previous) throw teamError(404, 'There is no tour video to edit yet.');
    const { updated_at: _a, updated_by_name: _b, ...stored } = previous;
    const value = {
        ...stored,
        title: cleanText(title, 120, 'The title') || stored.title,
        description: cleanText(description, 500, 'The description'),
    };
    await writeSetting(actor, value);
    await recordAudit(pool, {
        actor, action: 'portal.tour_edited', entityType: 'app_setting', entityId: null,
        before: { title: stored.title }, after: { title: value.title }, ip,
    });
    return getTourForAdmin();
};

export const removeTour = async (actor, ip = null) => {
    const previous = await readSetting();
    if (!previous) return null;
    await pool.query('DELETE FROM app_settings WHERE setting_key = ?', [TOUR_KEY]);
    await forget(previous);
    await recordAudit(pool, {
        actor, action: 'portal.tour_removed', entityType: 'app_setting', entityId: null,
        before: { source: previous.source, title: previous.title }, ip,
    });
    return null;
};

// ── What the checklist needs ─────────────────────────────────────────────────

/** How many people joined with this member's own code. */
export const getReferralCounts = async (userId) => {
    const [rows] = await pool.query(
        'SELECT status, COUNT(*) AS n FROM referrals WHERE lead_user_id = ? GROUP BY status',
        [userId],
    );
    const by = Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
    const qualified = by.qualified || 0;
    const pending = by.pending || 0;
    return { total: qualified + pending, qualified, pending };
};

/** Facts for the "Get started" checklist. Each is a plain yes/no about something the person can still do. */
export const getSetupSignals = async (userId) => {
    const [[posts]] = await pool.query('SELECT COUNT(*) AS n FROM feed_posts WHERE author_id = ? AND is_hidden = 0', [userId]);
    let displaySaved = false;
    try {
        const [[d]] = await pool.query('SELECT COUNT(*) AS n FROM member_display_settings WHERE user_id = ?', [userId]);
        displaySaved = Number(d.n) > 0;
    } catch (err) {
        if (!isMissingSchema(err)) throw err;
    }
    return { has_posted: Number(posts.n) > 0, display_saved: displaySaved };
};
