import React, { useState } from 'react';
import Modal from '../../common/Modal.jsx';
import { createAdminUser } from '../../../api/admin.js';
import { getErrorMessage } from '../../../utils/apiHelpers.js';
import { Banner, Button, Spinner, fieldStyle, labelStyle } from '../../ui/kit.jsx';
import SeatFields, { seatPatch } from './SeatFields.jsx';

const EMPTY = {
    name: '', email: '', password: '', organization_name: '', linkedin_url: '',
    professional_sub_type: 'working_professional', status: 'approved',
};
const EMPTY_SEAT = { value: 'professional|', chapter_id: '', start: '', override_cap: false };

const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' };

/** Creates an account directly (already approved, no sign-up needed), including a chapter-team seat. */
const CreateUserModal = ({ chapters, onClose, onCreated, showToast }) => {
    const [form, setForm] = useState(EMPTY);
    const [seat, setSeat] = useState(EMPTY_SEAT);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (patch) => setForm((f) => ({ ...f, ...patch }));
    const isProfessional = seat.value === 'professional|';

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const payload = { ...form, ...seatPatch(seat) };
            if (!isProfessional) delete payload.professional_sub_type;
            await createAdminUser(payload);
            showToast?.(`Account created for ${form.name}.`, 'success');
            onCreated?.();
            onClose();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen onClose={() => !saving && onClose()} title="Create user" size="lg">
            <form onSubmit={submit} style={{ display: 'grid', gap: '0.9rem' }}>
                <div style={grid}>
                    <div>
                        <label htmlFor="cu-name" style={labelStyle}>Full name</label>
                        <input id="cu-name" required value={form.name} onChange={(e) => set({ name: e.target.value })} style={fieldStyle} disabled={saving} maxLength={255} />
                    </div>
                    <div>
                        <label htmlFor="cu-email" style={labelStyle}>Email address</label>
                        <input id="cu-email" type="email" required value={form.email} onChange={(e) => set({ email: e.target.value })} style={fieldStyle} disabled={saving} />
                    </div>
                </div>
                <div>
                    <label htmlFor="cu-password" style={labelStyle}>Password</label>
                    <input id="cu-password" type="password" required autoComplete="new-password" value={form.password} onChange={(e) => set({ password: e.target.value })} style={fieldStyle} disabled={saving} />
                    <p style={{ margin: '0.3rem 0 0', fontSize: '0.74rem', color: '#64748B' }}>At least 8 characters, with one uppercase letter and one number. Share it with them directly.</p>
                </div>

                <SeatFields seat={seat} onChange={setSeat} chapters={chapters} disabled={saving} idPrefix="cu-seat" />

                <div style={grid}>
                    <div>
                        <label htmlFor="cu-org" style={labelStyle}>Organisation</label>
                        <input id="cu-org" required value={form.organization_name} onChange={(e) => set({ organization_name: e.target.value })} style={fieldStyle} disabled={saving} />
                    </div>
                    <div>
                        <label htmlFor="cu-linkedin" style={labelStyle}>LinkedIn URL</label>
                        <input id="cu-linkedin" required value={form.linkedin_url} onChange={(e) => set({ linkedin_url: e.target.value })} style={fieldStyle} disabled={saving} placeholder="https://linkedin.com/in/..." />
                    </div>
                    {isProfessional && (
                        <div>
                            <label htmlFor="cu-subtype" style={labelStyle}>Professional type</label>
                            <select id="cu-subtype" value={form.professional_sub_type} onChange={(e) => set({ professional_sub_type: e.target.value })} style={fieldStyle} disabled={saving}>
                                <option value="working_professional">Working Professional</option>
                                <option value="final_year_undergrad">Final-Year Undergrad</option>
                            </select>
                        </div>
                    )}
                    <div>
                        <label htmlFor="cu-status" style={labelStyle}>Starting status</label>
                        <select id="cu-status" value={form.status} onChange={(e) => set({ status: e.target.value })} style={fieldStyle} disabled={saving}>
                            <option value="approved">Approved (immediate access)</option>
                            <option value="pending">Pending (needs approval)</option>
                        </select>
                    </div>
                </div>

                {error && <Banner tone="danger" title="Not created">{error}</Banner>}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button tone="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button type="submit" disabled={saving}>{saving ? <Spinner size={14} color="#FFFFFF" /> : null} Create user</Button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateUserModal;
