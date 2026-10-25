import React from 'react';
import { colors, fieldStyle, labelStyle } from '../../ui/kit.jsx';
import { SEAT_OPTIONS, TIER } from '../../../config/roles.js';
import { chapterOption } from '../chapterLeads/shared.jsx';

/**
 * Role + chapter-team seat for one person, used by both "Create user" and "Manage user" so the two always
 * agree. The role is one list (Professional, Chapter Ambassador, Chapter Lead, Founding Member); picking a
 * chapter-team role reveals the chapter, start date and the seat-limit override.
 *
 * seat: { value: 'council_member|ambassador', chapter_id: '', start: 'YYYY-MM-DD', override_cap: false }
 * chapters: rows from GET /admin/chapter-leads/chapters (has_lead, seats_left, ambassadors_active ...)
 */
const SeatFields = ({ seat, onChange, chapters = [], currentChapterId = null, disabled = false, roleLocked = false, idPrefix = 'seat' }) => {
    const option = SEAT_OPTIONS.find((o) => o.value === seat.value) || SEAT_OPTIONS[0];
    const isTeam = option.role === 'council_member';
    const tier = option.tier || null;
    const set = (patch) => onChange({ ...seat, ...patch });
    const chosen = chapters.find((c) => String(c.id) === String(seat.chapter_id));

    return (
        <div style={{ display: 'grid', gap: '0.85rem' }}>
            <div>
                <label htmlFor={`${idPrefix}-role`} style={labelStyle}>Role</label>
                <select
                    id={`${idPrefix}-role`}
                    value={seat.value}
                    onChange={(e) => set({ value: e.target.value })}
                    disabled={disabled || roleLocked}
                    style={fieldStyle}
                >
                    {SEAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {roleLocked && <p style={{ margin: '0.3rem 0 0', fontSize: '0.74rem', color: colors.muted }}>You cannot change your own role.</p>}
            </div>

            {isTeam && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                        <div>
                            <label htmlFor={`${idPrefix}-chapter`} style={labelStyle}>
                                Chapter{tier === TIER.AMBASSADOR ? '' : ' (optional)'}
                            </label>
                            <select
                                id={`${idPrefix}-chapter`}
                                value={seat.chapter_id}
                                onChange={(e) => set({ chapter_id: e.target.value })}
                                disabled={disabled}
                                required={tier === TIER.AMBASSADOR}
                                style={fieldStyle}
                            >
                                <option value="">{tier === TIER.AMBASSADOR ? 'Choose a chapter...' : 'Assign later'}</option>
                                {chapters.map((c) => <option key={c.id} value={c.id}>{chapterOption(c, tier, currentChapterId)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor={`${idPrefix}-start`} style={labelStyle}>{tier === TIER.LEAD ? 'Term start date' : 'Start date'} (optional)</label>
                            <input
                                id={`${idPrefix}-start`}
                                type="date"
                                value={seat.start}
                                onChange={(e) => set({ start: e.target.value })}
                                disabled={disabled}
                                style={fieldStyle}
                            />
                        </div>
                    </div>

                    {chosen && (
                        <p style={{ margin: 0, fontSize: '0.78rem', color: colors.muted, lineHeight: 1.6 }}>
                            {chosen.name} has {chosen.has_lead ? `a Chapter Lead (${chosen.lead_name})` : 'no Chapter Lead'} and {chosen.ambassadors_active} ambassador{chosen.ambassadors_active === 1 ? '' : 's'}
                            {chosen.seat_cap === null ? '.' : `, ${chosen.seats_left} of ${chosen.seat_cap} seats open.`}
                        </p>
                    )}

                    {tier === TIER.AMBASSADOR && chosen?.seats_left === 0 && String(chosen.id) !== String(currentChapterId) && (
                        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.8rem', color: colors.text, cursor: 'pointer' }}>
                            <input type="checkbox" checked={seat.override_cap} onChange={(e) => set({ override_cap: e.target.checked })} style={{ accentColor: colors.primary }} disabled={disabled} />
                            Allow this even though the chapter is at its ambassador limit
                        </label>
                    )}
                </>
            )}
        </div>
    );
};

/** The seat a user holds today, in the shape SeatFields edits. */
export const seatOf = (user) => ({
    value: user.role === 'council_member' ? `council_member|${user.tier === TIER.AMBASSADOR ? 'ambassador' : 'lead'}` : `${user.role || 'professional'}|`,
    chapter_id: user.team_chapter_id ? String(user.team_chapter_id) : '',
    start: user.team_started_at ? new Date(user.team_started_at).toISOString().slice(0, 10) : '',
    override_cap: false,
});

/** What to send for a seat: only what differs from `before` (a seat from seatOf), or everything for a new user. */
export const seatPatch = (seat, before = null) => {
    const option = SEAT_OPTIONS.find((o) => o.value === seat.value) || SEAT_OPTIONS[0];
    const out = {};
    const roleChanged = !before || before.value.split('|')[0] !== option.role;
    if (roleChanged) out.role = option.role;
    if (option.role !== 'council_member') return out;

    const tierChanged = !before || before.value !== seat.value;
    if (tierChanged || roleChanged) out.tier = option.tier;
    if (seat.chapter_id !== (before?.chapter_id ?? '') || roleChanged) { if (seat.chapter_id || before?.chapter_id) out.chapter_id = seat.chapter_id || ''; }
    if (seat.start && seat.start !== (before?.start ?? '')) out.term_started_at = new Date(`${seat.start}T00:00:00Z`).toISOString();
    if (seat.override_cap) out.override_cap = true;
    return out;
};

export default SeatFields;
