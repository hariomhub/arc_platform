import React, { useState } from 'react';
import { Linkedin, User } from 'lucide-react';

export const CATEGORY_META = {
    permanent: { label: 'Permanent Member' },
    founding:  { label: 'Founding Member' },
};

const TeamCard = ({ member, onSelect }) => {
    const [imgError, setImgError] = useState(false);
    const cat = CATEGORY_META[member.member_category] || CATEGORY_META.founding;
    return (
        <div onClick={() => onSelect(member)} role="button" tabIndex={0} aria-label={`View ${member.name}'s bio`}
            onKeyDown={(e) => e.key === 'Enter' && onSelect(member)}
            style={{ background: 'white', borderRadius: '12px', padding: '2rem', textAlign: 'center', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,51,102,0.12)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.08)'; }}>
            <div style={{ width: '100px', height: '100px', margin: '0 auto 1.25rem', borderRadius: '50%', overflow: 'hidden', background: '#F0F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #E2E8F0' }}>
                {member.photo_url && !imgError ? (
                    <img src={member.photo_url} alt={member.name} onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : <User size={40} color="#CBD5E1" />}
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1A202C', marginBottom: '0.35rem' }}>{member.name}</h3>
            <p style={{ color: '#4A5568', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.5rem' }}>{member.role}</p>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.72rem', fontWeight: '500', color: '#94A3B8' }}>
                {cat.label}{!!member.is_governing_body && ' · Governing Body'}
            </p>
            {member.bio && (
                <p style={{ color: '#64748B', fontSize: '0.8rem', lineHeight: '1.5', margin: '0 auto 1.25rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {member.bio}
                </p>
            )}
            {member.linkedin_url && (
                <div style={{ color: '#0A66C2', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: '600', fontSize: '0.82rem' }}>
                    <Linkedin size={15} /> LinkedIn
                </div>
            )}
        </div>
    );
};

export default TeamCard;
