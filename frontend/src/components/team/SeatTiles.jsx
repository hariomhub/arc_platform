import React from 'react';
import { colors, Avatar } from '../ui/kit.jsx';

/**
 * A chapter's ambassador seats as tiles: a filled tile for each ambassador, a dashed tile for each free
 * seat. Reads at a glance ("6 of 10") and is the same picture on the lead's page and the admin's.
 *
 * people: [{ name, photo_url }]   cap: number | null (no limit)
 */
const SeatTiles = ({ people = [], cap = null, size = 38, max = 24 }) => {
    const filled = people.length;
    const total = cap === null ? filled : cap;
    const shown = Math.min(total, max);
    const tiles = Array.from({ length: shown }, (_, i) => people[i] || null);
    const hidden = Math.max(0, total - shown);

    return (
        <div>
            <div role="img" aria-label={cap === null ? `${filled} ambassadors` : `${filled} of ${cap} ambassador seats filled`} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tiles.map((p, i) => (p ? (
                    <span key={`p${i}`} title={p.name}><Avatar name={p.name} photo={p.photo_url} size={size} tone={colors.primary} /></span>
                ) : (
                    <span
                        key={`e${i}`}
                        title="Open seat"
                        style={{ width: size, height: size, borderRadius: '50%', border: `1.5px dashed ${colors.border}`, background: '#FAFBFC' }}
                    />
                )))}
                {hidden > 0 && <span style={{ alignSelf: 'center', fontSize: '0.78rem', color: colors.muted, fontWeight: 700 }}>+{hidden} more</span>}
            </div>
            <div style={{ marginTop: 6, fontSize: '0.78rem', color: colors.muted }}>
                {cap === null ? `${filled} ambassador${filled === 1 ? '' : 's'}` : `${filled} of ${cap} seats filled`}
            </div>
        </div>
    );
};

export default SeatTiles;
