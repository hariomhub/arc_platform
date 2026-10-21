import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Check, X, Loader2 } from 'lucide-react';
import { getAdminChapters, createChapter, updateChapter } from '../../../api/adminChapterLeads.js';
import { getErrorMessage } from '../../../utils/apiHelpers.js';
import { COUNTRIES_PINNED, COUNTRIES_REST, countryName } from '../../../utils/countries.js';
import { colors, Card, SectionTitle, Pill, Empty, Table, Td, Button, fieldStyle, labelStyle } from '../../chapterLead/ui.jsx';
import { ErrorNote, Spinner } from './shared.jsx';

const CountrySelect = ({ value, onChange, id, disabled }) => (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} style={fieldStyle} disabled={disabled}>
        <option value="">Select a country…</option>
        <optgroup label="Popular">{COUNTRIES_PINNED.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</optgroup>
        <optgroup label="All countries">{COUNTRIES_REST.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</optgroup>
    </select>
);

/**
 * Chapters are the geographic areas a lead represents. Each chapter has at most one
 * active lead, and members pick a chapter at sign-up. Chapters are deactivated, never
 * deleted, so history stays attached to them.
 */
const ChaptersManager = ({ showToast, onChanged }) => {
    const [rows, setRows] = useState(null);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ name: '', country_code: '' });
    const [adding, setAdding] = useState(false);
    const [editId, setEditId] = useState(null);
    const [edit, setEdit] = useState({ name: '', country_code: '', status: 'active' });
    const [savingEdit, setSavingEdit] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await getAdminChapters();
            setRows(res.data?.data || []);
            setError('');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const add = async (e) => {
        e.preventDefault();
        if (form.name.trim().length < 2 || !form.country_code) { showToast?.('Enter a chapter name and choose a country.', 'warning'); return; }
        setAdding(true);
        try {
            await createChapter({ name: form.name.trim(), country_code: form.country_code });
            showToast?.('Chapter created.', 'success');
            setForm({ name: '', country_code: '' });
            await load();
            onChanged?.();
        } catch (err) {
            showToast?.(getErrorMessage(err), 'error');
        } finally {
            setAdding(false);
        }
    };

    const startEdit = (c) => { setEditId(c.id); setEdit({ name: c.name, country_code: c.country_code, status: c.status }); };

    const saveEdit = async () => {
        setSavingEdit(true);
        try {
            await updateChapter(editId, { name: edit.name.trim(), country_code: edit.country_code, status: edit.status });
            showToast?.('Chapter updated.', 'success');
            setEditId(null);
            await load();
            onChanged?.();
        } catch (err) {
            showToast?.(getErrorMessage(err), 'error');
        } finally {
            setSavingEdit(false);
        }
    };

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            <Card>
                <SectionTitle icon={Plus}>Add a chapter</SectionTitle>
                <form onSubmit={add} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.8rem', alignItems: 'end' }}>
                    <div>
                        <label htmlFor="ch-name" style={labelStyle}>Chapter name</label>
                        <input id="ch-name" value={form.name} maxLength={150} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Bengaluru, or California" style={fieldStyle} disabled={adding} />
                    </div>
                    <div>
                        <label htmlFor="ch-country" style={labelStyle}>Country</label>
                        <CountrySelect id="ch-country" value={form.country_code} onChange={(v) => setForm((p) => ({ ...p, country_code: v }))} disabled={adding} />
                    </div>
                    <div>
                        <Button type="submit" disabled={adding}>
                            {adding ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />} Add chapter
                        </Button>
                    </div>
                </form>
                <p style={{ margin: '0.7rem 0 0', fontSize: '0.76rem', color: colors.muted, lineHeight: 1.6 }}>
                    A chapter can be a country, state or city. Members choose one when they sign up, and each chapter can have one active Chapter Lead.
                </p>
            </Card>

            {error && <ErrorNote>{error}</ErrorNote>}
            {!rows && !error && <Spinner />}
            {rows && (
                <Card padded={false}>
                    {rows.length === 0 ? <Empty>No chapters yet. Add the first one above.</Empty> : (
                        <Table minWidth={720} columns={[{ label: 'Chapter' }, { label: 'Country' }, { label: 'Active lead' }, { label: 'Members', align: 'right' }, { label: 'Status' }, { label: '' }]}>
                            {rows.map((c) => (
                                editId === c.id ? (
                                    <tr key={c.id} style={{ background: '#F8FAFC' }}>
                                        <Td><input value={edit.name} maxLength={150} onChange={(e) => setEdit((p) => ({ ...p, name: e.target.value }))} style={fieldStyle} aria-label="Chapter name" /></Td>
                                        <Td><CountrySelect value={edit.country_code} onChange={(v) => setEdit((p) => ({ ...p, country_code: v }))} id={`ch-e-${c.id}`} /></Td>
                                        <Td muted>{c.lead_name || '—'}</Td>
                                        <Td align="right">{c.member_count}</Td>
                                        <Td>
                                            <select value={edit.status} onChange={(e) => setEdit((p) => ({ ...p, status: e.target.value }))} style={{ ...fieldStyle, width: 'auto' }} aria-label="Status">
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </Td>
                                        <Td align="right">
                                            <span style={{ display: 'inline-flex', gap: 6 }}>
                                                <Button small onClick={saveEdit} disabled={savingEdit}><Check size={12} /> Save</Button>
                                                <Button small tone="ghost" onClick={() => setEditId(null)} disabled={savingEdit}><X size={12} /></Button>
                                            </span>
                                        </Td>
                                    </tr>
                                ) : (
                                    <tr key={c.id}>
                                        <Td style={{ fontWeight: 700 }}>{c.name}</Td>
                                        <Td muted>{countryName(c.country_code)}</Td>
                                        <Td>{c.lead_name ? c.lead_name : <Pill tone="amber">No lead yet</Pill>}</Td>
                                        <Td align="right">{c.member_count}</Td>
                                        <Td>{c.status === 'active' ? <Pill tone="green">Active</Pill> : <Pill tone="gray">Inactive</Pill>}</Td>
                                        <Td align="right"><Button small tone="ghost" onClick={() => startEdit(c)}><Pencil size={12} /> Edit</Button></Td>
                                    </tr>
                                )
                            ))}
                        </Table>
                    )}
                </Card>
            )}
        </div>
    );
};

export default ChaptersManager;
