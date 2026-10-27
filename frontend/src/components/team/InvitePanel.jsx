import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check, MessageCircle, Mail, Linkedin, RotateCcw, Send } from 'lucide-react';
import { colors, Switch } from '../ui/kit.jsx';
import { getOutreachKit } from '../../api/chapterLead.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';
import { tierLabel } from '../../config/roles.js';
import {
    TYPED_LABELS, groupsOf, pickTemplate, renderMessage, needsOf,
    whatsappHref, mailtoHref, linkedinPostHref, LINKEDIN_HOME, MAILTO_LIMIT,
} from '../../utils/outreachKit.js';

const AUDIENCES = [
    { value: 'vendor', label: 'A vendor' },
    { value: 'enthusiast', label: 'A tech enthusiast' },
];

const CSS = `
    .inv-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.6rem; }
    .inv-chip { appearance: none; font-family: var(--font-sans); cursor: pointer; font-weight: 700; font-size: 0.78rem; padding: 0.38rem 0.8rem; border-radius: 100px; line-height: 1.2; transition: background-color .12s ease, border-color .12s ease; }
    .inv-tab { appearance: none; font-family: var(--font-sans); cursor: pointer; background: none; border: none; border-bottom: 2px solid transparent; padding: 0.35rem 0.1rem; margin-right: 1.1rem; font-weight: 700; font-size: 0.8rem; color: ${colors.muted}; }
    .inv-tab[aria-selected="true"] { color: ${colors.primary}; border-bottom-color: ${colors.primary}; }
    .inv-details summary { cursor: pointer; font-weight: 700; font-size: 0.78rem; color: ${colors.muted}; padding: 0.25rem 0; }
    .inv-details[open] summary { color: ${colors.primary}; }
    .inv-details ul { margin: 0.3rem 0 0.2rem; padding-left: 1.1rem; font-size: 0.78rem; color: ${colors.muted}; line-height: 1.6; }
`;

const fieldBox = { width: '100%', boxSizing: 'border-box', padding: '0.5rem 0.7rem', border: '1.5px solid #CBD5E1', borderRadius: 9, fontSize: '0.84rem', fontFamily: 'var(--font-sans)', color: colors.text, background: 'white' };

/**
 * "Invite someone": ready-made messages for inviting people, with the sender's own name, role, chapter, referral
 * code and sign-up link filled in. It lives inside the referral card, because that is where the code is.
 *
 * Pick what kind of message (first message, announcement, follow-up, quick answer), who it is for, type the
 * recipient's first name (and company, if the message uses one), read the preview, change it if you like, then
 * copy it, or open WhatsApp, email or LinkedIn with it in place. What is typed here never leaves the browser.
 * The words come from the server (Admin > Chapter Leads > Outreach kit), so an administrator can change them
 * without a new release.
 */
