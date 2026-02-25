import React from 'react';
import Modal from '../common/Modal.jsx';
import { ExternalLink } from 'lucide-react';

/**
 * Team member bio modal.
 * @param {{ isOpen: boolean, onClose: ()=>void, member: object|null }} props
 */
const BioModal = ({ isOpen, onClose, member }) => {
    if (!member) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={member.name} size="sm">
            <div style={{ fontFamily: 'var(--font-sans)', textAlign: 'center' }}>
                {/* Photo */}
                {member.photo_url ? (
                    <img
                        src={member.photo_url}
                        alt={member.name}
                        style={{
                            width: '96px',
                            height: '96px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            marginBottom: '1rem',
                            border: '3px solid var(--border-light)',
                        }}
                    />
                ) : (
                    <div
                        style={{
                            width: '96px',
                            height: '96px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2rem',
                            fontWeight: '700',
                            margin: '0 auto 1rem',
                        }}
                    >
                        {member.name?.charAt(0).toUpperCase()}
                    </div>
                )}

                <h3
                    style={{
                        fontFamily: 'var(--font-serif)',
                        color: 'var(--primary)',
                        fontSize: '1.2rem',
                        marginBottom: '0.25rem',
                    }}
                >
                    {member.name}
                </h3>
                <p
                    style={{
                        color: 'var(--text-light)',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        marginBottom: '1rem',
                    }}
                >
                    {member.role}
                </p>

                {member.bio && (
                    <p
                        style={{
                            color: 'var(--text-secondary)',
                            fontSize: '0.9rem',
                            lineHeight: '1.7',
                            textAlign: 'left',
                            marginBottom: '1rem',
                        }}
                    >
                        {member.bio}
                    </p>
                )}

                {member.linkedin_url && (
                    <a
                        href={member.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            color: 'var(--accent)',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                        }}
                    >
                        <ExternalLink size={14} aria-hidden="true" />
                        View LinkedIn Profile
                    </a>
                )}
            </div>
        </Modal>
    );
};

export default BioModal;
