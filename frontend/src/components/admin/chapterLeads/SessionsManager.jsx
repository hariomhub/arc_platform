import React, { useEffect, useState, useCallback } from 'react';
import { Mic, Users, CheckCircle2, Undo2, Loader2, Plus, X } from 'lucide-react';
import Modal from '../../common/Modal.jsx';
import { getSessions, getLeadOptions, setSessionHosts, markSessionConducted } from '../../../api/adminChapterLeads.js';
import { getErrorMessage } from '../../../utils/apiHelpers.js';
import { colors, Card, Pill, Empty, Table, Td, Button, fieldStyle, labelStyle, fmtDate } from '../../chapterLead/ui.jsx';
import { ErrorNote, Spinner } from './shared.jsx';

const FILTERS = [
    { key: 'needs', label: 'Needs marking' },
    { key: 'conducted', label: 'Conducted' },
    { key: 'all', label: 'All' },
];

const ROLE_LABEL = { host: 'Host', co_host: 'Co-host', speaker: 'Speaker' };

const isPast = (s) => new Date(s.date) <= new Date();

/**
 * Podcasts and workshops: who hosted them, and whether they actually happened.
 * "Conducted" is what makes a podcast count toward a lead's quarterly goal, so it
 * is set by an admin rather than assumed from the calendar.
 */
