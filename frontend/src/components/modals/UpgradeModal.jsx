import React from 'react';
import Modal from '../common/Modal.jsx';
import { FRAMEWORK_DOWNLOAD_ROLES, ROLE_LABELS } from '../../utils/constants.js';
import { useNavigate } from 'react-router-dom';

/**
 * Shown when a user with insufficient role tries to download a framework resource.
 * @param {{ isOpen: boolean, onClose: ()=>void }} props
 */
const UpgradeModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();

    const eligibleLabels = FRAMEWORK_DOWNLOAD_ROLES.map(
        (r) => ROLE_LABELS[r]
    ).join(', ');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Access Restricted" size="sm">
            <div style={{ fontFamily: 'var(--font-sans)' }}>
                <div
                    style={{
                        background: '#FFF7ED',
                        border: '1px solid #FED7AA',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem',
                        marginBottom: '1.25rem',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start',
                    }}
                >
                    <span style={{ fontSize: '1.25rem' }}>🔒</span>
                    <div>
                        <p
                            style={{
                                fontWeight: '700',
                                color: '#9A3412',
                                marginBottom: '0.25rem',
                                fontSize: '0.9rem',
                            }}
                        >
                            Upgrade Required
                        </p>
                        <p
                            style={{
                                color: '#9A3412',
                                fontSize: '0.85rem',
                                margin: 0,
                                lineHeight: '1.5',
                            }}
                        >
                            Framework downloads are available to:{' '}
                            <strong>{eligibleLabels}</strong>.
                        </p>
                    </div>
                </div>

                <p
                    style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.875rem',
                        marginBottom: '1.5rem',
                        lineHeight: '1.6',
                    }}
                >
                    Upgrade your membership to gain access to all research frameworks,
                    whitepapers, and member-exclusive content.
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.55rem 1.25rem',
                            border: '1px solid var(--border-medium)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'white',
                            color: 'var(--text-secondary)',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-sans)',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => { onClose(); navigate('/membership'); }}
                        style={{
                            padding: '0.55rem 1.5rem',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--primary)',
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-sans)',
                        }}
                    >
                        Upgrade Membership
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default UpgradeModal;
