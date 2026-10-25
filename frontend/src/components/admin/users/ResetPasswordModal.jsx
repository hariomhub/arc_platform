import React, { useState } from 'react';
import Modal from '../../common/Modal.jsx';
import { resetUserPassword } from '../../../api/admin.js';
import { getErrorMessage } from '../../../utils/apiHelpers.js';
import { colors, Banner, Button, Spinner, fieldStyle, labelStyle } from '../../ui/kit.jsx';

/**
 * Sets a new password for someone who is locked out. They are signed out on every device and emailed that the
 * password changed (the email never contains it), and if they are a Founding Member the others are alerted.
 */
const ResetPasswordModal = ({ user, onClose, showToast }) => {
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await resetUserPassword(user.id, password);
            showToast?.(`Password reset for ${user.name}.`, 'success');
            onClose();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen onClose={() => !saving && onClose()} title={`Reset password: ${user.name}`} size="sm">
            <form onSubmit={submit} style={{ display: 'grid', gap: '0.9rem' }}>
                <div>
                    <label htmlFor="rp-password" style={labelStyle}>New password</label>
                    <input id="rp-password" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} style={fieldStyle} disabled={saving} />
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.76rem', color: colors.muted, lineHeight: 1.6 }}>
                        At least 8 characters, with one uppercase letter and one number. Tell them the password directly; it is not emailed.
                    </p>
                </div>
                <Banner tone="info">
                    They are signed out everywhere and get an email saying their password changed.
                    {user.role === 'founding_member' && ' The other Founding Members are alerted too.'}
                </Banner>
                {error && <Banner tone="danger" title="Not reset">{error}</Banner>}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button tone="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button type="submit" disabled={saving || !password}>{saving ? <Spinner size={14} color="#FFFFFF" /> : null} Reset password</Button>
                </div>
            </form>
        </Modal>
    );
};

export default ResetPasswordModal;