const InvitePanel = ({ tier, chapterName, userName, code, link, accent, onShared, showToast }) => {
    const [open, setOpen] = useState(() => !(typeof window !== 'undefined' && window.matchMedia?.('(max-width: 640px)').matches));
    const [kit, setKit] = useState(null);
    const [error, setError] = useState('');
    const [audience, setAudience] = useState('vendor');
    const [groupId, setGroupId] = useState('first');
    const [key, setKey] = useState('connect');
    const [fields, setFields] = useState({ first_name: '', company: '', topic: '', month: '', free_link: '' });
    const [connected, setConnected] = useState(false);
    const [edited, setEdited] = useState(null);       // what the person typed over the preview, or null while it follows the template
    const [copied, setCopied] = useState('');

    const load = useCallback(async () => {
        try {
            const res = await getOutreachKit();
            setKit(res.data?.data || null);
            setError('');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    }, []);

    // The words are only fetched once the panel is open, so a folded panel costs nothing.
    useEffect(() => { if (open && !kit && !error) load(); }, [open, kit, error, load]);

    const groups = useMemo(() => groupsOf(kit), [kit]);
    const group = groups.find((g) => g.id === groupId) || groups[0];
    useEffect(() => {
        if (group && !group.items.some((i) => i.key === key)) setKey(group.items[0].key);
    }, [group, key]);

    const template = kit ? pickTemplate(kit.templates, key, tier, audience) : null;
    const audienceMatters = Boolean(kit?.templates.some((t) => t.key === key && t.audience));
    const ctx = { tier, audience, connected, vars: { ...fields, your_name: userName, role: tierLabel(tier), chapter: chapterName, code, link } };
    const needs = template ? needsOf(template, kit.blocks, ctx) : { typed: [], opener: false };
    const built = template ? renderMessage(template, kit.blocks, ctx) : null;
    const text = edited ?? built?.body ?? '';
    const lacking = !edited && built ? built.missing.filter((n) => TYPED_LABELS[n]) : [];                 // things the sender still has to type
    const accountGap = !edited && built ? built.missing.some((n) => !TYPED_LABELS[n]) : false;           // something from their account is empty (a code that is not ready, say)
    const canSend = Boolean(template) && text.trim().length > 0 && lacking.length === 0 && !accountGap;
    const tooLong = template?.limit && text.length > template.limit;
    const subject = built?.subject || '';

    const setField = (name, value) => setFields((f) => ({ ...f, [name]: value }));
    const choose = (setter) => (value) => { setter(value); setEdited(null); };

    const copy = async (what, value) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(what);
            onShared?.();
            showToast?.(what === 'subject' ? 'Subject copied.' : 'Message copied.', 'success');
            setTimeout(() => setCopied(''), 1800);
        } catch {
            showToast?.('Could not copy automatically. Please select the text and copy it.', 'error');
        }
    };

    const opened = () => onShared?.();

    // The links a message can be opened with, by where it is going.
    const channel = template?.channel;
    const links = [];
    if (canSend) {
        if (['whatsapp', 'whatsapp_group', 'message'].includes(channel)) links.push({ key: 'wa', href: whatsappHref(text), icon: MessageCircle, label: 'Open WhatsApp' });
        if (channel === 'email') {
            const href = mailtoHref(subject, text);
            if (href.length <= MAILTO_LIMIT) links.push({ key: 'mail', href, icon: Mail, label: 'Open email' });
        }
        if (channel === 'linkedin_post') links.push({ key: 'li', href: linkedinPostHref(text), icon: Linkedin, label: 'Start a LinkedIn post' });
        if (channel === 'linkedin_connect' || channel === 'linkedin_message') links.push({ key: 'li', href: LINKEDIN_HOME, icon: Linkedin, label: 'Open LinkedIn' });
    }

    const primary = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderRadius: 9, fontWeight: 800, fontSize: '0.84rem', fontFamily: 'var(--font-sans)', cursor: canSend ? 'pointer' : 'not-allowed', border: `1.5px solid ${canSend ? accent : '#CBD5E1'}`, background: canSend ? accent : '#E2E8F0', color: canSend ? 'white' : '#64748B' };
    const quiet = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 0.9rem', borderRadius: 9, fontWeight: 700, fontSize: '0.82rem', fontFamily: 'var(--font-sans)', textDecoration: 'none', cursor: 'pointer', border: '1.5px solid #CBD5E1', background: 'white', color: colors.text };

    return (
        <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: '1.1rem', paddingTop: '0.95rem' }}>
            <style>{CSS}</style>
            <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="invite-body" className="kit-focus"
                style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)' }}>
                <span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        <Send size={14} aria-hidden="true" /> Invite someone
                    </span>
                    <span style={{ display: 'block', marginTop: 3, fontSize: '0.8rem', color: colors.muted, lineHeight: 1.5 }}>
                        Ready-made messages with your name, chapter and link already in them.
                    </span>
                </span>
                <span style={{ color: colors.muted, display: 'inline-flex', flexShrink: 0 }}>{open ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}</span>
            </button>

            {open && (
                <div id="invite-body" style={{ marginTop: '0.8rem' }}>
                    {!chapterName ? (
                        <p style={{ margin: 0, fontSize: '0.84rem', color: colors.muted, lineHeight: 1.6 }}>
                            Every message names your chapter, so they are ready as soon as an administrator assigns you to one.
                        </p>
                    ) : error ? (
                        <p style={{ margin: 0, fontSize: '0.84rem', color: colors.red }}>
                            {error}{' '}
                            <button type="button" onClick={() => { setError(''); load(); }} className="kit-focus" style={{ background: 'none', border: 'none', padding: 0, color: colors.primary, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Try again</button>
                        </p>
                    ) : !kit ? (
                        <div className="skel" style={{ height: 180 }} />
                    ) : (
                        <>
                            <div role="tablist" aria-label="Kind of message" style={{ display: 'flex', flexWrap: 'wrap' }}>
                                {groups.map((g) => (
                                    <button key={g.id} type="button" role="tab" aria-selected={g.id === group?.id} className="inv-tab kit-focus" onClick={() => { setGroupId(g.id); setEdited(null); }}>{g.label}</button>
                                ))}
                            </div>
                            <div role="group" aria-label={`${group?.label || 'Messages'}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '0.55rem 0 0.8rem' }}>
                                {group?.items.map((item) => {
                                    const on = item.key === key;
                                    return (
                                        <button key={item.key} type="button" aria-pressed={on} className="inv-chip kit-focus" onClick={() => choose(setKey)(item.key)}
                                            style={{ border: `1.5px solid ${on ? accent : '#CBD5E1'}`, background: on ? `${accent}14` : 'white', color: on ? accent : colors.text }}>
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {template ? (
                                <>
                                    {(audienceMatters || needs.typed.length > 0 || needs.opener) && (
                                        <div style={{ display: 'grid', gap: '0.7rem', marginBottom: '0.8rem' }}>
                                            {audienceMatters && (
                                                <div role="radiogroup" aria-label="Who is it for" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: colors.muted }}>Writing to</span>
                                                    {AUDIENCES.map((a) => {
                                                        const on = audience === a.value;
                                                        return (
                                                            <button key={a.value} type="button" role="radio" aria-checked={on} className="inv-chip kit-focus" onClick={() => choose(setAudience)(a.value)}
                                                                style={{ border: `1.5px solid ${on ? accent : '#CBD5E1'}`, background: on ? accent : 'white', color: on ? 'white' : colors.text }}>
                                                                {a.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {needs.typed.length > 0 && (
                                                <div className="inv-fields">
                                                    {needs.typed.map((name) => (
                                                        <label key={name} style={{ display: 'block' }}>
                                                            <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: colors.muted, marginBottom: 3 }}>{TYPED_LABELS[name]}</span>
                                                            <input
                                                                value={fields[name]}
                                                                onChange={(e) => setField(name, e.target.value)}
                                                                style={fieldBox}
                                                                maxLength={name === 'free_link' ? 300 : 80}
                                                                autoComplete="off"
                                                                inputMode={name === 'free_link' ? 'url' : undefined}
                                                            />
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                            {needs.opener && (
                                                <Switch id="invite-connected" checked={connected} onChange={choose(setConnected)} label="Already connected on LinkedIn" description="Changes the opening line." />
                                            )}
                                        </div>
                                    )}

                                    {template.subject && (
                                        <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: colors.muted, flexShrink: 0 }}>Subject</span>
                                            <input readOnly value={subject} aria-label="Subject" style={{ ...fieldBox, background: '#F8FAFC' }} />
                                            <button type="button" onClick={() => copy('subject', subject)} className="kit-focus" style={{ ...quiet, padding: '0.45rem 0.7rem', whiteSpace: 'nowrap' }}>
                                                {copied === 'subject' ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />} Copy
                                            </button>
                                        </div>
                                    )}

                                    <label htmlFor="invite-text" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, fontSize: '0.72rem', fontWeight: 700, color: colors.muted, marginBottom: 3 }}>
                                        <span>{template.title || 'Message'}</span>
                                        {template.limit && <span style={{ color: tooLong ? colors.red : colors.muted }}>{text.length} of {template.limit} characters</span>}
                                    </label>
                                    <textarea
                                        id="invite-text"
                                        value={text}
                                        onChange={(e) => setEdited(e.target.value)}
                                        rows={Math.min(14, Math.max(5, text.split('\n').length + 1))}
                                        style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.55, borderColor: tooLong ? '#FCA5A5' : '#CBD5E1' }}
                                    />

                                    {edited !== null && (
                                        <p style={{ margin: '0.3rem 0 0', fontSize: '0.76rem', color: colors.muted }}>
                                            You have changed this message, so changing the details above will not update it.{' '}
                                            <button type="button" onClick={() => setEdited(null)} className="kit-focus" style={{ background: 'none', border: 'none', padding: 0, color: colors.primary, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                                <RotateCcw size={12} aria-hidden="true" /> Start again
                                            </button>
                                        </p>
                                    )}
                                    {tooLong && <p style={{ margin: '0.3rem 0 0', fontSize: '0.76rem', color: colors.red }}>That is over what LinkedIn lets you write in a connection note. Shorten it before you send.</p>}
                                    {lacking.length > 0 && (
                                        <p style={{ margin: '0.3rem 0 0', fontSize: '0.76rem', color: colors.amber }}>
                                            Add {lacking.map((n) => TYPED_LABELS[n].toLowerCase()).join(' and ')} to copy it.
                                        </p>
                                    )}
                                    {accountGap && <p style={{ margin: '0.3rem 0 0', fontSize: '0.76rem', color: colors.amber }}>Your referral code or name is not ready yet. Reload the page in a moment.</p>}

                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: '0.7rem' }}>
                                        <button type="button" disabled={!canSend} onClick={() => copy('message', text)} className="kit-btn kit-focus" style={primary} aria-live="polite">
                                            {copied === 'message' ? <><Check size={15} aria-hidden="true" /> Copied</> : <><Copy size={15} aria-hidden="true" /> Copy message</>}
                                        </button>
                                        {links.map(({ key: k, href, icon: Icon, label }) => (
                                            <a key={k} href={href} target="_blank" rel="noopener noreferrer" onClick={opened} className="kit-btn kit-focus" style={quiet}>
                                                <Icon size={14} aria-hidden="true" /> {label}
                                            </a>
                                        ))}
                                    </div>
                                    {template.hint && <p style={{ margin: '0.55rem 0 0', fontSize: '0.78rem', color: colors.muted, lineHeight: 1.55 }}>{template.hint}</p>}
                                </>
                            ) : (
                                <p style={{ margin: 0, fontSize: '0.84rem', color: colors.muted }}>There is no version of this message for your role yet.</p>
                            )}

                            <div style={{ display: 'flex', gap: '1.6rem', flexWrap: 'wrap', marginTop: '0.7rem' }}>
                                {kit.blocks.rhythm?.length > 0 && (
                                    <details className="inv-details">
                                        <summary>When to follow up</summary>
                                        <ul>{kit.blocks.rhythm.map((line) => <li key={line}>{line}</li>)}</ul>
                                    </details>
                                )}
                                {kit.blocks.etiquette && (
                                    <details className="inv-details">
                                        <summary>Before you send</summary>
                                        <p style={{ margin: '0.3rem 0 0.2rem', fontSize: '0.78rem', color: colors.muted, lineHeight: 1.6, maxWidth: 460 }}>{kit.blocks.etiquette}</p>
                                    </details>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default InvitePanel;
