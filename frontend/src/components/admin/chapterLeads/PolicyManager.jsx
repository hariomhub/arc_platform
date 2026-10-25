import React, { useEffect, useState, useCallback } from 'react';
import { SlidersHorizontal, Loader2, Info } from 'lucide-react';
import { getAdminPolicy, createPolicy } from '../../../api/adminChapterLeads.js';
import { getErrorMessage } from '../../../utils/apiHelpers.js';
import { colors, Card, SectionTitle, Pill, Table, Td, Button, fieldStyle, labelStyle } from '../../chapterLead/ui.jsx';
import { ErrorNote, Spinner } from './shared.jsx';
import { TIER, tierLabel } from '../../../config/roles.js';

// Goals each tier is held to every quarter. Add a goal here and the form, the request and the history follow.
const GOAL_FIELDS = [
    { key: 'members_target', label: 'New members per quarter', min: 0, max: 1000 },
    { key: 'podcasts_target', label: 'Podcasts per quarter', min: 0, max: 1000 },
    { key: 'posts_min', label: 'Posts - minimum', min: 0, max: 1000 },
    { key: 'posts_max', label: 'Posts - maximum credited', min: 0, max: 1000 },
    { key: 'blogs_target', label: 'Blogs per quarter', min: 0, max: 1000 },
    { key: 'min_goals_met', label: 'Goals needed for a met quarter (of 4)', min: 1, max: 4 },
];

// Rules that apply to everyone on a team (rates only ever reach Chapter Leads who choose to receive them).
const SHARED_FIELDS = [
    { key: 'consecutive_miss_limit', label: 'Missed quarters in a row before review', min: 1, max: 12 },
    { key: 'term_months', label: 'Term length (months)', min: 1, max: 60 },
    { key: 'rate_term1', label: 'Revenue share - term 1 (%)', min: 0, max: 100, step: '0.01' },
    { key: 'rate_term2', label: 'Revenue share - term 2 (%)', min: 0, max: 100, step: '0.01' },
    { key: 'rate_term3', label: 'Revenue share - term 3 and later (%)', min: 0, max: 100, step: '0.01' },
    { key: 'direct_commission_pct', label: 'Direct contribution commission (%)', min: 0, max: 100, step: '0.01' },
];

const TIERS = [TIER.LEAD, TIER.AMBASSADOR];

const today = () => new Date().toISOString().slice(0, 10);

const toForm = (p) => ({
    shared: Object.fromEntries(SHARED_FIELDS.map((f) => [f.key, String(Number(p[f.key]))])),
    tiers: Object.fromEntries(TIERS.map((t) => [t, {
        ...Object.fromEntries(GOAL_FIELDS.map((f) => [f.key, String(p.tiers[t][f.key])])),
        seat_cap: p.tiers[t].seat_cap === null ? '' : String(p.tiers[t].seat_cap),
    }])),
    commission_on_renewals: Boolean(Number(p.commission_on_renewals)),
    effective_from: today(),
});

const goalSummary = (t) => `${t.members_target} / ${t.podcasts_target} / ${t.posts_min}-${t.posts_max} / ${t.blogs_target} · ${t.min_goals_met} of 4`;

/**
 * The programme rules: quarterly goals for each role, what counts as a met quarter, how many ambassadors a
 * chapter takes, term length and the revenue-share rates. Edits create a NEW version that applies from a
 * chosen date, so past quarters keep the rules they were scored under.
 */
