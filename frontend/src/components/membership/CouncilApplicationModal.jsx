import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, ArrowLeft, Loader2, AlertCircle, ShieldCheck, HeartHandshake, Crown } from 'lucide-react';
import Modal from '../common/Modal.jsx';
import LocationFields from '../common/LocationFields.jsx';
import PolicyAgreement from '../common/PolicyAgreement.jsx';
import { applyCouncil } from '../../api/membership.js';
import { getChapterLeadPolicy } from '../../api/chapterLead.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';
import { colors, Segmented, Banner, Button, fieldStyle, labelStyle } from '../ui/kit.jsx';
import { CONFIRMATION } from '../team/EarningsChoice.jsx';

/**
 * "Join a chapter team": one short form in three steps for both roles.
 *   1. Which role (what each involves, in numbers taken from the live programme rules)
 *   2. Where, and about you (an ambassador picks a chapter; seats and lead are shown on each)
 *   3. Confirm (employer check + Privacy Policy and Terms) and send
 *
 * Ambassador applications go to the chapter's lead (or to the admins while it has no lead); Chapter
 * Lead applications go to the admins. The server decides and enforces all of it.
 */

const ROLE = {
    ambassador: {
        label: 'Chapter Ambassador', icon: HeartHandshake, accent: '#0F766E',
        blurb: 'A volunteer role on a chapter team. You post, write and bring in members alongside your chapter\'s lead.',
        reviewer: "Your chapter's Chapter Lead decides, or the administrators if the chapter has no lead yet.",
        money: 'No revenue share, commission or workshop fees. It is a volunteer role.',
    },
    lead: {
        label: 'Chapter Lead', icon: Crown, accent: '#0369A1',
        blurb: 'Lead one chapter: set its direction, approve its ambassadors and answer for its results.',
        reviewer: 'The administrators decide. A chapter has one Chapter Lead.',
        money: null,   // filled from the live policy
    },
};

const Pips = ({ step }) => (
    <ol aria-label="Progress" style={{ display: 'flex', gap: 8, listStyle: 'none', margin: 0, padding: 0 }}>
        {['Role', 'About you', 'Confirm'].map((label, i) => {
            const n = i + 1;
            const done = step > n;
            const on = step === n;
            return (
                <li key={label} aria-current={on ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: on ? 800 : 600, color: on ? colors.primary : colors.muted }}>
                    <span style={{
                        width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800,
                        background: done || on ? colors.primary : '#EEF2F7', color: done || on ? 'white' : colors.muted,
                    }}>
                        {done ? <Check size={12} aria-hidden="true" /> : n}
                    </span>
                    <span>{label}</span>
                    {n < 3 && <span aria-hidden="true" style={{ width: 18, height: 1, background: colors.border }} />}
                </li>
            );
        })}
    </ol>
);

const seatText = (c) => {
    if (!c.has_lead) return 'no Chapter Lead yet';
    if (c.seats_left === null) return 'has a Chapter Lead';
    return c.seats_left > 0 ? `has a Chapter Lead, ${c.seats_left} seat${c.seats_left === 1 ? '' : 's'} open` : 'has a Chapter Lead, full (applications queue)';
};

