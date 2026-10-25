import React from 'react';
import { Pill, colors } from '../../chapterLead/ui.jsx';
import { TIER, tierLabel } from '../../../config/roles.js';
import { countryName } from '../../../utils/countries.js';

/** Standing of a lead, as the admin sees it. */
export const StandingPill = ({ standing, misses = 0 }) => {
    const map = {
        ok:      { tone: 'green', label: 'Good standing' },
        warning: { tone: 'amber', label: `${misses} missed` },
        at_risk: { tone: 'red',   label: `Final warning (${misses} missed)` },
        review:  { tone: 'red',   label: `Needs review (${misses} missed)` },
        ended:   { tone: 'gray',  label: 'Ended' },
    };
    const s = map[standing] || map.ok;
    return <Pill tone={s.tone}>{s.label}</Pill>;
};

/** Chapter Lead or Chapter Ambassador, coloured like the role badge elsewhere. */
export const TierPill = ({ tier }) => <Pill tone={tier === TIER.AMBASSADOR ? 'green' : 'blue'}>{tierLabel(tier)}</Pill>;

const EARNINGS = {
    receive:    { tone: 'green', label: 'Receives earnings' },
    waive:      { tone: 'gray',  label: 'Volunteer (waived)' },
    not_chosen: { tone: 'amber', label: 'Not chosen yet' },
};

/** A lead's earnings choice. Ambassadors are volunteers, so they have none to show. */
export const EarningsPill = ({ earnings, tier }) => {
    if (tier === TIER.AMBASSADOR) return <Pill tone="gray">Volunteer</Pill>;
    const e = EARNINGS[earnings?.choice] || EARNINGS.not_chosen;
    const next = earnings?.pending ? `Changes to "${earnings.pending.choice}" on ${earnings.pending.effective_from}` : undefined;
    return <Pill tone={e.tone} title={next}>{e.label}{earnings?.pending ? ' *' : ''}</Pill>;
};

/** What a chapter dropdown says about a chapter, for the role the person would hold there. */
export const chapterOption = (c, tier, currentChapterId) => {
    const here = c.id === currentChapterId;
    let note = '';
    if (!here && tier === TIER.LEAD && c.has_lead) note = ' - has a lead';
    if (!here && tier === TIER.AMBASSADOR && c.seats_left === 0) note = ' - full';
    return `${c.name} (${countryName(c.country_code)})${note}`;
};

const PACE_COLOR = { done: colors.green, on_track: colors.blue, behind: colors.amber };

/** Four tiny progress bars for the current quarter, one per goal. */
export const MiniGoals = ({ goals = [], dim = false }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(46px, 1fr))', gap: 8, minWidth: 220 }}>
        {goals.map((g) => {
            const pct = g.target > 0 ? Math.min(100, Math.round((g.actual / g.target) * 100)) : 100;
            return (
                <div key={g.key} title={`${g.label}: ${g.actual} of ${g.target}`}>
                    <div style={{ fontSize: '0.68rem', color: colors.muted, fontWeight: 700, marginBottom: 2, whiteSpace: 'nowrap' }}>
                        {g.actual}/{g.target}
                    </div>
                    <div style={{ height: 5, borderRadius: 100, background: '#E2E8F0', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: dim ? colors.faint : (PACE_COLOR[g.pace] || colors.blue) }} />
                    </div>
                    <div style={{ fontSize: '0.6rem', color: colors.faint, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {g.key === 'members' ? 'Members' : g.key === 'podcasts' ? 'Pods' : g.key === 'posts' ? 'Posts' : 'Blogs'}
                    </div>
                </div>
            );
        })}
    </div>
);

export const ErrorNote = ({ children }) => (
    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', borderRadius: 8, padding: '0.6rem 0.85rem', fontSize: '0.84rem' }}>
        {children}
    </div>
);

export const Spinner = () => (
    <div style={{ padding: '2rem', textAlign: 'center', color: colors.faint, fontSize: '0.85rem' }}>
        <span style={{ display: 'inline-block', width: 20, height: 20, border: '3px solid #E2E8F0', borderTopColor: colors.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
);

/** yyyy-mm-dd for <input type="date"> from any date-ish value. */
export const toDateInput = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};