const PolicyManager = ({ showToast }) => {
    const [data, setData] = useState(null);
    const [form, setForm] = useState(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await getAdminPolicy();
            setData(res.data?.data);
            setForm((prev) => prev || toForm(res.data.data.current));
            setError('');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const setShared = (key, value) => setForm((f) => ({ ...f, shared: { ...f.shared, [key]: value } }));
    const setTierField = (tier, key, value) => setForm((f) => ({ ...f, tiers: { ...f.tiers, [tier]: { ...f.tiers[tier], [key]: value } } }));

    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const body = { effective_from: form.effective_from, commission_on_renewals: form.commission_on_renewals };
            SHARED_FIELDS.forEach((f) => { body[f.key] = Number(form.shared[f.key]); });
            body.tiers = Object.fromEntries(TIERS.map((t) => [t, {
                ...Object.fromEntries(GOAL_FIELDS.map((f) => [f.key, Number(form.tiers[t][f.key])])),
                seat_cap: form.tiers[t].seat_cap === '' ? null : Number(form.tiers[t].seat_cap),
            }]));
            await createPolicy(body);
            showToast?.('New policy version saved.', 'success');
            setForm(null);
            await load();
        } catch (err) {
            showToast?.(getErrorMessage(err), 'error');
        } finally {
            setSaving(false);
        }
    };

    if (error) return <ErrorNote>{error}</ErrorNote>;
    if (!data || !form) return <Spinner />;

    const input = (id, f, value, onChange, extra = {}) => (
        <input id={id} type="number" required min={f.min} max={f.max} step={f.step || 1}
            value={value} onChange={(e) => onChange(e.target.value)} style={fieldStyle} disabled={saving} {...extra} />
    );

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            <Card>
                <SectionTitle icon={SlidersHorizontal}>Programme rules</SectionTitle>
                <div style={{ display: 'flex', gap: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '0.7rem 0.9rem', marginBottom: '1rem', color: '#1E3A8A', fontSize: '0.8rem', lineHeight: 1.6 }}>
                    <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                        Saving creates a new version that takes effect on the date you choose. Quarters that have already been scored keep the rules they were scored under.
                        If you change goals, rates or the quarter minimum, also update the Terms page and let the team know.
                    </span>
                </div>
                <form onSubmit={save} style={{ display: 'grid', gap: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                        {TIERS.map((t) => (
                            <fieldset key={t} style={{ border: `1px solid ${colors.border}`, borderRadius: 12, padding: '0.9rem 1rem 1rem', margin: 0, minWidth: 0 }}>
                                <legend style={{ padding: '0 6px', fontSize: '0.8rem', fontWeight: 800, color: colors.text }}>{tierLabel(t)} goals</legend>
                                <div style={{ display: 'grid', gap: '0.7rem' }}>
                                    {GOAL_FIELDS.map((f) => (
                                        <div key={f.key}>
                                            <label htmlFor={`pol-${t}-${f.key}`} style={labelStyle}>{f.label}</label>
                                            {input(`pol-${t}-${f.key}`, f, form.tiers[t][f.key], (v) => setTierField(t, f.key, v))}
                                        </div>
                                    ))}
                                    <div>
                                        <label htmlFor={`pol-${t}-seat_cap`} style={labelStyle}>{t === TIER.LEAD ? 'Seats per chapter' : 'Ambassadors per chapter'}</label>
                                        <input
                                            id={`pol-${t}-seat_cap`} type="number" min={1} max={1000}
                                            value={form.tiers[t].seat_cap} placeholder={t === TIER.LEAD ? '1' : 'No limit'}
                                            onChange={(e) => setTierField(t, 'seat_cap', e.target.value)}
                                            style={fieldStyle} disabled={saving || t === TIER.LEAD}
                                        />
                                        <span style={{ display: 'block', marginTop: 3, fontSize: '0.72rem', color: colors.muted }}>
                                            {t === TIER.LEAD ? 'A chapter has exactly one Chapter Lead.' : 'Leave empty for no limit. Lowering it never removes anyone; it only stops new approvals.'}
                                        </span>
                                    </div>
                                </div>
                            </fieldset>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.85rem' }}>
                        {SHARED_FIELDS.map((f) => (
                            <div key={f.key}>
                                <label htmlFor={`pol-${f.key}`} style={labelStyle}>{f.label}</label>
                                {input(`pol-${f.key}`, f, form.shared[f.key], (v) => setShared(f.key, v))}
                            </div>
                        ))}
                        <div>
                            <label htmlFor="pol-eff" style={labelStyle}>Takes effect on</label>
                            <input id="pol-eff" type="date" required min={today()} value={form.effective_from} onChange={(e) => setForm((p) => ({ ...p, effective_from: e.target.value }))} style={fieldStyle} disabled={saving} />
                        </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', color: colors.text, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.commission_on_renewals} onChange={(e) => setForm((p) => ({ ...p, commission_on_renewals: e.target.checked }))} style={{ accentColor: colors.primary }} disabled={saving} />
                        Pay direct commission on membership renewals too (otherwise first payment only)
                    </label>
                    <div>
                        <Button type="submit" disabled={saving}>
                            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null} Save as new version
                        </Button>
                    </div>
                </form>
            </Card>

            <Card padded={false}>
                <div style={{ padding: '1rem 1.25rem 0.4rem' }}><SectionTitle>Version history</SectionTitle></div>
                <Table
                    minWidth={980}
                    columns={[
                        { label: 'Effective from' }, { label: 'Lead goals (M / Pod / Posts / Blogs)' }, { label: 'Ambassador goals' },
                        { label: 'Ambassador seats' }, { label: 'Review after' }, { label: 'Term' }, { label: 'Rates' }, { label: 'By' },
                    ]}
                >
                    {data.history.map((h, i) => (
                        <tr key={h.id}>
                            <Td style={{ fontWeight: 700 }}>{h.effective_from === '2000-01-01' ? 'Launch (original)' : h.effective_from} {i === 0 && <Pill tone="green">Latest</Pill>}</Td>
                            <Td>{goalSummary(h.tiers.lead)}</Td>
                            <Td>{goalSummary(h.tiers.ambassador)}</Td>
                            <Td>{h.tiers.ambassador.seat_cap ?? 'No limit'}</Td>
                            <Td>{h.consecutive_miss_limit} missed</Td>
                            <Td>{h.term_months} mo</Td>
                            <Td>{Number(h.rate_term1)}% / {Number(h.rate_term2)}% / {Number(h.rate_term3)}% · {Number(h.direct_commission_pct)}% direct</Td>
                            <Td muted>{h.created_by_name || '—'}</Td>
                        </tr>
                    ))}
                </Table>
            </Card>
        </div>
    );
};

export default PolicyManager;
