import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Send, Loader2, ImagePlus, X, Heading2, List, Sparkles, Eye, Pencil, Clock, RotateCcw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { createBlog, updateBlog, getBlogForEdit, uploadBlogCover } from '../api/blogs.js';
import { getLeadDashboard } from '../api/chapterLead.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import { colors, Card, SectionTitle, Pill, Button, fieldStyle, labelStyle, Empty } from '../components/chapterLead/ui.jsx';
import BlogBody from '../components/chapterLead/BlogBody.jsx';
import { ProgressRing, GoalStrip, Checklist, Journey, Tips, ToolButton, HeroArt, InkUnderline, PromptTyper, Burst } from '../components/chapterLead/BlogWriting.jsx';
import {
    toggleHeading, toggleBullets, countWords, readingMinutes, stageMessage, STARTER_OUTLINE, TOPIC_IDEAS,
} from '../components/chapterLead/blogText.js';

// Keep in step with MIN_BODY_CHARS_TO_SUBMIT in the backend blogController.
const MIN_CHARS = 400;

const EMPTY = { title: '', summary: '', body: '', cover_url: '' };
const DRAFT_KEY = 'rac_blog_draft_new';

const STATUS = {
    draft: { tone: 'gray', label: 'Draft' },
    pending: { tone: 'amber', label: 'Under review' },
    published: { tone: 'green', label: 'Published' },
    rejected: { tone: 'red', label: 'Needs changes' },
};

const BAR = { idle: '#CBD5E1', go: colors.primary, done: colors.green };

// A new blog is autosaved on this device only. It is a convenience, so every access is guarded.
const readDraft = () => {
    try {
        const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
        return d && (d.title || d.summary || d.body) ? d : null;
    } catch { return null; }
};
const writeDraft = (form) => {
    try {
        if (form.title || form.summary || form.body || form.cover_url) localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
        else localStorage.removeItem(DRAFT_KEY);
    } catch { /* storage unavailable: nothing to do */ }
};
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } };

