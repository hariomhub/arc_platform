import React, { useEffect, useState, useCallback } from 'react';
import { Copy, Check, Link2, Share2, Loader2 } from 'lucide-react';
import { getLeadReferrals } from '../../api/chapterLead.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';
import { colors, Card, SectionTitle, Pill, Empty, Table, Td, Button, fmtDate } from './ui.jsx';

const STATUS = {
    qualified: { tone: 'green', label: 'Approved — counts' },
    pending:   { tone: 'amber', label: 'Awaiting approval' },
    void:      { tone: 'gray',  label: 'Not counted' },
};

/** Referral code + shareable link at the top, then everyone who signed up with it. */
const ReferralPanel = ({ code, showToast }) => {
    const [copied, setCopied] = useState('');
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    const link = `${window.location.origin}/register?ref=${encodeURIComponent(code || '')}`;

    const load = useCallback(async () => {
        try {
            const res = await getLeadReferrals();
            setData(res.data?.data || { referrals: [], counts: {} });
            setError('');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const copy = async (text, which) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(which);
            showToast?.(which === 'code' ? 'Referral code copied.' : 'Referral link copied.', 'success');
            setTimeout(() => setCopied(''), 1800);
        } catch {
            showToast?.('Could not copy automatically — please select and copy it.', 'error');
        }
    };

    const counts = data?.counts || {};
    const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`;

    return (
        <Card>
            <SectionTitle icon={Link2}>Your referral code</SectionTitle>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'stretch', marginBottom: '0.9rem' }}>
                <div style={{ flex: '1 1 220px', background: '#F0F6FF', border: '1px dashed #93C5FD', borderRadius: 12, padding: '0.85rem 1rem' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: colors.blue, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Code</div>
                    <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '1.5rem', fontWeight: 800, color: colors.primary, letterSpacing: '0.08em', margin: '2px 0 8px' }}>
                        {code || '—'}
                    </div>
                    <Button small tone="ghost" onClick={() => copy(code, 'code')}>
                        {copied === 'code' ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy code</>}
                    </Button>
                </div>
                <div style={{ flex: '2 1 280px', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '0.85rem 1rem', minWidth: 0 }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Shareable link</div>
                    <div style={{ fontSize: '0.8rem', color: colors.text, margin: '4px 0 8px', wordBreak: 'break-all', lineHeight: 1.5 }}>{link}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Button small tone="ghost" onClick={() => copy(link, 'link')}>
                            {copied === 'link' ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy link</>}
                        </Button>
                        <a href={linkedinShare} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                            <Button small tone="ghost"><Share2 size={13} /> Share on LinkedIn</Button>
                        </a>
                    </div>
                </div>
            </div>

            <p style={{ margin: '0 0 1rem', fontSize: '0.78rem', color: colors.muted, lineHeight: 1.6 }}>
                People who register with your code are linked to you automatically. A member counts toward your goal once an admin approves their account.
            </p>

            {!data && !error && <div style={{ padding: '1rem', textAlign: 'center' }}><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} color={colors.faint} /></div>}
            {error && <Empty>{error}</Empty>}

            {data && (
                <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '0.7rem' }}>
                        <Pill tone="green">{counts.qualified || 0} approved</Pill>
                        <Pill tone="amber">{counts.pending || 0} awaiting approval</Pill>
                        {(counts.void || 0) > 0 && <Pill tone="gray">{counts.void} not counted</Pill>}
                    </div>
                    {data.referrals.length === 0 ? (
                        <Empty>No one has used your code yet. Share your link to get started.</Empty>
                    ) : (
                        <Table
                            minWidth={520}
                            columns={[{ label: 'Member' }, { label: 'Organisation' }, { label: 'Joined' }, { label: 'Status' }]}
                        >
                            {data.referrals.map((r) => {
                                const st = STATUS[r.status] || STATUS.pending;
                                return (
                                    <tr key={r.id}>
                                        <Td>{r.first_name || '—'}</Td>
                                        <Td muted>{r.organization_name || '—'}</Td>
                                        <Td muted>{fmtDate(r.created_at)}</Td>
                                        <Td><Pill tone={st.tone} title={r.void_reason || undefined}>{st.label}</Pill></Td>
                                    </tr>
                                );
                            })}
                        </Table>
                    )}
                </>
            )}
        </Card>
    );
};

export default ReferralPanel;
