import React, { useEffect, useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import Modal from '../../common/Modal.jsx';
import { patchUser } from '../../../api/admin.js';
import { getErrorMessage } from '../../../utils/apiHelpers.js';
import { COUNTRIES_PINNED, COUNTRIES_REST } from '../../../utils/countries.js';
import { colors, Avatar, Banner, Button, Pill, Segmented, Spinner, fieldStyle, labelStyle } from '../../ui/kit.jsx';
import { metaOfUser } from '../../../config/roles.js';
import SeatFields, { seatOf, seatPatch } from './SeatFields.jsx';
import UserHistory from './UserHistory.jsx';

const SUB_TYPES = [
    { value: 'working_professional', label: 'Working Professional' },
    { value: 'final_year_undergrad', label: 'Final-Year Undergrad' },
];

const TABS = [
    { value: 'profile', label: 'Profile' },
    { value: 'role', label: 'Role and chapter' },
    { value: 'history', label: 'History' },
];

const dateInput = (v) => {
    if (!v) return '';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

const profileOf = (u) => ({
    name: u.name || '',
    email: u.email || '',
    bio: u.bio || '',
    organization_name: u.organization_name || '',
    linkedin_url: u.linkedin_url || '',
    profile_badge: u.profile_badge || '',
    country_code: u.country_code || '',
    professional_sub_type: u.professional_sub_type || '',
    membership_expires_at: dateInput(u.membership_expires_at),
});

/** Only the profile fields that differ from what the person has now. An untouched field is never sent. */
const profilePatch = (form, user) => {
    const before = profileOf(user);
    const out = {};
    Object.keys(form).forEach((k) => {
        if (form[k] === before[k]) return;
        if (k === 'membership_expires_at') out[k] = form[k] ? new Date(`${form[k]}T23:59:59Z`).toISOString() : null;
        else out[k] = form[k] === '' && k !== 'name' && k !== 'email' ? null : form[k];
    });
    return out;
};

const Field = ({ id, label, hint, children }) => (
    <div>
        <label htmlFor={id} style={labelStyle}>{label}</label>
        {children}
        {hint && <p style={{ margin: '0.3rem 0 0', fontSize: '0.74rem', color: colors.muted, lineHeight: 1.5 }}>{hint}</p>}
    </div>
);

/**
 * Everything an administrator can change about one person, in one place and saved in one go:
 * profile details, role, and the chapter-team seat. What changed is written to the audit log and the person is
 * told (the server does both), so this screen only collects the edits.
 */
const UserEditModal = ({ user, isSelf, chapters, onClose, onSaved, showToast }) => {
    const [tab, setTab] = useState('profile');
    const [form, setForm] = useState(() => profileOf(user));
    const [seat, setSeat] = useState(() => seatOf(user));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { setForm(profileOf(user)); setSeat(seatOf(user)); setError(''); }, [user]);

    const before = useMemo(() => seatOf(user), [user]);
    const profileChanges = useMemo(() => profilePatch(form, user), [form, user]);
    const seatChanges = useMemo(() => seatPatch(seat, before), [seat, before]);
    const changeCount = Object.keys(profileChanges).length + (Object.keys(seatChanges).length ? 1 : 0);
    const profileDirty = Object.keys(profileChanges).length > 0;
    const seatDirty = Object.keys(seatChanges).length > 0;

    const isTeamSeat = seat.value.startsWith('council_member');
    const isAmbassadorSeat = seat.value === 'council_member|ambassador';
    const missingChapter = isAmbassadorSeat && !seat.chapter_id;
    const target = metaOfUser(user);
    const isFounder = user.role === 'founding_member';
    const expiryEditable = user.role !== 'council_member';

    const set = (patch) => setForm((f) => ({ ...f, ...patch }));

    const save = async (e) => {
        e.preventDefault();
        if (!changeCount) { showToast?.('Nothing to save.', 'info'); return; }
        if (missingChapter) { setTab('role'); setError('Choose the chapter this ambassador belongs to.'); return; }
        setSaving(true);
        setError('');
        try {
            await patchUser(user.id, { ...profileChanges, ...seatChanges });
            showToast?.(`${form.name || user.name} was updated.`, 'success');
            onSaved?.();
            onClose();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const tabLabel = (t) => {
        const dirty = (t.value === 'profile' && profileDirty) || (t.value === 'role' && seatDirty);
        return dirty ? `${t.label} *` : t.label;
    };

    return (
        <Modal isOpen onClose={() => !saving && onClose()} title="Manage user" size="lg">
            <form onSubmit={save} style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <Avatar name={user.name} size={44} tone={target.color} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, color: colors.text }}>{user.name}{isSelf && <span style={{ fontWeight: 500, color: colors.muted }}> (you)</span>}</div>
                        <div style={{ fontSize: '0.8rem', color: colors.muted }}>{user.email}</div>
                    </div>
                    <span style={{ display: 'inline-flex', gap: 6 }}>
                        <span style={{ padding: '2px 10px', borderRadius: 100, fontSize: '0.72rem', fontWeight: 700, background: target.bg, color: target.color, border: `1px solid ${target.border}` }}>{target.label}</span>
                        <Pill tone={user.status === 'approved' ? 'green' : user.status === 'pending' ? 'amber' : 'red'}>{user.status}</Pill>
                    </span>
                </div>

                <Segmented ariaLabel="Section" options={TABS.map((t) => ({ value: t.value, label: tabLabel(t) }))} value={tab} onChange={(v) => { setTab(v); setError(''); }} />

                {tab === 'profile' && (
                    <div style={{ display: 'grid', gap: '0.85rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                            <Field id="um-name" label="Full name">
                                <input id="um-name" required value={form.name} onChange={(e) => set({ name: e.target.value })} style={fieldStyle} disabled={saving} maxLength={255} />
                            </Field>
                            <Field id="um-email" label="Email address" hint={form.email !== user.email && !isSelf ? 'Changing the email signs them out everywhere. A warning goes to the old address.' : undefined}>
                                <input id="um-email" type="email" required value={form.email} onChange={(e) => set({ email: e.target.value })} style={fieldStyle} disabled={saving} />
                            </Field>
                        </div>
                        <Field id="um-bio" label="Bio">
                            <textarea id="um-bio" rows={3} value={form.bio} onChange={(e) => set({ bio: e.target.value })} style={{ ...fieldStyle, resize: 'vertical' }} disabled={saving} maxLength={2000} />
                        </Field>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                            <Field id="um-org" label="Organisation">
                                <input id="um-org" value={form.organization_name} onChange={(e) => set({ organization_name: e.target.value })} style={fieldStyle} disabled={saving} maxLength={255} />
                            </Field>
                            <Field id="um-linkedin" label="LinkedIn URL">
                                <input id="um-linkedin" value={form.linkedin_url} onChange={(e) => set({ linkedin_url: e.target.value })} style={fieldStyle} disabled={saving} />
                            </Field>
                            <Field id="um-country" label="Country">
                                <select id="um-country" value={form.country_code} onChange={(e) => set({ country_code: e.target.value })} style={fieldStyle} disabled={saving}>
                                    <option value="">Not set</option>
                                    <optgroup label="Popular">{COUNTRIES_PINNED.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</optgroup>
                                    <optgroup label="All countries">{COUNTRIES_REST.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</optgroup>
                                </select>
                            </Field>
                            <Field id="um-badge" label="Profile badge">
                                <input id="um-badge" value={form.profile_badge} onChange={(e) => set({ profile_badge: e.target.value })} style={fieldStyle} disabled={saving} maxLength={100} placeholder="e.g. Founding Council" />
                            </Field>
                            {user.role === 'professional' && (
                                <Field id="um-subtype" label="Professional type">
                                    <select id="um-subtype" value={form.professional_sub_type} onChange={(e) => set({ professional_sub_type: e.target.value })} style={fieldStyle} disabled={saving}>
                                        <option value="">Not set</option>
                                        {SUB_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </Field>
                            )}
                            {expiryEditable && (
                                <Field id="um-expiry" label="Membership expires" hint="Leave empty for no expiry.">
                                    <input id="um-expiry" type="date" value={form.membership_expires_at} onChange={(e) => set({ membership_expires_at: e.target.value })} style={fieldStyle} disabled={saving} />
                                </Field>
                            )}
                        </div>
                        {!expiryEditable && (
                            <p style={{ margin: 0, fontSize: '0.76rem', color: colors.muted }}>A chapter team member's expiry follows their term. Change the start date under Role and chapter.</p>
                        )}
                    </div>
                )}

                {tab === 'role' && (
                    <div style={{ display: 'grid', gap: '0.85rem' }}>
                        <SeatFields seat={seat} onChange={setSeat} chapters={chapters} currentChapterId={user.team_chapter_id} disabled={saving} roleLocked={isSelf} idPrefix="um-seat" />
                        {!isSelf && user.role === 'council_member' && !isTeamSeat && (
                            <Banner tone="warning" icon={ShieldAlert} title="This ends their chapter role">
                                They become a Professional, their referral code stops accepting sign-ups, and their history stays on record.
                                {user.tier === 'lead' && ' The chapter is left without a Chapter Lead and the other administrators are told.'}
                            </Banner>
                        )}
                        {!isSelf && (isFounder || seat.value.startsWith('founding_member')) && seat.value !== seatOf(user).value && (
                            <Banner tone="warning" icon={ShieldAlert} title="Founding Member access">
                                The other Founding Members are emailed when a Founding Member's role changes.
                            </Banner>
                        )}
                        <p style={{ margin: 0, fontSize: '0.76rem', color: colors.muted, lineHeight: 1.6 }}>
                            Earnings are their own choice: you can ask a Chapter Lead to choose again from the Chapter Teams tab, but you cannot choose for them.
                        </p>
                    </div>
                )}

                {tab === 'history' && <UserHistory userId={user.id} />}

                {error && <Banner tone="danger" title="Not saved">{error}</Banner>}

                {tab !== 'history' && (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ marginRight: 'auto', fontSize: '0.78rem', color: colors.muted }}>
                            {changeCount ? `${changeCount} unsaved change${changeCount === 1 ? '' : 's'}` : 'No changes yet'}
                        </span>
                        <Button tone="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
                        <Button type="submit" disabled={saving || !changeCount}>
                            {saving ? <Spinner size={14} color="#FFFFFF" /> : null} Save changes
                        </Button>
                    </div>
                )}
            </form>
        </Modal>
    );
};

export default UserEditModal;
