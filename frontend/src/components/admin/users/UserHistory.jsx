import React, { useEffect, useState } from 'react';
import { getUserAudit } from '../../../api/admin.js';
import { getErrorMessage } from '../../../utils/apiHelpers.js';
import { colors, Empty, fmtDate } from '../../ui/kit.jsx';
import { Spinner } from '../chapterLeads/shared.jsx';

const ACTION_LABEL = {
    'user.created': 'Account created',
    'user.approved': 'Account approved',
    'user.status_changed': 'Status changed',
    'user.profile_updated': 'Profile edited',
    'user.role_changed': 'Role changed',
    'user.password_reset': 'Password reset by an administrator',
    'user.deleted': 'Account deleted',
    'team.role_ended': 'Chapter role ended',
    'team.ambassador_removed': 'Removed as an ambassador',
    'team.hidden_from_public': 'Hidden from the public chapter pages',
    'team.shown_publicly': 'Shown on the public chapter pages again',
    'earnings.elected': 'Earnings choice made',
    'earnings.reset': 'Asked to choose earnings again',
    'application.withdrawn': 'Application withdrawn',
    'referral.reassigned': 'Referral moved',
};

const prettify = (action) => {
    const text = String(action || '').replace(/[._]/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
};

const WORDS = {
    council_member: 'chapter team', founding_member: 'Founding Member', professional: 'Professional',
    lead: 'Chapter Lead', ambassador: 'Chapter Ambassador',
};

const show = (v) => {
    if (v === null || v === undefined || v === '') return 'none';
    if (typeof v === 'string' && WORDS[v]) return WORDS[v];
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return s.length > 60 ? `${s.slice(0, 57)}...` : s;
};

/** "field: before -> after" for each key the entry recorded. */
const changes = (row) => {
    const before = row.before_json || {};
    const after = row.after_json || {};
    return Object.keys({ ...before, ...after }).slice(0, 5).map((k) => `${k === 'chapter_id' ? 'chapter' : k.replace(/_/g, ' ')}:${show(before[k])} → ${show(after[k])}`);
};

/** The change history of one person: who did what, and when. Newest first. */
const UserHistory = ({ userId }) => {
    const [rows, setRows] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let alive = true;
        getUserAudit(userId)
            .then((res) => { if (alive) setRows(res.data?.data || []); })
            .catch((err) => { if (alive) setError(getErrorMessage(err)); });
        return () => { alive = false; };
    }, [userId]);

    if (error) return <Empty>{error}</Empty>;
    if (!rows) return <Spinner />;
    if (rows.length === 0) return <Empty>Nothing recorded yet. Changes made from now on appear here.</Empty>;

    return (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 0 }}>
            {rows.map((r) => (
                <li key={r.id} style={{ display: 'grid', gridTemplateColumns: '112px 1fr', gap: 12, padding: '0.7rem 0', borderBottom: `1px solid ${colors.border}` }}>
                    <time dateTime={r.created_at} style={{ fontSize: '0.76rem', color: colors.faint, fontWeight: 700 }}>{fmtDate(r.created_at)}</time>
                    <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: colors.text }}>{ACTION_LABEL[r.action] || prettify(r.action)}</div>
                        <div style={{ fontSize: '0.76rem', color: colors.muted }}>by {r.actor_name || r.actor_label || 'the system'}</div>
                        {changes(r).map((line) => <div key={line} style={{ fontSize: '0.76rem', color: colors.muted, marginTop: 2 }}>{line}</div>)}
                        {r.reason && <div style={{ fontSize: '0.76rem', color: colors.muted, marginTop: 2, fontStyle: 'italic' }}>"{r.reason}"</div>}
                    </div>
                </li>
            ))}
        </ol>
    );
};

export default UserHistory;