const CouncilApplicationModal = ({ isOpen, onClose, initialTier = 'ambassador', prefill = null, onSubmitted }) => {
    const [tier, setTier] = useState(initialTier);
    const [step, setStep] = useState(1);
    const [policy, setPolicy] = useState(null);
    const [form, setForm] = useState({
        organization_name: '', job_title: '', linkedin_url: '', professional_bio: '', why_council_member: '',
        country_code: '', chapter_id: '', accept_privacy: false, employer_confirmed: false,
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(null);

    useEffect(() => {
        if (!isOpen) return;
        setTier(initialTier); setStep(1); setDone(null); setError(''); setErrors({});
        // A chapter page's Apply link arrives with the country and chapter already chosen.
        if (prefill) setForm((f) => ({ ...f, country_code: prefill.country_code || f.country_code, chapter_id: prefill.chapter_id ? String(prefill.chapter_id) : f.chapter_id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialTier]);

    useEffect(() => {
        if (!isOpen || policy) return;
        getChapterLeadPolicy().then((res) => setPolicy(res.data?.data || null)).catch(() => { /* the form works without the summary */ });
    }, [isOpen, policy]);

    const rules = policy?.tiers?.[tier];
    const set = (patch) => setForm((f) => ({ ...f, ...patch }));
    const role = ROLE[tier];
    const RoleIcon = role.icon;

    const summary = useMemo(() => {
        if (!rules) return null;
        const t = rules.targets;
        return [
            `${t.members} new members`, `${t.podcasts} podcast${t.podcasts === 1 ? '' : 's'}`,
            t.posts_min === t.posts_max ? `${t.posts_min} posts` : `${t.posts_min}-${t.posts_max} posts`,
            `${t.blogs} blog${t.blogs === 1 ? '' : 's'}`,
        ];
    }, [rules]);

    const leadMoney = policy
        ? `May include revenue share (${policy.rates.term1}% in the first term, ${policy.rates.term2}% in the second, ${policy.rates.term3}% after that) and ${policy.rates.direct_commission}% commission on value you bring in directly, as set out in the Terms. You can choose to waive it and lead as a volunteer.`
        : 'May include revenue share and commission, as set out in the Terms. You can choose to waive it and lead as a volunteer.';

    const validateStep2 = () => {
        const e = {};
        if (!form.country_code) e.country_code = 'Please select your country.';
        if (tier === 'ambassador' && !form.chapter_id) e.chapter = 'Choose the chapter you would like to join.';
        if (form.why_council_member.trim().length < 10) e.why = tier === 'ambassador' ? 'Tell us a little about why you want to join (at least a sentence).' : 'Tell us why you want to lead (at least a sentence).';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const next = () => {
        setError('');
        if (step === 2 && !validateStep2()) return;
        setStep((s) => Math.min(3, s + 1));
    };

    const submit = async (ev) => {
        ev.preventDefault();
        const e = {};
        if (!form.employer_confirmed) e.employer = 'Please confirm you have checked your employment terms.';
        if (!form.accept_privacy) e.accept_privacy = 'You must agree to the Privacy Policy and Terms to apply.';
        setErrors(e);
        if (Object.keys(e).length) return;
        setSubmitting(true);
        setError('');
        try {
            const res = await applyCouncil({
                ...form, tier, chapter_id: form.chapter_id || undefined, accept_privacy: true, employer_confirmed: true,
            });
            setDone(res.data?.data || {});
            onSubmitted?.();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    const title = done ? 'Application sent' : 'Join a chapter team';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
            {done ? (
                <div style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>
                    <div style={{ width: 52, height: 52, background: '#D1FAE5', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.8rem' }}>
                        <Check size={24} color="#059669" aria-hidden="true" />
                    </div>
                    <h3 style={{ margin: '0 0 0.4rem', fontWeight: 800, fontSize: '1.1rem', color: colors.text }}>Thank you</h3>
                    <p style={{ margin: '0 auto 1.1rem', maxWidth: 440, fontSize: '0.88rem', color: colors.muted, lineHeight: 1.65 }}>
                        {done.message} Your Community Membership stays active in the meantime.
                    </p>
                    <Button tone="ghost" onClick={onClose}>Close</Button>
                </div>
            ) : (
                <form onSubmit={submit} noValidate style={{ display: 'grid', gap: '1rem' }}>
                    <Pips step={step} />

                    {error && <Banner tone="danger" icon={AlertCircle}>{error}</Banner>}

                    {step === 1 && (
                        <div style={{ display: 'grid', gap: '0.9rem' }}>
                            <Segmented
                                ariaLabel="Role"
                                value={tier}
                                onChange={setTier}
                                options={[{ value: 'ambassador', label: 'Chapter Ambassador' }, { value: 'lead', label: 'Chapter Lead' }]}
                            />
                            <div className="kit-enter" key={tier} style={{ border: `1px solid ${colors.border}`, borderLeft: `4px solid ${role.accent}`, borderRadius: 14, padding: '1rem 1.1rem', display: 'grid', gap: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <RoleIcon size={22} color={role.accent} aria-hidden="true" />
                                    <strong style={{ fontSize: '1.05rem', color: colors.text }}>{role.label}</strong>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.86rem', color: colors.muted, lineHeight: 1.65 }}>{role.blurb}</p>
                                <dl style={{ margin: 0, display: 'grid', gap: 8, fontSize: '0.84rem' }}>
                                    <div><dt style={{ fontWeight: 800, color: colors.text }}>Each quarter</dt><dd style={{ margin: 0, color: colors.muted }}>{summary ? summary.join(', ') : 'Loading the current targets…'}{rules ? `. At least ${rules.min_goals_met} of 4 goals make a quarter count.` : ''}</dd></div>
                                    <div><dt style={{ fontWeight: 800, color: colors.text }}>Who decides</dt><dd style={{ margin: 0, color: colors.muted }}>{role.reviewer}</dd></div>
                                    <div><dt style={{ fontWeight: 800, color: colors.text }}>Money</dt><dd style={{ margin: 0, color: colors.muted }}>{tier === 'lead' ? leadMoney : role.money}</dd></div>
                                    <div><dt style={{ fontWeight: 800, color: colors.text }}>You can</dt><dd style={{ margin: 0, color: colors.muted }}>Post on Tech Social, write blogs, request to host podcasts and workshops, and draft events and news (an administrator publishes them){tier === 'lead' ? ', approve ambassadors and manage the automated news feed' : ''}.</dd></div>
                                </dl>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: colors.muted, lineHeight: 1.6 }}>
                                Prefer to start smaller? Choose Chapter Ambassador. A Chapter Ambassador can later ask to lead their chapter.
                            </p>
                        </div>
                    )}

                    {step === 2 && (
                        <div style={{ display: 'grid', gap: '0.85rem' }}>
                            <LocationFields
                                country={form.country_code}
                                chapterId={form.chapter_id}
                                disabled={submitting}
                                countryError={errors.country_code}
                                countryLabel="Your country"
                                chapterLabel={tier === 'ambassador' ? 'Chapter to join' : 'Chapter you would lead'}
                                chapterHint={tier === 'ambassador' ? 'Required' : 'Optional: an admin confirms the final chapter'}
                                chapterRequired={tier === 'ambassador'}
                                chapterError={errors.chapter}
                                describeChapter={tier === 'ambassador' ? seatText : (c) => (c.has_lead ? 'already has a Chapter Lead' : 'no Chapter Lead yet')}
                                emptyChaptersMessage="There are no chapters in your country yet. Contact us and we will tell you when one opens."
                                idPrefix="cl"
                                inputStyle={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#fafafa', fontSize: '0.875rem' }}
                                labelStyle={{ fontSize: '0.8rem', color: '#374151' }}
                                onChange={({ country_code, chapter_id }) => { set({ country_code, chapter_id }); setErrors((p) => ({ ...p, country_code: '', chapter: '' })); }}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(190px,100%), 1fr))', gap: '0.8rem' }}>
                                <div>
                                    <label htmlFor="ca-org" style={labelStyle}>Organisation</label>
                                    <input id="ca-org" style={fieldStyle} placeholder="Acme AI Corp" value={form.organization_name} onChange={(e) => set({ organization_name: e.target.value })} />
                                </div>
                                <div>
                                    <label htmlFor="ca-job" style={labelStyle}>Job title</label>
                                    <input id="ca-job" style={fieldStyle} placeholder="AI Risk Manager" value={form.job_title} onChange={(e) => set({ job_title: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="ca-li" style={labelStyle}>LinkedIn URL</label>
                                <input id="ca-li" style={fieldStyle} type="url" placeholder="https://linkedin.com/in/..." value={form.linkedin_url} onChange={(e) => set({ linkedin_url: e.target.value })} />
                            </div>
                            <div>
                                <label htmlFor="ca-bio" style={labelStyle}>Professional background <span style={{ color: colors.faint, fontWeight: 400 }}>(optional)</span></label>
                                <textarea id="ca-bio" rows={2} style={{ ...fieldStyle, resize: 'vertical' }} placeholder="Your background in AI risk, compliance or governance…" value={form.professional_bio} onChange={(e) => set({ professional_bio: e.target.value })} />
                            </div>
                            <div>
                                <label htmlFor="ca-why" style={{ ...labelStyle, color: errors.why ? colors.red : labelStyle.color }}>
                                    {tier === 'ambassador' ? 'Why do you want to join this chapter?' : 'Why do you want to lead?'} <span style={{ color: '#EF4444' }}>*</span>
                                </label>
                                <textarea id="ca-why" rows={3} style={{ ...fieldStyle, resize: 'vertical', borderColor: errors.why ? '#FCA5A5' : fieldStyle.border }} value={form.why_council_member} onChange={(e) => { set({ why_council_member: e.target.value }); setErrors((p) => ({ ...p, why: '' })); }} />
                                {errors.why && <span role="alert" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.74rem', color: colors.red, marginTop: 4 }}><AlertCircle size={11} />{errors.why}</span>}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div style={{ display: 'grid', gap: '0.9rem' }}>
                            <div style={{ border: `1px solid ${colors.border}`, borderRadius: 12, padding: '0.8rem 1rem', fontSize: '0.84rem', color: colors.muted, lineHeight: 1.6 }}>
                                You are applying as a <strong style={{ color: colors.text }}>{role.label}</strong>
                                {form.chapter_id ? ' for the chapter you chose' : ''}. {role.reviewer}
                            </div>

                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', background: errors.employer ? '#FFF5F5' : '#F8FAFC', border: `1px solid ${errors.employer ? '#FCA5A5' : colors.border}`, borderRadius: 12, padding: '0.75rem 0.9rem' }}>
                                <input type="checkbox" checked={form.employer_confirmed} onChange={(e) => { set({ employer_confirmed: e.target.checked }); setErrors((p) => ({ ...p, employer: '' })); }} style={{ marginTop: 3, width: 16, height: 16, accentColor: colors.primary, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.82rem', color: colors.text, lineHeight: 1.55 }}>
                                    <ShieldCheck size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />
                                    {CONFIRMATION} <span style={{ color: '#EF4444' }}>*</span>
                                    <span style={{ display: 'block', color: colors.muted, fontSize: '0.76rem', marginTop: 3 }}>
                                        Some employers require approval even for unpaid roles. We cannot give legal advice, so please check your own contract or ask your employer.
                                    </span>
                                </span>
                            </label>
                            {errors.employer && <span role="alert" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.74rem', color: colors.red }}><AlertCircle size={11} />{errors.employer}</span>}

                            <PolicyAgreement
                                id="ca-accept"
                                scope={tier}
                                checked={form.accept_privacy}
                                disabled={submitting}
                                error={errors.accept_privacy}
                                onChange={(v) => { set({ accept_privacy: v }); setErrors((p) => ({ ...p, accept_privacy: '' })); }}
                            />
                            <p style={{ margin: 0, fontSize: '0.76rem', color: colors.muted, lineHeight: 1.55 }}>
                                While you hold the role your name, role and chapter appear on the public <Link to="/chapters" target="_blank" rel="noopener noreferrer" style={{ color: colors.primary, fontWeight: 700 }}>Chapters</Link> page. Anything else is your choice.
                            </p>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <Button tone="ghost" onClick={step === 1 ? onClose : () => setStep((s) => s - 1)} disabled={submitting}>
                            {step === 1 ? 'Cancel' : <><ArrowLeft size={14} /> Back</>}
                        </Button>
                        {step < 3 ? (
                            <Button onClick={next}>Continue <ArrowRight size={14} /></Button>
                        ) : (
                            <Button type="submit" disabled={submitting}>
                                {submitting ? <><Loader2 size={14} className="kit-spin" /> Sending…</> : <>Send application <ArrowRight size={14} /></>}
                            </Button>
                        )}
                    </div>
                </form>
            )}
        </Modal>
    );
};

export default CouncilApplicationModal;