const SessionsManager = ({ showToast, onChanged }) => {
    const [filter, setFilter] = useState('needs');
    const [rows, setRows] = useState(null);
    const [leads, setLeads] = useState([]);
    const [error, setError] = useState('');
    const [busyKey, setBusyKey] = useState(null);

    const [editing, setEditing] = useState(null);   // session being edited
    const [draftHosts, setDraftHosts] = useState([]);
    const [addUser, setAddUser] = useState('');
    const [savingHosts, setSavingHosts] = useState(false);
    const [conductedOn, setConductedOn] = useState({}); // key -> yyyy-mm-dd

    const load = useCallback(async () => {
        try {
            const [s, l] = await Promise.all([getSessions(), getLeadOptions()]);
            setRows(s.data?.data || []);
            setLeads(l.data?.data || []);
            setError('');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const key = (s) => `${s.type}:${s.id}`;

    const toggleConducted = async (s, conducted) => {
        setBusyKey(key(s));
        try {
            const on = conductedOn[key(s)];
            await markSessionConducted(s.type, s.id, conducted, conducted && on ? new Date(`${on}T12:00:00Z`).toISOString() : undefined);
            showToast?.(conducted ? 'Marked as conducted.' : 'Conducted mark removed.', 'success');
            await load();
            onChanged?.();
        } catch (err) {
            showToast?.(getErrorMessage(err), 'error');
        } finally {
            setBusyKey(null);
        }
    };

    const openHosts = (s) => { setEditing(s); setDraftHosts(s.hosts.map((h) => ({ user_id: h.user_id, name: h.name, role: h.role }))); setAddUser(''); };

    const addHost = () => {
        const id = Number(addUser);
        if (!id || draftHosts.some((h) => h.user_id === id)) return;
        const lead = leads.find((l) => l.user_id === id);
        setDraftHosts((p) => [...p, { user_id: id, name: lead?.name || `User ${id}`, role: 'host' }]);
        setAddUser('');
    };

    const saveHosts = async () => {
        setSavingHosts(true);
        try {
            await setSessionHosts(editing.type, editing.id, draftHosts.map((h) => ({ user_id: h.user_id, role: h.role })));
            showToast?.('Hosts updated.', 'success');
            setEditing(null);
            await load();
            onChanged?.();
        } catch (err) {
            showToast?.(getErrorMessage(err), 'error');
        } finally {
            setSavingHosts(false);
        }
    };

    const shown = (rows || []).filter((s) => {
        if (filter === 'needs') return s.is_published && isPast(s) && !s.conducted_at;
        if (filter === 'conducted') return Boolean(s.conducted_at);
        return true;
    });

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {FILTERS.map((f) => (
                    <button key={f.key} type="button" onClick={() => setFilter(f.key)}
                        style={{ padding: '0.35rem 0.9rem', borderRadius: 100, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                            border: `1.5px solid ${filter === f.key ? colors.primary : colors.border}`, background: filter === f.key ? '#EEF4FF' : 'white', color: filter === f.key ? colors.primary : colors.muted }}>
                        {f.label}
                    </button>
                ))}
                <span style={{ fontSize: '0.76rem', color: colors.muted, marginLeft: 6 }}>
                    A podcast counts toward a lead&apos;s goal once it is published, has the lead as a host, and is marked conducted.
                </span>
            </div>

            {error && <ErrorNote>{error}</ErrorNote>}
            {!rows && !error && <Spinner />}
            {rows && (
                <Card padded={false}>
                    {shown.length === 0 ? <Empty>{filter === 'needs' ? 'Nothing is waiting to be marked.' : 'No sessions to show.'}</Empty> : (
                        <Table minWidth={860} columns={[{ label: 'Session' }, { label: 'Date' }, { label: 'Hosts' }, { label: 'Status' }, { label: 'Conducted' }]}>
                            {shown.map((s) => (
                                <tr key={key(s)}>
                                    <Td style={{ maxWidth: 260 }}>
                                        <div style={{ fontWeight: 700 }}>{s.title}</div>
                                        <Pill tone={s.category === 'podcast' ? 'purple' : 'blue'}>{s.category === 'podcast' ? 'Podcast' : 'Workshop'}</Pill>
                                    </Td>
                                    <Td muted>{fmtDate(s.date)}</Td>
                                    <Td>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                            {s.hosts.length === 0 && <span style={{ color: colors.faint, fontSize: '0.78rem' }}>No host</span>}
                                            {s.hosts.map((h) => <Pill key={h.user_id} tone="gray" title={ROLE_LABEL[h.role]}>{h.name}</Pill>)}
                                            <Button small tone="ghost" onClick={() => openHosts(s)}><Users size={12} /> Edit</Button>
                                        </div>
                                    </Td>
                                    <Td>{s.is_published ? <Pill tone="green">Published</Pill> : <Pill tone="amber">Draft</Pill>}</Td>
                                    <Td>
                                        {s.conducted_at ? (
                                            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                                <Pill tone="green"><CheckCircle2 size={11} style={{ verticalAlign: -2 }} /> {fmtDate(s.conducted_at)}</Pill>
                                                <Button small tone="ghost" disabled={busyKey === key(s)} onClick={() => toggleConducted(s, false)}><Undo2 size={12} /> Undo</Button>
                                            </span>
                                        ) : (
                                            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                                <input
                                                    type="date"
                                                    aria-label="Actual date it took place (optional)"
                                                    title="Actual date it took place. Leave empty to use the scheduled date."
                                                    value={conductedOn[key(s)] || ''}
                                                    onChange={(e) => setConductedOn((p) => ({ ...p, [key(s)]: e.target.value }))}
                                                    style={{ ...fieldStyle, width: 'auto', padding: '0.28rem 0.5rem', fontSize: '0.74rem' }}
                                                />
                                                <Button small disabled={busyKey === key(s) || !isPast(s)} onClick={() => toggleConducted(s, true)} title={isPast(s) ? '' : 'This session is in the future'}>
                                                    {busyKey === key(s) ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Mic size={12} />} Mark conducted
                                                </Button>
                                            </span>
                                        )}
                                    </Td>
                                </tr>
                            ))}
                        </Table>
                    )}
                </Card>
            )}

            <Modal isOpen={!!editing} onClose={() => !savingHosts && setEditing(null)} title="Hosts" size="md">
                {editing && (
                    <div style={{ display: 'grid', gap: '0.9rem' }}>
                        <div style={{ fontWeight: 800, color: colors.text }}>{editing.title}</div>
                        {draftHosts.length === 0 && <Empty>No hosts yet. Add the Chapter Lead(s) who hosted this session.</Empty>}
                        {draftHosts.map((h) => (
                            <div key={h.user_id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ flex: 1, fontWeight: 600, fontSize: '0.88rem' }}>{h.name}</span>
                                <select value={h.role} onChange={(e) => setDraftHosts((p) => p.map((x) => (x.user_id === h.user_id ? { ...x, role: e.target.value } : x)))} style={{ ...fieldStyle, width: 'auto' }}>
                                    {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </select>
                                <Button small tone="ghost" aria-label={`Remove ${h.name}`} onClick={() => setDraftHosts((p) => p.filter((x) => x.user_id !== h.user_id))}><X size={12} /></Button>
                            </div>
                        ))}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
                            <div style={{ flex: 1 }}>
                                <label htmlFor="host-add" style={labelStyle}>Add a Chapter Lead</label>
                                <select id="host-add" value={addUser} onChange={(e) => setAddUser(e.target.value)} style={fieldStyle}>
                                    <option value="">Select a lead…</option>
                                    {leads.filter((l) => !draftHosts.some((h) => h.user_id === l.user_id)).map((l) => (
                                        <option key={l.user_id} value={l.user_id}>{l.name}{l.chapter_name ? ` — ${l.chapter_name}` : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <Button tone="ghost" onClick={addHost} disabled={!addUser}><Plus size={14} /> Add</Button>
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <Button tone="ghost" onClick={() => setEditing(null)} disabled={savingHosts}>Cancel</Button>
                            <Button onClick={saveHosts} disabled={savingHosts}>
                                {savingHosts ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null} Save hosts
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default SessionsManager;
