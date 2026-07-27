import React, { useState, useEffect, useRef } from 'react';
import { Linkedin, X, User, Mail } from 'lucide-react';

const TeamBioModal = ({ member, onClose }) => {
    const [imgError, setImgError] = useState(false);
    const closeBtnRef = useRef(null);
    useEffect(() => {
        closeBtnRef.current?.focus();
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={onClose} aria-modal="true" role="dialog" aria-label={`${member.name}'s biography`}>
            <div style={{ background: 'white', borderRadius: '16px', padding: 'clamp(1.5rem,4vw,2.5rem)', maxWidth: '580px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', position: 'relative', maxHeight: '90dvh', overflowY: 'auto' }}
                onClick={(e) => e.stopPropagation()}>
                <button ref={closeBtnRef} onClick={onClose} aria-label="Close bio"
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', padding: '4px' }}>
                    <X size={22} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: '110px', height: '110px', borderRadius: '50%', overflow: 'hidden', background: '#F0F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #E2E8F0' }}>
                        {member.photo_url && !imgError ? (
                            <img src={member.photo_url} alt={member.name} onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : <User size={44} color="#CBD5E1" />}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ fontSize: 'clamp(1.25rem,4vw,1.6rem)', fontWeight: '800', color: '#1A202C', marginBottom: '4px' }}>{member.name}</h2>
                        <p style={{ fontSize: '0.95rem', color: '#003366', fontWeight: '600' }}>{member.role}</p>
                    </div>
                </div>
                {member.bio ? (
                    <div style={{ fontSize: '0.95rem', color: '#4A5568', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{member.bio}</div>
                ) : (
                    <p style={{ color: '#94A3B8', textAlign: 'center', fontStyle: 'italic' }}>No biography available.</p>
                )}
                {(member.linkedin_url || member.email) && (
                    <div style={{ marginTop: '1.5rem', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                        {member.email && (
                            <a href={`mailto:${member.email}`}
                                style={{ color: '#D97706', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '0.95rem' }}>
                                <Mail size={18} /> Email Contact
                            </a>
                        )}
                        {member.linkedin_url && (
                            <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer"
                                style={{ color: '#0A66C2', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '0.95rem' }}>
                                <Linkedin size={18} /> Connect on LinkedIn
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamBioModal;
