/**
 * UserDashboard.jsx — Member portal overview
 * Sections: Profile card | Stats | Upcoming Events | Latest News | Quick Links
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
    User, Mail, Shield, Calendar, BookOpen,
    ArrowRight, ExternalLink, LogOut, Bell,
    FileText, MessageSquare, HelpCircle, Star,
    ClipboardList, MapPin, CheckCircle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { getEvents, getMyRegistrations } from '../api/events.js';
import { getNews } from '../api/news.js';

const ROLE_LABELS = {
    admin: 'Administrator', executive: 'Executive', paid_member: 'Paid Member',
    product_company: 'Product Company', university: 'University', free_member: 'Free Member',
};

const ROLE_COLORS = {
    admin: '#7C3AED', executive: '#B45309', paid_member: '#0369A1',
    product_company: '#0F766E', university: '#15803D', free_member: '#475569',
};

// ─── small card wrapper ───────────────────────────────────────────────────────
const DashCard = ({ children, style = {} }) => (
    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', ...style }}>
        {children}
    </div>
);

const SectionTitle = ({ icon: Icon, children }) => (
    <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: '700', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {Icon && <Icon size={16} color='#003366' />}{children}
    </h3>
);

// ─── Date helpers ─────────────────────────────────────────────────────────────
const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

const getCountdown = (dateStr) => {
    const diff = new Date(dateStr) - new Date();
    if (diff <= 0) return 'Now';
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    return `${days} days`;
};

// ─── Component ────────────────────────────────────────────────────────────────
const UserDashboard = () => {
    const navigate = useNavigate();
    const { user, logout, isAdmin } = useAuth();

    // Admins have their own dashboard — redirect them away
    if (isAdmin && isAdmin()) return <Navigate to="/admin-dashboard" replace />;

    const [events, setEvents] = useState([]);
    const [news, setNews] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = 'Dashboard | AI Risk Council';
        Promise.allSettled([
            getEvents({ is_upcoming: true, limit: 4 }),
            getNews({ limit: 4 }),
            getMyRegistrations(),
        ]).then(([evRes, nwRes, regRes]) => {
            if (evRes.status === 'fulfilled') setEvents(evRes.value.data?.data?.events ?? evRes.value.data?.data ?? []);
            if (nwRes.status === 'fulfilled') setNews(nwRes.value.data?.data?.news ?? nwRes.value.data?.data ?? []);
            if (regRes.status === 'fulfilled') setRegistrations(regRes.value.data?.data ?? []);
        }).finally(() => setLoading(false));
    }, []);

    const roleColor = ROLE_COLORS[user?.role] ?? '#475569';
    const roleLabel = ROLE_LABELS[user?.role] ?? user?.role;

    const handleLogout = async () => { await logout(); navigate('/'); };

    const QUICK_LINKS = [
        { icon: User, label: 'Edit Profile', path: '/profile' },
        { icon: Calendar, label: 'All Events', path: '/events' },
        { icon: MessageSquare, label: 'Community Q&A', path: '/community-qna' },
        { icon: HelpCircle, label: 'Framework', path: '/framework' },
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'var(--font-sans)' }}>
            {/* ── Top bar ──────────────────────────────────────────────── */}
            <div style={{ background: 'linear-gradient(135deg, #001a33 0%, #003366 100%)', color: 'white', padding: '2rem 2rem 3.5rem' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: '800', color: 'white', border: '2px solid rgba(255,255,255,0.25)' }}>
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: 'white' }}>
                                Welcome back, {user?.name?.split(' ')[0]}!
                            </h1>
                            <p style={{ margin: '2px 0 0', color: '#93C5FD', fontSize: '0.875rem' }}>{user?.email}</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ background: roleColor, color: 'white', padding: '0.35rem 1rem', borderRadius: '100px', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {roleLabel}
                        </span>
                        {isAdmin?.() && (
                            <button onClick={() => navigate('/admin-dashboard')}
                                style={{ padding: '0.5rem 1rem', background: '#7C3AED', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                                Admin Panel
                            </button>
                        )}
                        <button onClick={handleLogout}
                            style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <LogOut size={13} />Sign Out
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Content ───────────────────────────────────────────────── */}
            <div style={{ maxWidth: '1100px', margin: '-1.5rem auto 0', padding: '0 2rem 3rem', display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(12, 1fr)' }}>

                {/* Profile summary */}
                <DashCard style={{ gridColumn: 'span 4' }}>
                    <SectionTitle icon={User}>Account</SectionTitle>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {[
                            { label: 'Name', value: user?.name },
                            { label: 'Email', value: user?.email },
                            { label: 'Role', value: roleLabel },
                            { label: 'Status', value: user?.status ?? 'active' },
                        ].map(({ label, value }) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem' }}>
                                <span style={{ color: '#94A3B8', fontWeight: '500' }}>{label}</span>
                                <span style={{ color: '#1E293B', fontWeight: '600', textAlign: 'right', maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => navigate('/profile')}
                        style={{ marginTop: '1.25rem', width: '100%', padding: '0.65rem', background: '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                        Edit Profile
                    </button>
                </DashCard>

                {/* Quick links */}
                <DashCard style={{ gridColumn: 'span 4' }}>
                    <SectionTitle icon={ArrowRight}>Quick Links</SectionTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                        {QUICK_LINKS.map(({ icon: Icon, label, path }) => (
                            <button key={path} onClick={() => navigate(path)}
                                onMouseOver={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
                                onMouseOut={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '0.85rem 0.5rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.15s' }}>
                                <Icon size={18} color='#003366' />
                                <span style={{ fontSize: '0.72rem', color: '#374151', fontWeight: '600', textAlign: 'center', lineHeight: '1.2' }}>{label}</span>
                            </button>
                        ))}
                    </div>
                </DashCard>

                {/* Membership tier prompt */}
                <DashCard style={{ gridColumn: 'span 4', background: 'linear-gradient(135deg, #003366 0%, #004d99 100%)', border: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
                        <Star size={14} color='#FCD34D' />
                        <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#FCD34D', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Upgrade</span>
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem', color: 'white', fontWeight: '800', fontSize: '1.05rem' }}>Unlock Full Access</h3>
                    <p style={{ margin: '0 0 1rem', color: '#93C5FD', fontSize: '0.82rem', lineHeight: '1.6' }}>
                        Get exclusive research, audit templates, priority event access and peer benchmarking with a Professional membership.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                        {['All audit templates (12+)', 'Member-only research library', 'Priority event registration'].map(f => (
                            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#CBD5E1' }}>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#FCD34D', flexShrink: 0 }} />{f}
                            </div>
                        ))}
                    </div>
                    <button onClick={() => navigate('/membership')}
                        style={{ width: '100%', padding: '0.7rem', background: '#FCD34D', color: '#1E293B', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        Join Waitlist <ArrowRight size={15} />
                    </button>
                </DashCard>

                {/* Upcoming Events */}
                <DashCard style={{ gridColumn: 'span 6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <SectionTitle icon={Calendar}>Upcoming Events</SectionTitle>
                        <button onClick={() => navigate('/events')} style={{ background: 'none', border: 'none', color: '#003366', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            All <ArrowRight size={13} />
                        </button>
                    </div>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {[1, 2, 3].map(i => <div key={i} style={{ height: '60px', background: '#F1F5F9', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
                        </div>
                    ) : events.length === 0 ? (
                        <p style={{ color: '#94A3B8', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>No upcoming events.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {events.slice(0, 4).map(ev => (
                                <div key={ev.id} onClick={() => navigate('/events')}
                                    onMouseOver={e => e.currentTarget.style.background = '#F8FAFC'}
                                    onMouseOut={e => e.currentTarget.style.background = 'white'}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '10px', border: '1px solid #F1F5F9', cursor: 'pointer', transition: 'background 0.15s' }}>
                                    <div style={{ width: '42px', height: '42px', background: '#EFF6FF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Calendar size={18} color='#003366' />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontWeight: '600', fontSize: '0.875rem', color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>{fmtDate(ev.date)}</p>
                                    </div>
                                    <span style={{ flexShrink: 0, background: '#EFF6FF', color: '#003366', fontSize: '0.65rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '100px' }}>
                                        {getCountdown(ev.date)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </DashCard>

                {/* Latest News */}
                <DashCard style={{ gridColumn: 'span 6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <SectionTitle icon={Bell}>Latest News</SectionTitle>
                        <button onClick={() => navigate('/community-qna')} style={{ background: 'none', border: 'none', color: '#003366', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            More <ArrowRight size={13} />
                        </button>
                    </div>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {[1, 2, 3].map(i => <div key={i} style={{ height: '60px', background: '#F1F5F9', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
                        </div>
                    ) : news.length === 0 ? (
                        <p style={{ color: '#94A3B8', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>No news yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {news.slice(0, 4).map(article => (
                                <div key={article.id}
                                    onMouseOver={e => e.currentTarget.style.background = '#F8FAFC'}
                                    onMouseOut={e => e.currentTarget.style.background = 'white'}
                                    style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', borderRadius: '10px', border: '1px solid #F1F5F9', cursor: 'default', transition: 'background 0.15s' }}>
                                    {article.image_url ? (
                                        <img src={article.image_url} alt="" style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                                    ) : (
                                        <div style={{ width: '42px', height: '42px', background: '#FEF3C7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <BookOpen size={18} color='#D97706' />
                                        </div>
                                    )}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontWeight: '600', fontSize: '0.875rem', color: '#1E293B', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{article.title}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>{fmtDate(article.published_at || article.created_at)}</p>
                                    </div>
                                    {article.source_url && (
                                        <a href={article.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#94A3B8', flexShrink: 0 }} onClick={e => e.stopPropagation()}><ExternalLink size={14} /></a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </DashCard>

                {/* My Registrations */}
                <DashCard style={{ gridColumn: 'span 12' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <SectionTitle icon={ClipboardList}>My Event Registrations</SectionTitle>
                        <button onClick={() => navigate('/events')} style={{ background: 'none', border: 'none', color: '#003366', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Browse Events <ArrowRight size={13} />
                        </button>
                    </div>
                    {loading ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                            {[1, 2, 3].map(i => <div key={i} style={{ height: '80px', background: '#F1F5F9', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
                        </div>
                    ) : registrations.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94A3B8' }}>
                            <ClipboardList size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                            <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>You haven't registered for any events yet.</p>
                            <button onClick={() => navigate('/events')} style={{ background: '#EFF6FF', color: '#003366', border: 'none', padding: '0.55rem 1.25rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                                Find Events →
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.9rem' }}>
                            {registrations.map(reg => {
                                const catColors = { webinar: '#1D4ED8', seminar: '#16A34A', workshop: '#D97706', podcast: '#7C3AED' };
                                const catBg = { webinar: '#EFF6FF', seminar: '#F0FDF4', workshop: '#FFFBEB', podcast: '#FAF5FF' };
                                const cat = (reg.event_category || '').toLowerCase();
                                const color = catColors[cat] || '#64748B';
                                const bg = catBg[cat] || '#F1F5F9';
                                const isPast = !reg.is_upcoming;
                                return (
                                    <div key={reg.id}
                                        onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,51,102,0.1)'}
                                        onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}
                                        style={{ border: '1px solid #E2E8F0', borderLeft: `3px solid ${color}`, borderRadius: '10px', padding: '1rem', background: 'white', transition: 'box-shadow 0.15s' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                            <span style={{ background: bg, color, fontSize: '0.65rem', fontWeight: '700', padding: '2px 8px', borderRadius: '100px', textTransform: 'capitalize' }}>{reg.event_category}</span>
                                            <span style={{ background: isPast ? '#F1F5F9' : '#DCFCE7', color: isPast ? '#64748B' : '#16A34A', fontSize: '0.65rem', fontWeight: '700', padding: '2px 8px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <CheckCircle size={10} /> {isPast ? 'Past' : 'Upcoming'}
                                            </span>
                                        </div>
                                        <p style={{ margin: '0 0 0.3rem', fontWeight: '700', fontSize: '0.9rem', color: '#1E293B', lineHeight: '1.3' }}>{reg.event_title}</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Calendar size={11} color={color} /> {fmtDate(reg.event_date)}
                                            </p>
                                            {reg.event_location && (
                                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <MapPin size={11} color={color} /> {reg.event_location}
                                                </p>
                                            )}
                                        </div>
                                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.7rem', color: '#94A3B8' }}>
                                            Registered {fmtDate(reg.registered_at)}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </DashCard>
            </div>
        </div>
    );
};

export default UserDashboard;
