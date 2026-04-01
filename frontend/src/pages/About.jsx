import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, Award, Users, BookOpen, Target, Linkedin, X, User, AlertCircle, RefreshCw, Mail } from 'lucide-react';
import { getTeam } from '../api/team.js';
import { getErrorMessage } from '../utils/apiHelpers.js';

const SkeletonCard = () => (
    <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#E2E8F0', margin: '0 auto 1rem', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: '16px', width: '60%', background: '#E2E8F0', borderRadius: '4px', margin: '0 auto 8px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: '12px', width: '40%', background: '#E2E8F0', borderRadius: '4px', margin: '0 auto', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
    </div>
);

const TeamCard = ({ member, onSelect }) => {
    const [imgError, setImgError] = useState(false);
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
            <p style={{ color: '#4A5568', fontSize: '0.85rem', fontWeight: '500', marginBottom: member.bio ? '0.75rem' : '1rem' }}>{member.role}</p>
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

const About = () => {
    const [team, setTeam] = useState([]);
    const [teamLoading, setTeamLoading] = useState(true);
    const [teamError, setTeamError] = useState('');
    const [selectedMember, setSelectedMember] = useState(null);

    useEffect(() => { document.title = 'About Us | AI Risk Council'; }, []);

    const fetchTeam = useCallback(async (signal) => {
        setTeamLoading(true); setTeamError('');
        try {
            const res = await getTeam({ limit: 100 });
            if (!signal?.aborted) setTeam(res.data?.data || []);
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
            <style>{`@keyframes skeleton-pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>

            {/* Hero */}
            <div style={{ background: 'linear-gradient(135deg,#002244 0%,#003366 100%)', padding: 'clamp(1.5rem,3.5vw,2.5rem) clamp(1rem,4vw,2rem)', textAlign: 'center' }}>
                <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                    <h1 style={{ color: 'white', fontSize: 'clamp(1.75rem,5vw,2.75rem)', fontWeight: '800', marginBottom: '1rem', fontFamily: 'var(--font-serif)' }}>About the Council</h1>
                    <p style={{ fontSize: 'clamp(0.95rem,1.5vw,1.2rem)', color: '#CBD5E1', lineHeight: '1.7' }}>
                        Advancing the global standard for Artificial Intelligence governance through independent research, rigorous assessment frameworks, and expert collaboration.
                    </p>
                </div>
            </div>

            {/* Mission */}
            <div style={{ background: 'white', padding: 'clamp(1.5rem,3vw,2.5rem) clamp(1rem,4vw,2rem)', borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(300px,100%),1fr))', gap: 'clamp(2rem,5vw,4rem)', alignItems: 'start' }}>
                        <div>
                            <h2 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: '800', color: '#1A202C', marginBottom: '1.25rem' }}>Our Mission</h2>
                            <p style={{ fontSize: 'clamp(0.9rem,1.5vw,1.05rem)', color: '#4A5568', lineHeight: '1.8', marginBottom: '1.25rem' }}>
                                To empower organisations to deploy Artificial Intelligence technology safely, ethically, and responsibly. We provide comprehensive insight reports and security assessments to help you align with global frameworks.
                            </p>
                            <p style={{ fontSize: 'clamp(0.9rem,1.5vw,1.05rem)', color: '#4A5568', lineHeight: '1.8' }}>
                                As an independent service provider, we focus strictly on delivering actionable insights tailored to your framework dependencies.
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

                    {/* What Defines Us */}
                    <div style={{ marginTop: '4rem', paddingTop: '3.5rem', borderTop: '1px solid #E2E8F0' }}>
                        <h3 style={{ fontSize: 'clamp(1.1rem,2.5vw,1.35rem)', fontWeight: '800', color: '#1A202C', marginBottom: '1.5rem', textAlign: 'center' }}>What Defines Us</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(220px,100%),1fr))', gap: '1.25rem' }}>
                            {[
                                { icon: Shield, title: 'Independent', desc: 'Zero vendor affiliation - providing unbiased advice you can trust and confidently cite in board-level reporting.' },
                                { icon: BookOpen, title: 'Research-Backed', desc: 'Peer-reviewed publications, open datasets, and audit-ready templates you can deploy immediately.' },
                                { icon: Award, title: 'Aligned with Global Standards', desc: 'Following frameworks and guidance from OECD, EU AI Office, NIST, and national ministries across six continents.' },
                                { icon: Target, title: 'Actionable', desc: 'Practical frameworks digestible in hours - not weeks of consultant time or opaque recommendations.' },
                            ].map(({ icon: Icon, title, desc }) => (
                                <div key={title}
                                    style={{ background: '#F8FAFC', borderRadius: '12px', padding: 'clamp(1.1rem,2.5vw,1.5rem)', border: '1px solid #E2E8F0', transition: 'box-shadow 0.15s,transform 0.15s' }}
                                    onMouseOver={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,51,102,0.1)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                                    onMouseOut={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.85rem' }}>
                                        <Icon size={20} color="#003366" />
                                    </div>
                                    <h4 style={{ margin: '0 0 6px', fontWeight: '700', color: '#1E293B', fontSize: '0.95rem' }}>{title}</h4>
                                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B', lineHeight: '1.6' }}>{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Council Components */}
            <div style={{ background: '#F0F4F8', padding: 'clamp(1.5rem,3vw,2.5rem) clamp(1rem,4vw,2rem)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: '800', color: '#1A202C', marginBottom: '0.5rem' }}>Council Components</h2>
                        <p style={{ color: '#64748B', fontSize: '1rem' }}>The three pillars of the Risk AI Council (RAC)</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(280px,100%),1fr))', gap: '1.5rem' }}>
                        {[
                            { title: 'Events & Community', desc: 'Hosting webinars, seminars, workshops, and podcasts that bring together AI risk professionals, security officers, and governance experts. Members receive priority registration, access to session recordings, and can participate in live Q&A and community discussions.', accent: '#003366' },
                            { title: 'AI Product Reviews', desc: 'Independent, evidence-based assessments of AI and governance products. Our review committee tests tools against established frameworks and publishes findings including feature test scores, methodology notes, and supporting evidence so organisations can make informed procurement decisions without vendor bias.', accent: '#0055A4' },
                            { title: 'AI Risk Guidance & Resources', desc: 'Practical, framework-aligned guidance to help organisations navigate the evolving AI regulatory landscape. We publish whitepapers, risk assessment templates, and research aligned with EU AI Act, NIST AI RMF, and ISO 42001 -  giving security leaders, compliance officers, and executives the structured knowledge they need to make responsible AI decisions with confidence.', accent: '#4A5568' },
                        ].map(({ title, desc, accent }) => (
                            <div key={title} style={{ background: 'white', padding: 'clamp(1.25rem,3vw,2rem)', borderRadius: '12px', borderTop: `4px solid ${accent}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1A202C', marginBottom: '0.75rem' }}>{title}</h3>
                                <p style={{ color: '#4A5568', lineHeight: '1.7', margin: 0 }}>{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Team Grid */}
            <div style={{ background: 'white', padding: 'clamp(1.5rem,3vw,2.5rem) clamp(1rem,4vw,2rem)' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: '800', color: '#1A202C', marginBottom: '0.5rem' }}>Leadership &amp; Contributors</h2>
                        <p style={{ color: '#64748B', fontSize: '1rem' }}>Meet the experts guiding our initiatives</p>
                    </div>

                    {teamLoading && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(240px,100%),1fr))', gap: '1.5rem' }} aria-busy="true">
                            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                        </div>
                    )}

                    {teamError && !teamLoading && (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#EF4444' }}>
                            <AlertCircle size={36} style={{ marginBottom: '1rem', opacity: 0.6, display: 'block', margin: '0 auto 1rem' }} />
                            <p style={{ marginBottom: '1rem' }}>{teamError}</p>
                            <button onClick={() => fetchTeam()}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#003366', color: 'white', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}>
                                <RefreshCw size={15} /> Try Again
                            </button>
                        </div>
                    )}

                    {!teamLoading && !teamError && team.length === 0 && (
                        <p style={{ textAlign: 'center', color: '#94A3B8', padding: '3rem' }}>No team members have been added yet.</p>
                    )}

                    {!teamLoading && !teamError && team.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(240px,100%),1fr))', gap: '1.5rem' }} aria-live="polite">
                            {team.map(member => <TeamCard key={member.id} member={member} onSelect={setSelectedMember} />)}
                        </div>
                    )}
                </div>
            </div>

            {selectedMember && <BioModal member={selectedMember} onClose={handleCloseBio} />}
        </>
    );
};

export default About;