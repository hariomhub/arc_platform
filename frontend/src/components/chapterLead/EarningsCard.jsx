import React from 'react';
import { Wallet } from 'lucide-react';
import { colors, Card, SectionTitle, fmtDate } from './ui.jsx';

/**
 * Revenue share and commission rules for this lead. Amounts are not shown yet —
 * they appear once online payments are connected. Until then this card states the
 * rate that applies and what is already being recorded.
 */
const EarningsCard = ({ earnings, term }) => {
    if (!earnings || !term) return null;
    const row = (label, value, strong = false) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '0.45rem 0', borderBottom: '1px solid #F1F5F9', fontSize: '0.84rem' }}>
            <span style={{ color: colors.muted }}>{label}</span>
            <span style={{ color: colors.text, fontWeight: strong ? 800 : 600 }}>{value}</span>
        </div>
    );

    return (
        <Card>
            <SectionTitle icon={Wallet}>Revenue share</SectionTitle>
            {row(`Term ${term.number} revenue share`, `${earnings.current_rate}%`, true)}
            {row('Direct contributions commission', `${earnings.direct_commission}%`)}
            {row('This term ends', fmtDate(term.ends))}
            {row(`Term ${term.number + 1} rate`, `${term.next_rate}%`)}
            <p style={{ margin: '0.8rem 0 0', fontSize: '0.76rem', color: colors.muted, lineHeight: 1.6 }}>
                Earnings amounts will appear here once online payments are connected. Your referrals and hosted
                sessions are already being recorded, so nothing is lost in the meantime.
            </p>
        </Card>
    );
};

export default EarningsCard;
