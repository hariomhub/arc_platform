import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Megaphone, Save, RotateCcw, Undo2 } from 'lucide-react';
import ConfirmDialog from '../../common/ConfirmDialog.jsx';
import { getOutreachKitAdmin, saveOutreachKit, resetOutreachKit } from '../../../api/adminChapterLeads.js';
import { getErrorMessage } from '../../../utils/apiHelpers.js';
import { colors, Card, SectionTitle, Pill, Button, Banner, Segmented, fieldStyle, labelStyle, fmtDate } from '../../chapterLead/ui.jsx';
import { ErrorNote, Spinner } from './shared.jsx';
import { renderMessage, tokenNames } from '../../../utils/outreachKit.js';

const TIER_LABELS = { lead: 'Chapter Lead', ambassador: 'Chapter Ambassador' };
const AUDIENCE_LABELS = { vendor: 'Vendor', enthusiast: 'Tech enthusiast' };
const NOT_IN_MESSAGES = ['etiquette', 'rhythm'];

const SAMPLE = {
    first_name: 'Priya', company: 'Acme AI', topic: 'model risk', month: 'January', free_link: 'https://www.riskaicouncil.org/resources',
    your_name: 'Asha Rao', chapter: 'Mumbai', code: 'RAC-AB12CD', link: 'https://www.riskaicouncil.org/register?ref=RAC-AB12CD',
};

// ── Drafts: lists are edited as one line per item ────────────────────────────

const lines = (v) => String(v ?? '').split('\n').map((x) => x.trim()).filter(Boolean);

const toDraft = (meta, value) => {
    switch (meta.shape) {
        case 'audienceList': return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, v.join('\n')]));
        case 'list': return value.join('\n');
        case 'tier':
        case 'audience': return { ...value };
        default: return value;
    }
};

const fromDraft = (meta, draft) => {
    switch (meta.shape) {
        case 'audienceList': return Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, lines(v)]));
        case 'list': return lines(draft);
        case 'tier':
        case 'audience': return Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, String(v).trim()]));
        default: return String(draft).trim();
    }
};

const draftOf = (kit) => ({
    blocks: Object.fromEntries(kit.block_meta.map((m) => [m.name, toDraft(m, kit.blocks[m.name])])),
    templates: Object.fromEntries(kit.templates.map((t) => [t.id, { body: t.body, subject: t.subject ?? '', hint: t.hint ?? '' }])),
});

const defaultDraftOf = (kit) => ({
    blocks: Object.fromEntries(kit.block_meta.map((m) => [m.name, toDraft(m, kit.default_blocks[m.name])])),
    templates: Object.fromEntries(kit.templates.map((t) => [t.id, { body: t.default_body, subject: t.default_subject ?? '', hint: t.default_hint ?? '' }])),
});

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** All the text inside a block's draft, as one string (to look for placeholders in it). */
const textsOf = (value) => (typeof value === 'string' ? value : Object.values(value).map(textsOf).join('\n'));

/** True when any part of a block is empty (the server would refuse it). */
const hasEmptyPart = (meta, draftValue) => {
    const v = fromDraft(meta, draftValue);
    if (typeof v === 'string') return !v;
    if (Array.isArray(v)) return v.length === 0;
    return Object.values(v).some((x) => (typeof x === 'string' ? !x : x.length === 0));
};

// ── The screen ───────────────────────────────────────────────────────────────

/**
 * Admin → Chapter Leads → Outreach kit. The words of the invitation messages that Chapter Leads and Chapter
 * Ambassadors copy from their dashboard. Everything starts as the default wording; change any message or shared
 * sentence and save, and it is live on every dashboard at once. "Reset" puts one piece (or all of it) back to the
 * default. The preview below each message is built the way a member's screen builds it.
 */
