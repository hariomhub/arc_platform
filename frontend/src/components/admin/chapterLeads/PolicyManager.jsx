import React, { useEffect, useState, useCallback } from 'react';
import { SlidersHorizontal, Loader2, Info } from 'lucide-react';
import { getAdminPolicy, createPolicy } from '../../../api/adminChapterLeads.js';
import { getErrorMessage } from '../../../utils/apiHelpers.js';
import { colors, Card, SectionTitle, Pill, Table, Td, Button, fieldStyle, labelStyle } from '../../chapterLead/ui.jsx';
import { ErrorNote, Spinner } from './shared.jsx';

const FIELDS = [
    { key: 'members_target', label: 'New members per quarter', min: 0, max: 1000 },
    { key: 'podcasts_target', label: 'Podcasts per quarter', min: 0, max: 1000 },
    { key: 'posts_min', label: 'Posts - minimum', min: 0, max: 1000 },
    { key: 'posts_max', label: 'Posts - maximum credited', min: 0, max: 1000 },
    { key: 'blogs_target', label: 'Blogs per quarter', min: 0, max: 1000 },
    { key: 'min_goals_met', label: 'Goals needed for a met quarter (of 4)', min: 1, max: 4 },
    { key: 'consecutive_miss_limit', label: 'Missed quarters in a row before review', min: 1, max: 12 },
    { key: 'term_months', label: 'Term length (months)', min: 1, max: 60 },
    { key: 'rate_term1', label: 'Revenue share - term 1 (%)', min: 0, max: 100, step: '0.01' },
    { key: 'rate_term2', label: 'Revenue share - term 2 (%)', min: 0, max: 100, step: '0.01' },
    { key: 'rate_term3', label: 'Revenue share - term 3 and later (%)', min: 0, max: 100, step: '0.01' },
    { key: 'direct_commission_pct', label: 'Direct contribution commission (%)', min: 0, max: 100, step: '0.01' },
];

const today = () => new Date().toISOString().slice(0, 10);

const toForm = (p) => ({
    ...Object.fromEntries(FIELDS.map((f) => [f.key, String(Number(p[f.key]))])),
    commission_on_renewals: Boolean(Number(p.commission_on_renewals)),
    effective_from: today(),
});

/**
 * The programme rules: quarterly targets, what counts as a met quarter, term length
 * and the revenue-share rates. Edits create a NEW version that applies from a chosen
 * date, so past quarters keep the rules they were scored under.
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

    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const body = { effective_from: form.effective_from, commission_on_renewals: form.commission_on_renewals };
            FIELDS.forEach((f) => { body[f.key] = Number(form[f.key]); });
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

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            <Card>
                <SectionTitle icon={SlidersHorizontal}>Programme rules</SectionTitle>
                <div style={{ display: 'flex', gap: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '0.7rem 0.9rem', marginBottom: '1rem', color: '#1E3A8A', fontSize: '0.8rem', lineHeight: 1.6 }}>
                    <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                        Saving creates a new version that takes effect on the date you choose. Quarters that have already been scored keep the rules they were scored under.
                        If you change targets, rates or the quarter minimum, also update the Terms page and let Chapter Leads know.
                    </span>
                </div>
                <form onSubmit={save} style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.85rem' }}>
                        {FIELDS.map((f) => (
                            <div key={f.key}>
                                <label htmlFor={`pol-${f.key}`} style={labelStyle}>{f.label}</label>
                                <input id={`pol-${f.key}`} type="number" required min={f.min} max={f.max} step={f.step || 1}
                                    value={form[f.key]} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} style={fieldStyle} disabled={saving} />
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
                    minWidth={820}
                    columns={[
                        { label: 'Effective from' }, { label: 'Targets (M / Pod / Posts / Blogs)' }, { label: 'Met quarter' },
                        { label: 'Review after' }, { label: 'Term' }, { label: 'Rates' }, { label: 'By' },
                    ]}
                >
                    {data.history.map((h, i) => (
                        <tr key={h.id}>
                            <Td style={{ fontWeight: 700 }}>{h.effective_from === '2000-01-01' ? 'Launch (original)' : h.effective_from} {i === 0 && <Pill tone="green">Latest</Pill>}</Td>
                            <Td>{h.members_target} / {h.podcasts_target} / {h.posts_min}-{h.posts_max} / {h.blogs_target}</Td>
                            <Td>{h.min_goals_met} of 4</Td>
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
