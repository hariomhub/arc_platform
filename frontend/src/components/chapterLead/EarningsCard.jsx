import React, { useState } from 'react';
import { Wallet, HeartHandshake } from 'lucide-react';
import { colors, Card, SectionTitle, Pill, Button, fmtDate } from '../ui/kit.jsx';
import EarningsChoice from '../team/EarningsChoice.jsx';

const STATE = {
    receive:    { tone: 'green', label: 'Receiving earnings' },
    waive:      { tone: 'blue',  label: 'Earnings waived (volunteer)' },
    not_chosen: { tone: 'amber', label: 'Not chosen yet' },
};

const Row = ({ label, value, strong = false }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '0.45rem 0', borderBottom: '1px solid #F1F5F9', fontSize: '0.84rem' }}>
        <span style={{ color: colors.muted }}>{label}</span>
        <span style={{ color: colors.text, fontWeight: strong ? 800 : 600 }}>{value}</span>
    </div>
);

/**
 * Chapter Leads: the revenue-share rules and the lead's own choice to receive or waive them.
 * Amounts appear once online payments are connected; until then this card states the rate that
 * would apply and what the lead has chosen.
 *
 * Chapter Ambassadors have no earnings, so they get a plain statement of that instead.
 */
const EarningsCard = ({ earnings, term, tier = 'lead', onChanged, showToast }) => {
    const [editing, setEditing] = useState(false);

    if (tier === 'ambassador') {
        return (
            <Card>
                <SectionTitle icon={HeartHandshake}>A volunteer role</SectionTitle>
                <p style={{ margin: 0, fontSize: '0.82rem', color: colors.muted, lineHeight: 1.65 }}>
                    Chapter Ambassador does not include revenue share, commission or workshop fees. What you do counts toward your chapter's results
                    and your progress here.
                </p>
            </Card>
        );
    }
    if (!earnings || !term) return null;

    const state = STATE[earnings.election?.choice] || STATE.not_chosen;
    const pending = earnings.election?.pending;

    const saved = (result) => {
        setEditing(false);
        showToast?.(result?.takes_effect_later ? `Saved. It takes effect on ${fmtDate(result.effective_from)}.` : 'Your choice has been saved.', 'success');
        onChanged?.();
    };

    return (
        <Card>
            <SectionTitle icon={Wallet} right={<Pill tone={state.tone}>{state.label}</Pill>}>Earnings</SectionTitle>
            <Row label={`Term ${term.number} revenue share`} value={`${earnings.current_rate}%`} strong />
            <Row label="Direct contributions commission" value={`${earnings.direct_commission}%`} />
            <Row label="This term ends" value={fmtDate(term.ends)} />
            <Row label={`Term ${term.number + 1} rate`} value={`${term.next_rate}%`} />

            {pending && (
                <p style={{ margin: '0.7rem 0 0', fontSize: '0.78rem', color: colors.blue, lineHeight: 1.55 }}>
                    From {fmtDate(pending.effective_from)} you will {pending.choice === 'receive' ? 'receive' : 'waive'} earnings.
                </p>
            )}

            {!editing ? (
                <div style={{ marginTop: '0.8rem' }}>
                    <Button small tone="ghost" onClick={() => setEditing(true)}>
                        {earnings.election?.choice === 'not_chosen' ? 'Make my choice' : 'Change my choice'}
                    </Button>
                </div>
            ) : (
                <div className="kit-enter" style={{ marginTop: '0.9rem', paddingTop: '0.9rem', borderTop: `1px solid ${colors.border}` }}>
                    <EarningsChoice tier="lead" election={earnings.election} onSaved={saved} />
                    <div style={{ marginTop: 8 }}><Button small tone="ghost" onClick={() => setEditing(false)}>Cancel</Button></div>
                </div>
            )}

            <p style={{ margin: '0.8rem 0 0', fontSize: '0.76rem', color: colors.muted, lineHeight: 1.6 }}>
                Earnings amounts will appear here once online payments are connected. Your referrals and hosted
                sessions are already being recorded, so nothing is lost in the meantime.
                {earnings.election?.choice === 'not_chosen' && !earnings.gate_on && ' You will be asked to choose before any payment is made.'}
            </p>
        </Card>
    );
};

export default EarningsCard;