const OutreachKitManager = ({ showToast }) => {
    const [kit, setKit] = useState(null);
    const [draft, setDraft] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [confirmAll, setConfirmAll] = useState(false);
    const [tier, setTier] = useState('lead');
    const [audience, setAudience] = useState('vendor');
    const [connected, setConnected] = useState(false);

    const adopt = useCallback((next) => { setKit(next); setDraft(draftOf(next)); setError(''); }, []);

    const load = useCallback(async () => {
        try {
            const res = await getOutreachKitAdmin();
            adopt(res.data?.data);
        } catch (err) {
            setError(getErrorMessage(err));
        }
    }, [adopt]);

    useEffect(() => { load(); }, [load]);

    const saved = useMemo(() => (kit ? draftOf(kit) : null), [kit]);
    const defaults = useMemo(() => (kit ? defaultDraftOf(kit) : null), [kit]);
    const metaByName = useMemo(() => Object.fromEntries((kit?.block_meta || []).map((m) => [m.name, m])), [kit]);

    // What the shared blocks currently say in the draft, in the shape the preview needs.
    const draftBlocks = useMemo(() => {
        if (!kit || !draft) return {};
        return Object.fromEntries(kit.block_meta.map((m) => [m.name, fromDraft(m, draft.blocks[m.name])]));
    }, [kit, draft]);

    const variableNames = useMemo(() => (kit?.variables || []).map((v) => v.name), [kit]);

    // Problems that would stop the server saving, found here first so they can be shown next to the text.
    const problems = useMemo(() => {
        const out = {};
        if (!kit || !draft) return out;
        const blockNames = kit.block_meta.map((m) => m.name).filter((n) => !NOT_IN_MESSAGES.includes(n));
        const unknown = (text, allowBlocks) => [...new Set(tokenNames(text))].filter((n) => !variableNames.includes(n) && !(allowBlocks && blockNames.includes(n)));
        kit.templates.forEach((t) => {
            const d = draft.templates[t.id];
            const list = [];
            const bad = unknown(`${d.body}\n${d.subject}`, true);
            if (bad.length) list.push(`{{${bad.join('}}, {{')}} ${bad.length > 1 ? 'do' : 'does'} not exist.`);
            if (!d.body.trim()) list.push('The message cannot be empty.');
            if (t.needs_link && !tokenNames(d.body).some((n) => n === 'link' || n === 'signup')) list.push('It must keep {{link}} (or {{signup}}), so people can join.');
            if (d.body.length > 3500) list.push('It is over 3,500 characters.');
            if (list.length) out[`t:${t.id}`] = list;
        });
        kit.block_meta.forEach((m) => {
            const raw = textsOf(draft.blocks[m.name]);
            const list = [];
            const bad = unknown(raw, false);
            if (bad.length) list.push(`{{${bad.join('}}, {{')}} ${bad.length > 1 ? 'do' : 'does'} not exist here. A shared sentence can use the variables, not other shared sentences.`);
            if (m.name === 'signup' && !tokenNames(raw).includes('link')) list.push('It must contain {{link}}.');
            if (hasEmptyPart(m, draft.blocks[m.name])) list.push('None of its parts can be empty.');
            if (list.length) out[`b:${m.name}`] = list;
        });
        return out;
    }, [kit, draft, variableNames]);

    if (!kit || !draft) return error ? <ErrorNote>{error}</ErrorNote> : <Spinner />;

    const blockChanged = (name) => !same(fromDraft(metaByName[name], draft.blocks[name]), fromDraft(metaByName[name], defaults.blocks[name]));
    const templateChanged = (id) => !same(draft.templates[id], defaults.templates[id]);
    const dirty = !same(draft, saved);
    const customCount = kit.block_meta.filter((m) => blockChanged(m.name)).length + kit.templates.filter((t) => templateChanged(t.id)).length;
    const hasProblems = Object.keys(problems).length > 0;

    const setBlock = (name, value) => setDraft((d) => ({ ...d, blocks: { ...d.blocks, [name]: value } }));
    const setTemplate = (id, patch) => setDraft((d) => ({ ...d, templates: { ...d.templates, [id]: { ...d.templates[id], ...patch } } }));

    // Only what differs from the defaults is sent; the server stores just that.
    const payload = () => {
        const blocks = {};
        kit.block_meta.forEach((m) => { if (blockChanged(m.name)) blocks[m.name] = fromDraft(m, draft.blocks[m.name]); });
        const templates = {};
        kit.templates.forEach((t) => {
            const d = draft.templates[t.id];
            const base = defaults.templates[t.id];
            const out = {};
            if (d.body.trim() !== base.body) out.body = d.body;
            if (t.subject !== null && d.subject.trim() !== base.subject) out.subject = d.subject;
            if (d.hint.trim() !== base.hint) out.hint = d.hint;
            if (Object.keys(out).length) templates[t.id] = out;
        });
        return { blocks, templates, based_on: kit.updated_at || undefined };
    };

    const run = async (fn, message) => {
        setBusy(true);
        try {
            const res = await fn();
            adopt(res.data?.data);
            showToast?.(message, 'success');
        } catch (err) {
            const text = getErrorMessage(err);
            setError(text);
            showToast?.(text, 'error');
        } finally {
            setBusy(false);
        }
    };

    const save = () => {
        const body = payload();
        if (JSON.stringify(body).length > 90000) { showToast?.('That is too much changed text for one save. Reset some of it to the default first.', 'warning'); return; }
        run(() => saveOutreachKit(body), 'The outreach kit is updated on every dashboard.');
    };

    // ── Preview ──
    const ctx = { tier, audience, connected, vars: { ...SAMPLE, role: TIER_LABELS[tier] } };
    const previewOf = (t) => {
        try {
            const d = draft.templates[t.id];
            return renderMessage({ ...t, body: d.body, subject: t.subject !== null ? d.subject : null }, draftBlocks, ctx);
        } catch {
            return { subject: '', body: '', missing: [] };
        }
    };

    const area = (value, onChange, rows, id) => (
        <textarea id={id} value={value} rows={rows} onChange={(e) => onChange(e.target.value)} disabled={busy} style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.55 }} />
    );

    const blockEditor = (m) => {
        const d = draft.blocks[m.name];
        const id = (k) => `kb-${m.name}-${k}`;
        const one = (k, label, rows) => (
            <div key={k}>
                <label htmlFor={id(k)} style={labelStyle}>{label}</label>
                {area(d[k], (v) => setBlock(m.name, { ...d, [k]: v }), rows, id(k))}
            </div>
        );
        if (m.shape === 'tier') return <div style={{ display: 'grid', gap: 8 }}>{Object.keys(d).map((k) => one(k, TIER_LABELS[k] || k, 2))}</div>;
        if (m.shape === 'audience') return <div style={{ display: 'grid', gap: 8 }}>{Object.keys(d).map((k) => one(k, AUDIENCE_LABELS[k] || k, 2))}</div>;
        if (m.shape === 'audienceList') return <div style={{ display: 'grid', gap: 8 }}>{Object.keys(d).map((k) => one(k, `${AUDIENCE_LABELS[k] || k}: one point per line`, 5))}</div>;
        if (m.shape === 'list') return (
            <div>
                <label htmlFor={id('x')} style={labelStyle}>One per line</label>
                {area(d, (v) => setBlock(m.name, v), 6, id('x'))}
            </div>
        );
        return (
            <div>
                <label htmlFor={id('x')} style={labelStyle}>Text</label>
                {area(d, (v) => setBlock(m.name, v), 3, id('x'))}
            </div>
        );
    };

    const summaryStyle = { cursor: 'pointer', fontWeight: 700, fontSize: '0.86rem', color: colors.text, padding: '0.55rem 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            {error && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 220 }}><ErrorNote>{error}</ErrorNote></div>
                    <Button small tone="ghost" onClick={load} disabled={busy}><RotateCcw size={13} /> Reload what is saved</Button>
                </div>
            )}

            <Card>
                <SectionTitle icon={Megaphone} right={customCount ? <Pill tone="amber">{customCount} changed from the default</Pill> : <Pill tone="gray">Default wording</Pill>}>Outreach kit</SectionTitle>
                <p style={{ margin: '0 0 0.6rem', fontSize: '0.82rem', color: colors.muted, lineHeight: 1.6, maxWidth: 760 }}>
                    The messages Chapter Leads and Chapter Ambassadors copy from their dashboard, under their referral code, to invite people they know. Each message is filled in with the
                    sender&rsquo;s own name, role, chapter, referral code and sign-up link, and with the first name (and company) they type in. Change any wording below and save: it is live on every
                    dashboard straight away. Anything you leave alone follows the default.
                </p>
                <p style={{ margin: 0, fontSize: '0.78rem', color: colors.faint }}>
                    {kit.updated_at ? `Last saved by ${kit.updated_by_name || 'an administrator'}, ${fmtDate(kit.updated_at)}.` : 'Nothing has been changed yet.'}
                </p>

                <details style={{ marginTop: '0.8rem' }}>
                    <summary style={{ ...summaryStyle, color: colors.primary }}>What you can put between double curly brackets</summary>
                    <div style={{ display: 'grid', gap: 4, fontSize: '0.8rem', color: colors.muted, lineHeight: 1.55, padding: '0.2rem 0 0.4rem' }}>
                        {kit.variables.map((v) => (
                            <div key={v.name}><code style={{ background: '#F1F5F9', padding: '1px 6px', borderRadius: 6, color: colors.text }}>{`{{${v.name}}}`}</code> {v.label}, from {v.source}.</div>
                        ))}
                        <div style={{ marginTop: 4 }}>
                            In a message you can also use the shared sentences below by name, for example <code style={{ background: '#F1F5F9', padding: '1px 6px', borderRadius: 6, color: colors.text }}>{'{{benefits}}'}</code>:
                            they change with the sender&rsquo;s role and with who the message is for. A shared sentence can use the variables but not other shared sentences.
                            Messages that bring people to the site must keep <code style={{ background: '#F1F5F9', padding: '1px 6px', borderRadius: 6, color: colors.text }}>{'{{link}}'}</code> (or <code style={{ background: '#F1F5F9', padding: '1px 6px', borderRadius: 6, color: colors.text }}>{'{{signup}}'}</code>).
                        </div>
                    </div>
                </details>

                <div style={{ display: 'flex', gap: '0.9rem 1.4rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.6rem', padding: '0.7rem 0.9rem', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12 }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Preview as</span>
                    <Segmented ariaLabel="Preview as" value={tier} onChange={setTier} options={[{ value: 'lead', label: 'Chapter Lead' }, { value: 'ambassador', label: 'Chapter Ambassador' }]} />
                    <Segmented ariaLabel="Writing to" value={audience} onChange={setAudience} options={[{ value: 'vendor', label: 'Vendor' }, { value: 'enthusiast', label: 'Tech enthusiast' }]} />
                    <Segmented ariaLabel="Already connected" value={connected ? 'yes' : 'no'} onChange={(v) => setConnected(v === 'yes')} options={[{ value: 'no', label: 'Not connected' }, { value: 'yes', label: 'Connected' }]} />
                </div>
            </Card>

            <Card>
                <SectionTitle>Shared sentences</SectionTitle>
                <p style={{ margin: '0 0 0.4rem', fontSize: '0.8rem', color: colors.muted, lineHeight: 1.6 }}>
                    Written once and used in many messages. Change what a member gets, or how to sign up, here and every message that uses it follows.
                </p>
                {kit.block_meta.map((m) => (
                    <details key={m.name} style={{ borderTop: `1px solid ${colors.border}` }}>
                        <summary style={summaryStyle}>
                            <span>{m.label}</span>
                            <code style={{ fontSize: '0.7rem', background: '#F1F5F9', padding: '1px 6px', borderRadius: 6, color: colors.muted }}>{NOT_IN_MESSAGES.includes(m.name) ? 'shown under the message' : `{{${m.name}}}`}</code>
                            {blockChanged(m.name) && <Pill tone="amber">Changed</Pill>}
                            {problems[`b:${m.name}`] && <Pill tone="red">Fix this</Pill>}
                        </summary>
                        <div style={{ paddingBottom: '0.9rem', display: 'grid', gap: 8 }}>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: colors.muted }}>{m.help}</p>
                            {blockEditor(m)}
                            {(problems[`b:${m.name}`] || []).map((p) => <div key={p} style={{ fontSize: '0.78rem', color: colors.red }}>{p}</div>)}
                            {blockChanged(m.name) && (
                                <div><Button small tone="ghost" disabled={busy} onClick={() => setBlock(m.name, defaults.blocks[m.name])}><Undo2 size={13} /> Put back the default</Button></div>
                            )}
                        </div>
                    </details>
                ))}
            </Card>

            {kit.groups.map((g) => {
                const list = kit.templates.filter((t) => t.group === g.id);
                return (
                    <Card key={g.id}>
                        <SectionTitle>{g.label}</SectionTitle>
                        {list.map((t) => {
                            const d = draft.templates[t.id];
                            const pv = previewOf(t);
                            const variant = [t.tier && TIER_LABELS[t.tier], t.audience && AUDIENCE_LABELS[t.audience]].filter(Boolean).join(' to ');
                            const over = t.limit && pv.body.length > t.limit;
                            const issues = problems[`t:${t.id}`] || [];
                            return (
                                <details key={t.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                                    <summary style={summaryStyle}>
                                        <span>{t.title}</span>
                                        {variant && <Pill tone="blue">{variant}</Pill>}
                                        {templateChanged(t.id) && <Pill tone="amber">Changed</Pill>}
                                        {issues.length > 0 && <Pill tone="red">Fix this</Pill>}
                                    </summary>
                                    <div style={{ paddingBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: '1rem', alignItems: 'start' }}>
                                        <div style={{ display: 'grid', gap: 8 }}>
                                            {t.subject !== null && (
                                                <div>
                                                    <label htmlFor={`ks-${t.id}`} style={labelStyle}>Subject</label>
                                                    <input id={`ks-${t.id}`} value={d.subject} onChange={(e) => setTemplate(t.id, { subject: e.target.value })} style={fieldStyle} disabled={busy} maxLength={160} />
                                                </div>
                                            )}
                                            <div>
                                                <label htmlFor={`kb-${t.id}`} style={labelStyle}>Message</label>
                                                {area(d.body, (v) => setTemplate(t.id, { body: v }), Math.min(16, Math.max(6, d.body.split('\n').length + 1)), `kb-${t.id}`)}
                                            </div>
                                            <div>
                                                <label htmlFor={`kh-${t.id}`} style={labelStyle}>Note shown under the message (optional)</label>
                                                <input id={`kh-${t.id}`} value={d.hint} onChange={(e) => setTemplate(t.id, { hint: e.target.value })} style={fieldStyle} disabled={busy} maxLength={300} />
                                            </div>
                                            {issues.map((p) => <div key={p} style={{ fontSize: '0.78rem', color: colors.red }}>{p}</div>)}
                                            {templateChanged(t.id) && (
                                                <div><Button small tone="ghost" disabled={busy} onClick={() => setDraft((x) => ({ ...x, templates: { ...x.templates, [t.id]: defaults.templates[t.id] } }))}><Undo2 size={13} /> Put back the default</Button></div>
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                                                What it looks like{t.limit ? ` (${pv.body.length} of ${t.limit} characters)` : ''}
                                            </div>
                                            <div style={{ background: colors.bg, border: `1px solid ${over ? '#FCA5A5' : colors.border}`, borderRadius: 10, padding: '0.7rem 0.85rem', fontSize: '0.82rem', lineHeight: 1.6, color: colors.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                {pv.subject && <div style={{ fontWeight: 800, marginBottom: 6 }}>Subject: {pv.subject}</div>}
                                                {pv.body}
                                            </div>
                                            {over && <div style={{ fontSize: '0.76rem', color: colors.red, marginTop: 4 }}>Over the {t.limit}-character limit for this kind of message.</div>}
                                            {variant && (t.tier !== tier || (t.audience && t.audience !== audience)) && (
                                                <div style={{ fontSize: '0.74rem', color: colors.muted, marginTop: 4 }}>This version is written for {variant.toLowerCase()}; the preview is filled in as {TIER_LABELS[tier]} writing to a {AUDIENCE_LABELS[audience].toLowerCase()}.</div>
                                            )}
                                        </div>
                                    </div>
                                </details>
                            );
                        })}
                    </Card>
                );
            })}

            <Card style={{ position: 'sticky', bottom: 12, zIndex: 5, boxShadow: '0 8px 24px rgba(15,23,42,0.14)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button onClick={save} disabled={busy || !dirty || hasProblems}><Save size={14} /> {busy ? 'Saving...' : 'Save changes'}</Button>
                    <Button tone="ghost" onClick={() => setDraft(draftOf(kit))} disabled={busy || !dirty}><Undo2 size={14} /> Discard changes</Button>
                    <Button tone="danger" small onClick={() => setConfirmAll(true)} disabled={busy || (!kit.updated_at && customCount === 0)} style={{ marginLeft: 'auto' }}><RotateCcw size={13} /> Put everything back to the default</Button>
                </div>
                {hasProblems && <div style={{ marginTop: 8 }}><Banner tone="warning">Fix the items marked &ldquo;Fix this&rdquo; before saving.</Banner></div>}
                {!hasProblems && dirty && <div style={{ marginTop: 6, fontSize: '0.76rem', color: colors.muted }}>You have changes that are not saved yet.</div>}
            </Card>

            <ConfirmDialog
                isOpen={confirmAll}
                onClose={() => setConfirmAll(false)}
                onConfirm={async () => { setConfirmAll(false); await run(() => resetOutreachKit(), 'The outreach kit is back to the default wording.'); }}
                loading={busy}
                title="Put everything back to the default?"
                message="Every message and shared sentence you changed goes back to the default wording, on every dashboard. This cannot be undone."
                confirmLabel="Put back"
            />
        </div>
    );
};

export default OutreachKitManager;