const css = `
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes be-pop { 0% { transform: scale(0.96); opacity: 0.6; } 60% { transform: scale(1.04); } 100% { transform: scale(1); opacity: 1; } }
.be-page { background: #F1F5F9; min-height: 100vh; padding-bottom: 2rem; font-family: var(--font-sans); }
.be-wrap { max-width: 1320px; margin: 0 auto; padding: 0 clamp(0.75rem, 1.6vw, 1rem); }
.be-hero { background: linear-gradient(135deg, #002244 0%, #003366 60%, #005599 100%); padding: clamp(0.7rem, 1.4vw, 1rem) 0; position: relative; overflow: hidden; }
.be-hero::before { content: ''; position: absolute; top: -80px; right: -80px; width: 300px; height: 300px; border-radius: 50%; background: rgba(255,255,255,0.04); pointer-events: none; }
.be-hero::after { content: ''; position: absolute; bottom: -60px; left: -60px; width: 240px; height: 240px; border-radius: 50%; background: rgba(255,255,255,0.03); pointer-events: none; }
.be-hero .be-wrap { position: relative; z-index: 1; }
.be-art { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
.be-glyph { position: absolute; color: rgba(255,255,255,0.13); animation: be-float 9s ease-in-out infinite alternate; will-change: transform; transition: color 0.5s ease, filter 0.5s ease; }
.be-sheet { position: absolute; width: 112px; height: 144px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: repeating-linear-gradient(to bottom, transparent 0 14px, rgba(255,255,255,0.1) 14px 16px) 14px 24px / calc(100% - 28px) calc(100% - 48px) no-repeat, rgba(255,255,255,0.05); animation: be-drift 11s ease-in-out infinite alternate; will-change: transform; }
.be-trail path { stroke-dasharray: 6 8; animation: be-trail 3s linear infinite; transition: stroke 0.5s ease; }
.be-hero.writing .be-glyph { color: rgba(255,255,255,0.32); filter: drop-shadow(0 0 8px rgba(251,191,36,0.5)); }
.be-hero.writing .be-trail path { stroke: rgba(251,191,36,0.6); }
.be-underline path { stroke-dasharray: 1; stroke-dashoffset: 1; animation: be-draw 1.1s 0.3s ease forwards; }
.be-prompt { display: inline-flex; align-items: center; gap: 7px; margin-top: 0.5rem; max-width: 100%; padding: 0.2rem 0.75rem; border-radius: 100px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.16); color: #E2E8F0; font-size: 0.78rem; white-space: nowrap; overflow: hidden; min-height: 1.7rem; box-sizing: border-box; }
.be-prompt-label { color: rgba(255,255,255,0.6); font-weight: 600; flex-shrink: 0; }
.be-prompt strong { color: white; font-weight: 600; overflow: hidden; text-overflow: ellipsis; }
.be-caret { display: inline-block; flex-shrink: 0; width: 2px; height: 1em; background: #FBBF24; margin-left: -3px; animation: be-blink 1s steps(1) infinite; }
.be-burst { position: absolute; left: 50%; top: 50%; pointer-events: none; animation: be-burst 1.1s cubic-bezier(0.2, 0.7, 0.3, 1) forwards; }
@keyframes be-float { from { transform: translateY(0) rotate(-6deg); } to { transform: translateY(-14px) rotate(6deg); } }
@keyframes be-drift { from { transform: translateY(0) rotate(var(--r, 6deg)); } to { transform: translateY(-10px) rotate(calc(var(--r, 6deg) + 3deg)); } }
@keyframes be-trail { to { stroke-dashoffset: -56; } }
@keyframes be-draw { to { stroke-dashoffset: 0; } }
@keyframes be-blink { 50% { opacity: 0; } }
@keyframes be-burst { 0% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; } 100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.6) rotate(var(--rot)); opacity: 0; } }
@media (max-width: 640px) { .be-glyph:nth-of-type(n+4), .be-sheet { display: none; } .be-prompt-label { display: none; } }
@media (prefers-reduced-motion: reduce) {
  .be-glyph, .be-sheet, .be-trail path, .be-caret, .be-ready { animation: none !important; }
  .be-underline path { animation: none !important; stroke-dashoffset: 0; }
  .be-burst { display: none; }
}
.be-back { display: inline-flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.7); font-size: 0.8rem; font-weight: 600; text-decoration: none; margin-bottom: 0.35rem; }
.be-back:hover { color: white; }
.be-hero-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.be-h1 { margin: 0; font-size: clamp(1.25rem, 3vw, 1.6rem); font-weight: 800; color: white; }
.be-sub { margin: 0.5rem 0 0; max-width: 560px; font-size: 0.88rem; color: #CBD5E1; line-height: 1.55; }
.be-body { padding-top: 0.65rem; display: grid; gap: 0.65rem; }
.be-grid { display: grid; grid-template-columns: minmax(0, 1fr) 290px; gap: 0.65rem; align-items: start; }
.be-aside { display: grid; gap: 0.65rem; position: sticky; top: 84px; }
@media (max-width: 960px) { .be-grid { grid-template-columns: minmax(0, 1fr); } .be-aside { position: static; } }
.be-input:focus { border-color: #003366 !important; box-shadow: 0 0 0 3px rgba(0, 51, 102, 0.12); background: white !important; }
.be-chip { padding: 0.35rem 0.75rem; border-radius: 100px; border: 1px solid #BFDBFE; background: #EFF6FF; color: #1E40AF; font-size: 0.76rem; font-weight: 600; cursor: pointer; font-family: var(--font-sans); text-align: left; transition: background 0.15s, transform 0.15s; }
.be-chip:hover { background: #DBEAFE; transform: translateY(-1px); }
.be-tool:hover:not(:disabled) { background: #EFF6FF; border-color: #93C5FD; }
.be-drop { transition: background 0.15s, border-color 0.15s; }
.be-drop:hover, .be-drop.over { background: #EFF6FF; border-color: #003366; }
.be-ready { animation: be-pop 0.4s ease; }
.be-actions { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; padding-top: 0.85rem; border-top: 1px solid #F1F5F9; }
`;

