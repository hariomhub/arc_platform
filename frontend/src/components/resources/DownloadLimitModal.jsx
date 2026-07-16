import React, { useState, useEffect } from 'react';
import { Download, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import Modal from '../common/Modal.jsx';
import { getMyDownloadUsage } from '../../api/resources.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';

/**
 * Shown before every resource download — fetches the member's current monthly quota
 * and displays it, so they know where they stand before committing. Blocks the action
 * entirely once the limit (already enforced server-side) is reached.
 */
const DownloadLimitModal = ({ isOpen, onClose, onConfirm, confirming }) => {
    const [usage, setUsage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true); setError(''); setUsage(null);
        getMyDownloadUsage()
            .then((res) => setUsage(res.data?.data))
            .catch((err) => setError(getErrorMessage(err)))
            .finally(() => setLoading(false));
    }, [isOpen]);

    const blocked = usage && !usage.can_download;
    const remaining = usage && !usage.unlimited ? Math.max(0, usage.limit - usage.used) : null;
    const resetDate = usage?.resets_on
        ? new Date(usage.resets_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : '';
    const pct = usage && !usage.unlimited ? Math.min(100, (usage.used / usage.limit) * 100) : 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Download Resource" size="sm">
            {loading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '1.5rem 0', color: '#64748B' }}>
                    <Loader2 size={20} style={{ animation: 'dlm-spin 1s linear infinite' }} /> Checking your download quota…
                </div>
            )}
            {error && !loading && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: '#DC2626', fontSize: '0.85rem' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} /> {error}
                </div>
            )}
            {usage && !loading && (
                <div>
                    {usage.unlimited ? (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '0.9rem 1rem' }}>
                            <CheckCircle2 size={18} color="#16A34A" style={{ flexShrink: 0, marginTop: 1 }} />
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534', lineHeight: 1.6 }}>You have <strong>unlimited downloads</strong> as a Chapter Lead.</p>
                        </div>
                    ) : blocked ? (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '0.9rem 1rem' }}>
                            <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                            <div>
                                <p style={{ margin: '0 0 4px', fontSize: '0.85rem', fontWeight: 700, color: '#991B1B' }}>You've used all {usage.limit} downloads this month</p>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#991B1B', lineHeight: 1.6 }}>Your limit resets on {resetDate}.</p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>Monthly downloads</span>
                                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>{usage.used} of {usage.limit} used</span>
                            </div>
                            <div style={{ height: 8, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: pct >= 90 ? '#DC2626' : pct >= 70 ? '#F59E0B' : '#003366', borderRadius: 99, transition: 'width 0.3s ease' }} />
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#374151', lineHeight: 1.6 }}>
                                You have <strong>{remaining}</strong> download{remaining !== 1 ? 's' : ''} remaining this month. Proceed to download this resource?
                            </p>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '1.5rem' }}>
                        <button onClick={onClose}
                            style={{ padding: '0.6rem 1.1rem', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                            {blocked ? 'Close' : 'Cancel'}
                        </button>
                        {!blocked && (
                            <button onClick={onConfirm} disabled={confirming}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.6rem 1.25rem', background: confirming ? '#94A3B8' : '#003366', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.84rem', cursor: confirming ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                                {confirming ? <><Loader2 size={14} style={{ animation: 'dlm-spin 1s linear infinite' }} /> Downloading…</> : <><Download size={14} /> Proceed to Download</>}
                            </button>
                        )}
                    </div>
                </div>
            )}
            <style>{`@keyframes dlm-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
        </Modal>
    );
};

export default DownloadLimitModal;
