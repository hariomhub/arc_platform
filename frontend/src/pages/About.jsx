import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, Award, Users, Linkedin, X, User, AlertCircle, RefreshCw } from 'lucide-react';
import { getTeam } from '../api/team.js';
import { getErrorMessage } from '../utils/apiHelpers.js';

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
    <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#E2E8F0', margin: '0 auto 1rem', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: '16px', width: '60%', background: '#E2E8F0', borderRadius: '4px', margin: '0 auto 8px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: '12px', width: '40%', background: '#E2E8F0', borderRadius: '4px', margin: '0 auto', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
    </div>
);

// ─── Team Card ────────────────────────────────────────────────────────────────
const TeamCard = ({ member, onSelect }) => {
    const [imgError, setImgError] = useState(false);

    return (
        <div
            onClick={() => onSelect(member)}
            role="button"
            tabIndex={0}
            aria-label={`View ${member.name}'s bio`}
            onKeyDown={(e) => e.key === 'Enter' && onSelect(member)}
            style={{
                background: 'white', borderRadius: '12px', padding: '2rem',
                textAlign: 'center', border: '1px solid #E2E8F0',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)',
                cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,51,102,0.12)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.08)'; }}
        >
            <div
                style={{
                    width: '100px', height: '100px', margin: '0 auto 1.25rem',
                    borderRadius: '50%', overflow: 'hidden', background: '#F0F4F8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '3px solid #E2E8F0',
                }}
            >
                {member.photo_url && !imgError ? (
                    <img
                        src={member.photo_url}
                        alt={member.name}
                        onError={() => setImgError(true)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <User size={40} color="#CBD5E1" />
                )}
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1A202C', marginBottom: '0.35rem' }}>
                {member.name}
            </h3>
            <p style={{ color: '#4A5568', fontSize: '0.85rem', fontWeight: '500', marginBottom: '1rem' }}>
                {member.role}
            </p>
            {member.linkedin_url && (
                <div onClick={(e) => e.stopPropagation()}>
                    <a
                        href={member.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#0A66C2', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none', fontWeight: '600', fontSize: '0.82rem' }}
                    >
                        <Linkedin size={15} /> LinkedIn
                    </a>
                </div>
            )}
        </div>
    );
};

// ─── Bio Modal ────────────────────────────────────────────────────────────────
const BioModal = ({ member, onClose }) => {
    const [imgError, setImgError] = useState(false);
    const closeBtnRef = useRef(null);

    useEffect(() => {
        closeBtnRef.current?.focus();
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={onClose}
            aria-modal="true"
            role="dialog"
            aria-label={`${member.name}'s biography`}
        >
            <div
                style={{ background: 'white', borderRadius: '16px', padding: '2.5rem', maxWidth: '580px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', position: 'relative', maxHeight: '85vh', overflowY: 'auto', animation: 'modal-fade-in 0.2s ease-out' }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    ref={closeBtnRef}
                    onClick={onClose}
                    aria-label="Close bio"
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', padding: '4px' }}
                >
                    <X size={22} />
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: '110px', height: '110px', borderRadius: '50%', overflow: 'hidden', background: '#F0F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #E2E8F0' }}>
                        {member.photo_url && !imgError ? (
                            <img src={member.photo_url} alt={member.name} onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <User size={44} color="#CBD5E1" />
                        )}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1A202C', marginBottom: '4px' }}>{member.name}</h2>
                        <p style={{ fontSize: '0.95rem', color: '#003366', fontWeight: '600' }}>{member.role}</p>
                    </div>
                </div>

                {member.bio ? (
                    <div style={{ fontSize: '0.95rem', color: '#4A5568', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                        {member.bio}
                    </div>
                ) : (
                    <p style={{ color: '#94A3B8', textAlign: 'center', fontStyle: 'italic' }}>No biography available.</p>
                )}

                {member.linkedin_url && (
                    <div style={{ marginTop: '1.5rem', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem', display: 'flex', justifyContent: 'center' }}>
                        <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0A66C2', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '0.95rem' }}>
                            <Linkedin size={18} /> Connect on LinkedIn
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── About ────────────────────────────────────────────────────────────────────
const About = () => {
    const [team, setTeam] = useState([]);
    const [teamLoading, setTeamLoading] = useState(true);
    const [teamError, setTeamError] = useState('');
    const [selectedMember, setSelectedMember] = useState(null);

    useEffect(() => {
        document.title = 'About Us | AI Risk Council';
    }, []);

    const fetchTeam = useCallback(async (signal) => {
        setTeamLoading(true);
        setTeamError('');
        try {
            const res = await getTeam({ limit: 100 });
            if (!signal?.aborted) {
                setTeam(res.data?.data || []);
            }
        } catch (err) {
            if (!signal?.aborted) setTeamError(getErrorMessage(err) || 'Failed to load team.');
        } finally {
            if (!signal?.aborted) setTeamLoading(false);
        }
    }, []);

    useEffect(() => {
        const ctrl = new AbortController();
        fetchTeam(ctrl.signal);
        return () => ctrl.abort();
    }, [fetchTeam]);

    const handleCloseBio = useCallback(() => setSelectedMember(null), []);

    return (
        <>
            {/* ── Header ───────────────────────────────────────────────────── */}
            <div style={{ background: 'linear-gradient(135deg, #002244 0%, #003366 100%)', padding: '5rem 2rem', textAlign: 'center' }}>
                <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                    <h1 style={{ color: 'white', fontSize: '2.75rem', fontWeight: '800', marginBottom: '1rem', fontFamily: 'var(--font-serif)' }}>
                        About the Council
                    </h1>
                    <p style={{ fontSize: '1.2rem', color: '#CBD5E1', lineHeight: '1.7' }}>
                        Advancing the global standard for Artificial Intelligence governance through independent research, rigorous assessment frameworks, and expert collaboration.
                    </p>
                </div>
            </div>

            {/* ── Mission ──────────────────────────────────────────────────── */}
            <div style={{ background: 'white', padding: '5rem 2rem', borderBottom: '1px solid #E2E8F0' }}>
                <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', alignItems: 'start' }}>
                        <div>
                            <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#1A202C', marginBottom: '1.25rem' }}>Our Mission</h2>
                            <p style={{ fontSize: '1.05rem', color: '#4A5568', lineHeight: '1.8', marginBottom: '1.25rem' }}>
                                To empower organisations to deploy Artificial Intelligence technology safely, ethically, and responsibly. We provide comprehensive insight reports and security assessments to help you align with global frameworks.
                            </p>
                            <p style={{ fontSize: '1.05rem', color: '#4A5568', lineHeight: '1.8' }}>
                                As an independent service provider, we operate free from vendor influence, focusing strictly on delivering actionable insights tailored to your framework dependencies.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gap: '2rem' }}>
                            {[
                                { icon: Shield, title: 'Independence', desc: 'Unbiased research and standards not tied to any specific tech platform or lobby.' },
                                { icon: Award, title: 'Excellence', desc: 'Rigorous, peer-reviewed methodologies developed by world-class risk professionals.' },
                                { icon: Users, title: 'Collaboration', desc: 'A global network of regulators, academics, and industry leaders.' },
                            ].map(({ icon: Icon, title, desc }) => (
                                <div key={title} style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                                    <div style={{ background: '#F0F4F8', padding: '0.85rem', borderRadius: '50%', flexShrink: 0 }}>
                                        <Icon size={28} color="#003366" />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#1A202C', marginBottom: '0.4rem' }}>{title}</h3>
                                        <p style={{ color: '#4A5568', lineHeight: '1.7', margin: 0 }}>{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Council Components ───────────────────────────────────────── */}
            <div style={{ background: '#F0F4F8', padding: '5rem 2rem' }}>
                <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#1A202C', marginBottom: '0.5rem' }}>Council Components</h2>
                        <p style={{ color: '#64748B', fontSize: '1rem' }}>The three pillars of the AI Risk Council</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {[
                            { title: 'Risk Advisory', desc: 'Providing specialised insight reports for organisations dependent on distinct AI frameworks to ensure robust security and compliance.', accent: '#003366' },
                            { title: 'Research Institute', desc: 'Dedicated team publishing quarterly risk assessments and emerging threat analyses across all major AI risk domains.', accent: '#0055A4' },
                            { title: 'Assessment Committee', desc: 'Oversees the certification of external auditors and validates compliance reports against global standards.', accent: '#4A5568' },
                        ].map(({ title, desc, accent }) => (
                            <div key={title} style={{ background: 'white', padding: '2rem', borderRadius: '12px', borderTop: `4px solid ${accent}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1A202C', marginBottom: '0.75rem' }}>{title}</h3>
                                <p style={{ color: '#4A5568', lineHeight: '1.7', margin: 0 }}>{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Team Grid ────────────────────────────────────────────────── */}
            <div style={{ background: 'white', padding: '5rem 2rem' }}>
                <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#1A202C', marginBottom: '0.5rem' }}>Leadership &amp; Contributors</h2>
                        <p style={{ color: '#64748B', fontSize: '1rem' }}>Meet the experts guiding our initiatives</p>
                    </div>

                    {/* Loading */}
                    {teamLoading && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }} aria-busy="true" aria-label="Loading team members">
                            {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
                        </div>
                    )}

                    {/* Error */}
                    {teamError && !teamLoading && (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#EF4444' }}>
                            <AlertCircle size={36} style={{ marginBottom: '1rem', opacity: 0.6 }} />
                            <p style={{ marginBottom: '1rem' }}>{teamError}</p>
                            <button
                                onClick={() => fetchTeam()}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#003366', color: 'white', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}
                            >
                                <RefreshCw size={15} /> Try Again
                            </button>
                        </div>
                    )}

                    {/* Empty */}
                    {!teamLoading && !teamError && team.length === 0 && (
                        <p style={{ textAlign: 'center', color: '#94A3B8', padding: '3rem' }}>No team members have been added yet.</p>
                    )}

                    {/* Team cards */}
                    {!teamLoading && !teamError && team.length > 0 && (
                        <div
                            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}
                            aria-live="polite"
                        >
                            {team.map((member) => (
                                <TeamCard key={member.id} member={member} onSelect={setSelectedMember} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Bio Modal ────────────────────────────────────────────────── */}
            {selectedMember && <BioModal member={selectedMember} onClose={handleCloseBio} />}
        </>
    );
};

export default About;