/** Write or edit a blog. Save as a draft, or submit it for admin review. */
const BlogEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isCouncilMember, isAdmin } = useAuth();
    const { showToast } = useToast();
    const fileRef = useRef(null);
    const bodyRef = useRef(null);
    const titleRef = useRef(null);
    const errorRef = useRef(null);
    const saveRef = useRef(null);
    const typingTimer = useRef(null);
    const lastEdit = useRef(0); // when the lead last changed something, so a celebration only follows their own typing
    const wasReady = useRef(null);
    const baseline = useRef(JSON.stringify(EMPTY)); // what the server holds, to tell when there are unsaved changes

    const editing = Boolean(id);
    const [form, setForm] = useState(EMPTY);
    const [meta, setMeta] = useState(null); // { status, admin_notes, slug }
    const [loading, setLoading] = useState(editing);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [mode, setMode] = useState('write'); // write | preview
    const [dragging, setDragging] = useState(false);
    const [goal, setGoal] = useState(null);
    const [hydrated, setHydrated] = useState(editing);
    const [restored, setRestored] = useState(false);
    const [savedAt, setSavedAt] = useState(null);
    const [typing, setTyping] = useState(false); // true while the lead is typing; brightens the header art
    const [burst, setBurst] = useState(0);

    const isLead = !!isCouncilMember?.();
    const allowed = isLead || isAdmin?.();
    const locked = meta?.status === 'published' && !isAdmin?.();
    const dirty = JSON.stringify(form) !== baseline.current;
    const chars = form.body.trim().length;
    const titleOk = form.title.trim().length >= 5;
    const ready = titleOk && chars >= MIN_CHARS;

    // Called whenever the lead changes the text, so the header art can react.
    const noteEdit = () => {
        lastEdit.current = Date.now();
        setTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 1200);
    };
    useEffect(() => () => clearTimeout(typingTimer.current), []);

    // Celebrate the moment the blog becomes ready to submit, but only if the lead's own typing got it there
    // (not when an already-complete blog loads).
    useEffect(() => {
        if (wasReady.current === null) { wasReady.current = ready; return; }
        if (ready && !wasReady.current && Date.now() - lastEdit.current < 1500) setBurst((n) => n + 1);
        wasReady.current = ready;
    }, [ready]);

    useEffect(() => { document.title = `${editing ? 'Edit' : 'Write'} a blog | Risk AI Council`; }, [editing]);

    useEffect(() => {
        if (!editing || !allowed) return;
        let cancelled = false;
        getBlogForEdit(id)
            .then((res) => {
                if (cancelled) return;
                const b = res.data?.data;
                const loaded = { title: b.title || '', summary: b.summary || '', body: b.body || '', cover_url: b.cover_url || '' };
                baseline.current = JSON.stringify(loaded);
                setForm(loaded);
                setMeta({ status: b.status, admin_notes: b.admin_notes, slug: b.slug });
            })
            .catch((err) => { if (!cancelled) setError(getErrorMessage(err)); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [editing, id, allowed]);

    // The blog goal for the header (leads only; admins have no goal and the call is skipped).
    useEffect(() => {
        if (!isLead) return undefined;
        let cancelled = false;
        getLeadDashboard()
            .then((res) => {
                if (cancelled) return;
                const d = res.data?.data;
                const g = d?.goals?.find((x) => x.key === 'blogs');
                if (g) setGoal({ counted: Number(g.counted) || 0, target: Number(g.target) || 0, quarter: d.quarter?.label || '' });
            })
            .catch(() => { /* the header just shows no goal */ });
        return () => { cancelled = true; };
    }, [isLead]);

    // Bring back an unfinished new blog from this device.
    useEffect(() => {
        if (editing) return;
        const d = readDraft();
        if (d) {
            setForm({ title: d.title || '', summary: d.summary || '', body: d.body || '', cover_url: d.cover_url || '' });
            setRestored(true);
        }
        setHydrated(true);
    }, [editing]);

    // Autosave a new blog on this device as the lead types.
    useEffect(() => {
        if (editing || !hydrated) return undefined;
        const t = setTimeout(() => { writeDraft(form); setSavedAt(Date.now()); }, 700);
        return () => clearTimeout(t);
    }, [form, editing, hydrated]);

    // Closing the tab with unsaved edits to a saved blog.
    useEffect(() => {
        if (!editing || !dirty || saving) return undefined;
        const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [editing, dirty, saving]);

    // Make sure a validation message is seen even if the lead is at the top of a long page.
    useEffect(() => { if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [error]);

    const set = (key) => (e) => { setForm((p) => ({ ...p, [key]: e.target.value })); setError(''); noteEdit(); };

    const uploadCover = async (file) => {
        if (!file || locked) return;
        if (!file.type.startsWith('image/')) { setError('Please choose an image file for the cover.'); return; }
        if (file.size > 5 * 1024 * 1024) { setError('The cover image must be 5 MB or smaller.'); return; }
        setUploading(true);
        setError('');
        try {
            const fd = new FormData();
            fd.append('cover', file);
            const res = await uploadBlogCover(fd);
            setForm((p) => ({ ...p, cover_url: res.data?.data?.url || '' }));
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const handleCover = (e) => uploadCover(e.target.files?.[0]);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        uploadCover(e.dataTransfer?.files?.[0]);
    };

    // Apply a formatting helper to the current selection in the text box, then put the cursor back.
    const applyFormat = (fn) => {
        const el = bodyRef.current;
        if (!el || locked) return;
        const r = fn(el.value, el.selectionStart, el.selectionEnd);
        setForm((p) => ({ ...p, body: r.text }));
        setError('');
        noteEdit();
        requestAnimationFrame(() => { el.focus(); el.setSelectionRange(r.start, r.end); });
    };

    const insertOutline = () => {
        setForm((p) => ({ ...p, body: STARTER_OUTLINE }));
        noteEdit();
        requestAnimationFrame(() => bodyRef.current?.focus());
    };

    const pickIdea = (idea) => {
        setForm((p) => ({ ...p, title: idea }));
        noteEdit();
        requestAnimationFrame(() => titleRef.current?.focus());
    };

    const startFresh = () => {
        if (!window.confirm('Discard the draft restored from this device and start a new blog?')) return;
        clearDraft();
        setForm(EMPTY);
        setRestored(false);
        setSavedAt(null);
    };

    const save = async (submit) => {
        if (saving || uploading || locked || !allowed) return;
        setError('');
        if (form.title.trim().length < 5) { setError('Please give your blog a title (at least 5 characters).'); return; }
        if (submit && form.body.trim().length < MIN_CHARS) {
            setError(`A blog needs at least ${MIN_CHARS} characters before it can be submitted for review (you have ${form.body.trim().length}).`);
            return;
        }
        setSaving(true);
        try {
            const payload = {
                title: form.title.trim(),
                summary: form.summary.trim() || undefined,
                body: form.body,
                cover_url: form.cover_url || undefined,
                submit,
            };
            if (editing) await updateBlog(id, payload);
            else await createBlog(payload);
            clearDraft();
            baseline.current = JSON.stringify(form);
            showToast(submit ? 'Submitted for review. An admin will look at it soon.' : 'Draft saved.', 'success');
            navigate('/user/dashboard?tab=performance');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    // Ctrl/Cmd + S saves a draft. The ref always points at the latest `save`.
    useEffect(() => { saveRef.current = save; });
    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveRef.current?.(false); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    if (!allowed) {
        return (
            <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <Card style={{ maxWidth: 420, textAlign: 'center' }}>
                    <p style={{ margin: '0 0 1rem', color: colors.muted }}>Blogs can be written by Chapter Leads and Chapter Ambassadors. Join a chapter team to start writing.</p>
                    <Link to="/membership" style={{ color: colors.primary, fontWeight: 700 }}>See the chapter team roles</Link>
                </Card>
            </div>
        );
    }
    if (loading) {
        return <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} color={colors.faint} /></div>;
    }

    const words = countWords(form.body);
    const minutes = readingMinutes(words);
    const status = meta ? STATUS[meta.status] : null;
    const readiness = Math.round((titleOk ? 20 : 0) + 80 * Math.min(chars / MIN_CHARS, 1));
    const stage = stageMessage(chars, MIN_CHARS);
    const showIdeas = !editing && !locked && !form.title.trim();
    const cardPad = { padding: 'clamp(0.7rem, 1.4vw, 0.95rem)' };
    const savedLabel = editing
        ? (dirty ? 'You have unsaved changes' : 'All changes saved')
        : (savedAt
            ? `Autosaved on this device at ${new Date(savedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
            : 'Autosaves on this device as you type');

    return (
        <div className="be-page">
            <style>{css}</style>

            <header className={`be-hero${typing ? ' writing' : ''}`}>
                <HeroArt />
                <div className="be-wrap">
                    <Link to="/user/dashboard?tab=performance" className="be-back"><ArrowLeft size={14} /> Back to dashboard</Link>
                    <div className="be-hero-row">
                        <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <h1 className="be-h1">{editing ? 'Edit your blog' : 'Write a blog'}</h1>
                                    <InkUnderline />
                                </div>
                                {status && <Pill tone={status.tone}>{status.label}</Pill>}
                            </div>
                            <p className="be-sub">
                                {editing
                                    ? 'Polish it, then send it for review. Published blogs count toward your quarterly goal.'
                                    : 'Share what you know with the AI risk community. Published blogs count toward your quarterly goal.'}
                            </p>
                            {!editing && !locked && <PromptTyper />}
                        </div>
                        <GoalStrip goal={goal} />
                    </div>
                </div>
            </header>

            <div className="be-wrap be-body">
                {restored && !editing && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '0.55rem 0.85rem', color: '#1E3A8A', fontSize: '0.82rem' }}>
                        <span>Welcome back. We restored the blog you were writing on this device.</span>
                        <button type="button" onClick={startFresh} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#1E40AF', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                            <RotateCcw size={13} /> Start fresh
                        </button>
                    </div>
                )}
                {meta?.status === 'rejected' && meta.admin_notes && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: 10, padding: '0.6rem 0.85rem', fontSize: '0.84rem', lineHeight: 1.6 }}>
                        <strong>Reviewer notes:</strong> {meta.admin_notes}
                    </div>
                )}
                {locked && (
                    <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', borderRadius: 10, padding: '0.6rem 0.85rem', fontSize: '0.84rem' }}>
                        This blog is published, so only an admin can change it. Contact us if it needs an edit.
                    </div>
                )}

                <div className="be-grid">
                    {/* ── Editor ── */}
                    <main style={{ display: 'grid', gap: '0.65rem', minWidth: 0 }}>
                        <Card style={cardPad}>
                            <div style={{ display: 'grid', gap: '0.7rem' }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                                        <label htmlFor="bl-title" style={labelStyle}>Title</label>
                                        <span style={{ fontSize: '0.72rem', color: colors.faint }}>{form.title.length}/255</span>
                                    </div>
                                    <input id="bl-title" ref={titleRef} className="be-input" value={form.title} maxLength={255} onChange={set('title')} disabled={saving || locked} placeholder="A clear, specific headline" style={{ ...fieldStyle, fontSize: '1.1rem', fontWeight: 700, padding: '0.65rem 0.85rem' }} />
                                    {showIdeas && (
                                        <div style={{ marginTop: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', fontWeight: 700, color: colors.muted, marginBottom: 6 }}>
                                                <Sparkles size={13} color={colors.amber} /> Not sure where to start? Try one of these
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                {TOPIC_IDEAS.map((idea) => <button key={idea} type="button" className="be-chip" onClick={() => pickIdea(idea)}>{idea}</button>)}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                                        <label htmlFor="bl-summary" style={labelStyle}>Summary <span style={{ color: colors.faint, fontWeight: 400 }}>(shown on the blog list)</span></label>
                                        <span style={{ fontSize: '0.72rem', color: colors.faint }}>{form.summary.length}/500</span>
                                    </div>
                                    <textarea id="bl-summary" className="be-input" rows={2} value={form.summary} maxLength={500} onChange={set('summary')} disabled={saving || locked} placeholder="One or two sentences on what readers will learn" style={{ ...fieldStyle, resize: 'vertical' }} />
                                </div>

                                <div>
                                    <span style={labelStyle}>Cover image <span style={{ color: colors.faint, fontWeight: 400 }}>(optional)</span></span>
                                    {form.cover_url ? (
                                        <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                                            <img src={form.cover_url} alt="Cover preview" style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 10, border: `1px solid ${colors.border}`, display: 'block' }} />
                                            {!locked && (
                                                <button type="button" onClick={() => setForm((p) => ({ ...p, cover_url: '' }))} aria-label="Remove cover image"
                                                    style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'rgba(15,23,42,0.75)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <input ref={fileRef} type="file" accept="image/*" onChange={handleCover} disabled={uploading || saving || locked} style={{ display: 'none' }} id="bl-cover" />
                                            <label
                                                htmlFor="bl-cover"
                                                className={`be-drop${dragging ? ' over' : ''}`}
                                                onDragOver={(e) => { e.preventDefault(); if (!locked) setDragging(true); }}
                                                onDragLeave={() => setDragging(false)}
                                                onDrop={handleDrop}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.85rem 1rem', border: '1.5px dashed #94A3B8', borderRadius: 10, color: colors.muted, fontSize: '0.84rem', fontWeight: 600, cursor: uploading || locked ? 'not-allowed' : 'pointer', textAlign: 'center' }}
                                            >
                                                {uploading
                                                    ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Uploading…</>
                                                    : <><ImagePlus size={15} /> Drop an image here, or click to upload (max 5 MB)</>}
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>

                        <Card style={cardPad}>
                            <SectionTitle
                                right={(
                                    <div role="group" aria-label="Editor view" style={{ display: 'inline-flex', border: `1px solid ${colors.border}`, borderRadius: 100, overflow: 'hidden' }}>
                                        {[['write', 'Write', Pencil], ['preview', 'Preview', Eye]].map(([key, label, Icon]) => (
                                            <button
                                                key={key} type="button" aria-pressed={mode === key} onClick={() => setMode(key)}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.3rem 0.8rem', border: 'none', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700, fontFamily: 'var(--font-sans)', background: mode === key ? colors.primary : 'white', color: mode === key ? 'white' : colors.muted }}
                                            >
                                                <Icon size={13} /> {label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            >
                                <label htmlFor="bl-body" style={{ cursor: 'pointer' }}>Your blog</label>
                            </SectionTitle>

                            {mode === 'write' ? (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                                        <ToolButton icon={Heading2} label="Heading" title="Turn this line into a section heading" disabled={locked} onClick={() => applyFormat((v, s) => toggleHeading(v, s))} />
                                        <ToolButton icon={List} label="Bullets" title="Turn the selected lines into a bullet list" disabled={locked} onClick={() => applyFormat(toggleBullets)} />
                                        {!form.body.trim() && !locked && <ToolButton icon={Sparkles} label="Starter outline" title="Start from a simple outline" onClick={insertOutline} />}
                                        <span style={{ fontSize: '0.72rem', color: colors.faint, marginLeft: 'auto' }}>Blank line = new paragraph</span>
                                    </div>
                                    <textarea
                                        id="bl-body" ref={bodyRef} className="be-input" rows={16} value={form.body} onChange={set('body')} disabled={saving || locked}
                                        placeholder={'Start writing…\n\n## A section heading\n\nA paragraph of text.\n\n- A bullet point\n- Another bullet point'}
                                        style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.7, fontSize: '0.95rem', minHeight: 300 }}
                                    />
                                </>
                            ) : (
                                <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 'clamp(0.85rem, 2vw, 1.25rem)', background: 'white', minHeight: 300 }}>
                                    {form.cover_url && <img src={form.cover_url} alt="" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 10, marginBottom: '1rem' }} />}
                                    <h2 style={{ margin: '0 0 0.5rem', fontSize: 'clamp(1.3rem, 3vw, 1.7rem)', fontWeight: 800, color: colors.text, lineHeight: 1.25 }}>{form.title.trim() || 'Your headline appears here'}</h2>
                                    {form.summary.trim() && <p style={{ margin: '0 0 1rem', fontSize: '1rem', color: colors.muted, lineHeight: 1.6 }}>{form.summary.trim()}</p>}
                                    {form.body.trim() ? <BlogBody text={form.body} /> : <Empty>Nothing to preview yet. Write a few lines and they will show up here the way readers will see them.</Empty>}
                                </div>
                            )}

                            <div style={{ marginTop: 10 }}>
                                <div style={{ height: 6, borderRadius: 100, background: '#E2E8F0', overflow: 'hidden' }} aria-hidden="true">
                                    <div style={{ width: `${Math.min(100, (chars / MIN_CHARS) * 100)}%`, height: '100%', background: BAR[stage.tone], borderRadius: 100, transition: 'width 0.3s ease, background 0.3s ease' }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginTop: 6, fontSize: '0.76rem' }}>
                                    <span style={{ color: stage.tone === 'done' ? colors.green : colors.muted, fontWeight: 600 }}>{stage.text}</span>
                                    <span style={{ color: colors.faint, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                        <Clock size={12} />
                                        {words.toLocaleString('en-US')} word{words === 1 ? '' : 's'}{minutes > 0 ? ` · ${minutes} min read` : ''} · {chars.toLocaleString('en-US')} characters{chars < MIN_CHARS ? ` (${MIN_CHARS} needed to submit)` : ''}
                                    </span>
                                </div>
                            </div>

                            {error && (
                                <div ref={errorRef} role="alert" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', borderRadius: 8, padding: '0.6rem 0.85rem', margin: '0.85rem 0 0', fontSize: '0.84rem' }}>{error}</div>
                            )}

                            {!locked && (
                                <div className="be-actions" style={{ marginTop: '0.85rem' }}>
                                    <span style={{ fontSize: '0.76rem', color: dirty && editing ? colors.amber : colors.faint, fontWeight: 600 }}>
                                        {savedLabel}<span style={{ fontWeight: 400 }}> · Ctrl+S saves a draft</span>
                                    </span>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        <Button tone="ghost" disabled={saving || uploading} onClick={() => save(false)}>
                                            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />} Save draft
                                        </Button>
                                        <span key={ready ? 'ready' : 'not-ready'} className={ready ? 'be-ready' : undefined} style={{ display: 'inline-flex' }}>
                                            <Button tone={ready ? 'success' : 'primary'} disabled={saving || uploading} onClick={() => save(true)}>
                                                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />} Submit for review
                                            </Button>
                                        </span>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </main>

                    {/* ── Guide ── */}
                    <aside className="be-aside">
                        <Card style={cardPad}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.9rem' }}>
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <ProgressRing percent={readiness} done={ready} />
                                    <Burst id={burst} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: ready ? colors.green : colors.text }}>{ready ? 'Ready to submit' : 'Getting there'}</div>
                                    <div style={{ fontSize: '0.76rem', color: colors.muted, lineHeight: 1.45 }}>
                                        {ready ? 'Nice work. Preview it once, then send it in.' : 'Finish the two required steps below.'}
                                    </div>
                                </div>
                            </div>
                            <Checklist
                                items={[
                                    { label: 'Add a title', done: titleOk, hint: 'At least 5 characters' },
                                    { label: 'Write your blog', done: chars >= MIN_CHARS, hint: `${Math.min(chars, MIN_CHARS)} of ${MIN_CHARS} characters` },
                                    { label: 'Add a summary', done: form.summary.trim().length > 0, bonus: true, hint: 'Shown on the blog list' },
                                    { label: 'Add a cover image', done: !!form.cover_url, bonus: true, hint: 'Makes it stand out' },
                                ]}
                            />
                        </Card>

                        <Card style={cardPad}>
                            <SectionTitle>What happens next</SectionTitle>
                            <Journey status={meta?.status} />
                            <p style={{ margin: '0.8rem 0 0', fontSize: '0.74rem', color: colors.muted, lineHeight: 1.55 }}>
                                An admin reviews every blog before it goes public. Only published blogs count toward your quarterly goal.
                            </p>
                        </Card>

                        <Card style={cardPad}>
                            <SectionTitle>Writing tips</SectionTitle>
                            <Tips />
                        </Card>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default BlogEditor;
