import React, { useEffect, useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import {
    User, Calendar, BookOpen, ArrowRight, ExternalLink, LogOut,
    MessageSquare, HelpCircle, Star, ClipboardList, MapPin,
    CheckCircle, Lock, Zap, Users, Award, Newspaper, Bell,
    FileText, ChevronRight, Shield, Heart, Bookmark, BarChart2, Download,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { getEvents, getMyRegistrations } from '../api/events.js';
import { getMyStats } from '../api/feed.js';
import { getMyDownloadUsage } from '../api/resources.js';
import { getMyPosts } from '../api/feed.js';
import MyPostsModal from '../components/modals/MyPostsModal.jsx';
import MyStatsModal from '../components/modals/MyStatsModal.jsx';

const ROLE_LABELS = { founding_member: 'Founding Member', council_member: 'Council Member', executive: 'Council Member', professional: 'Professional' };
const ROLE_COLORS = { founding_member: '#7C3AED', council_member: '#B45309', executive: '#B45309', professional: '#0369A1' };
const ROLE_BG     = { founding_member: 'rgba(124,58,237,0.12)', council_member: 'rgba(180,83,9,0.12)', executive: 'rgba(180,83,9,0.12)', professional: 'rgba(3,105,161,0.12)' };

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const getCountdown = (dateStr) => {
    const diff = new Date(dateStr) - new Date();
    if (diff <= 0) return 'Now';
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    return `${days} days`;
};

const UserDashboard = () => {
    const navigate = useNavigate();
    const { user, logout, isAdmin, isCouncilMember } = useAuth();

    if (isAdmin && isAdmin()) return <Navigate to="/admin-dashboard" replace />;

    const [events,        setEvents]        = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [stats,         setStats]         = useState(null);
    const [usage,         setUsage]         = useState(null);
    const [posts,         setPosts]         = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [showPostsModal, setShowPostsModal] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);

    const timeAgo = (dateString) => {
        const diff = Date.now() - new Date(dateString).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const weeks = Math.floor(days / 7);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return `${weeks}w ago`;
    };

    useEffect(() => {
        document.title = 'Dashboard | AI Risk Council';
        Promise.allSettled([
            getEvents({ is_upcoming: true, limit: 4 }),
            getMyRegistrations(),
            getMyStats(),
            getMyDownloadUsage(),
            getMyPosts({ page: 1, limit: 4 }),
        ]).then(([evRes, regRes, statRes, usageRes, postRes]) => {
            if (evRes.status === 'fulfilled') setEvents(evRes.value.data?.data?.events ?? evRes.value.data?.data ?? []);
            if (regRes.status === 'fulfilled') setRegistrations(regRes.value.data?.data ?? []);
            if (statRes.status === 'fulfilled') setStats(statRes.value.data?.data);
            if (usageRes.status === 'fulfilled') setUsage(usageRes.value.data?.data);
            if (postRes.status === 'fulfilled') setPosts(postRes.value.data?.data ?? []);
        }).finally(() => setLoading(false));
    }, []);

    const roleColor = ROLE_COLORS[user?.role] ?? '#475569';
    const roleBg    = ROLE_BG[user?.role]    ?? 'rgba(100,116,139,0.1)';
    const roleLabel = ROLE_LABELS[user?.role] ?? user?.role;
    const initial   = user?.name?.charAt(0).toUpperCase() ?? '?';

    const handleLogout = async () => { await logout(); navigate('/'); };

    const QUICK_LINKS = [
        { icon: User,          label: 'Edit Profile',    path: '/profile',       color: '#003366' },
        { icon: Calendar,      label: 'All Events',      path: '/events',        color: '#0369A1' },
        { icon: MessageSquare, label: 'Community Feed',   path: '/community-qna', color: '#059669' },
        { icon: HelpCircle,    label: 'AI Framework',    path: '/framework',     color: '#7C3AED' },
        { icon: BookOpen,      label: 'Resources',       path: '/resources',     color: '#D97706' },
        { icon: FileText,      label: 'Certifications',  path: '/certification', color: '#DC2626' },
    ];

    const PLATFORM_FEATURES = [
        { icon: Newspaper,  label: 'Manage News',       desc: 'Create & publish news articles',        path: '/news',                                  allowed: isAdmin?.() || isCouncilMember?.(), lockMsg: 'Council Member / Founding Member only' },
        { icon: Calendar,   label: 'Manage Events',     desc: 'Create & publish events',               path: '/events',                                allowed: isAdmin?.() || isCouncilMember?.(), lockMsg: 'Council Member / Founding Member only' },
        { icon: BookOpen,   label: 'Auto-News',         desc: 'Approve automated news feed',           path: '/admin-dashboard?tab=auto_news',         allowed: isAdmin?.() || isCouncilMember?.(), lockMsg: 'Council Member / Founding Member only' },
        { icon: FileText,   label: 'Approve Resources', desc: 'Review pending resource uploads',       path: '/admin-dashboard?tab=pending_resources', allowed: isAdmin?.() || isCouncilMember?.(), lockMsg: 'Council Member / Founding Member only' },
        { icon: Users,      label: 'Approve Members',   desc: 'Review membership applications',        path: '/admin-dashboard?tab=pending',           allowed: isAdmin?.(),                          lockMsg: 'Founding Member only' },
        { icon: Award,      label: 'Manage Awards',     desc: 'Manage nominees & voting',              path: '/admin-dashboard?tab=nominations',       allowed: isAdmin?.(),                          lockMsg: 'Founding Member only' },
    ];

    return (
        <>
            <style>{`
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }

                /* ─ Page shell ─ */
                .dash-page {
                    min-height: 100vh;
                    background: #F1F5F9;
                    font-family: var(--font-sans);
                }

                /* ─ Hero ─ */
                .dash-hero {
                    background: linear-gradient(135deg,#001a33 0%,#003366 60%,#004d99 100%);
                    padding: clamp(1.5rem,4vw,2.5rem) clamp(1rem,4vw,2rem);
                    position: relative; overflow: hidden;
                }

                /* ─ Content area ─ */
                .dash-body {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: clamp(1rem,3vw,1.5rem) clamp(1rem,3vw,1.5rem) 3rem;
                }

                /* ─ Main grid ─ */
                .dash-grid {
                    display: grid;
                    grid-template-columns: 300px 1fr;
                    gap: 1.25rem;
                    align-items: start;
                }
                @media (max-width: 900px) {
                    .dash-grid { grid-template-columns: 1fr; }
                }

                /* ─ Card ─ */
                .dash-card {
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #E2E8F0;
                    padding: clamp(1.1rem,2.5vw,1.5rem);
                    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
                }

                /* ─ Quick link button ─ */
                .ql-btn {
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    gap: 7px; padding: 0.875rem 0.5rem;
                    background: #F8FAFC; border: 1px solid #E2E8F0;
                    border-radius: 12px; cursor: pointer;
                    font-family: var(--font-sans);
                    transition: all 0.15s;
                    text-decoration: none;
                }
                .ql-btn:hover {
                    background: #EFF6FF;
                    border-color: #BFDBFE;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,51,102,0.08);
                    text-decoration: none;
                }

                /* ─ Feature tile ─ */
                .feat-tile {
                    display: flex; align-items: flex-start; gap: 12px;
                    padding: 1rem; border-radius: 12px;
                    border: 1px solid #E2E8F0; background: white;
                    transition: all 0.15s;
                }
                .feat-tile.allowed { cursor: pointer; }
                .feat-tile.allowed:hover { background: #EFF6FF; border-color: #BFDBFE; }
                .feat-tile.locked { opacity: 0.55; cursor: not-allowed; background: #FAFAFA; }

                /* ─ Event / news row ─ */
                .feed-row {
                    display: flex; align-items: center; gap: 0.75rem;
                    padding: 0.75rem; border-radius: 10px;
                    border: 1px solid #F1F5F9;
                    transition: background 0.12s; cursor: pointer;
                }
                .feed-row:hover { background: #F8FAFC; }

                /* ─ Registration grid ─ */
                .reg-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(min(260px,100%), 1fr));
                    gap: 0.875rem;
                }

                /* ─ Skeleton ─ */
                .skel { background: #F1F5F9; border-radius: 10px; animation: pulse 1.5s ease-in-out infinite; }

                /* ─ Section title ─ */
                .sec-title {
                    display: flex; align-items: center; gap: 8px;
                    font-size: 0.95rem; font-weight: 700; color: #1E293B;
                    margin: 0 0 1.1rem;
                }
            `}</style>

            <div className="dash-page">

                {/* ═══ HERO BANNER ═══ */}
                <div className="dash-hero">
                    {/* Decorative blobs */}
                    <div style={{ position:'absolute', top:'-60px', right:'-60px', width:'220px', height:'220px', borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }}/>
                    <div style={{ position:'absolute', bottom:'-40px', left:'5%', width:'160px', height:'160px', borderRadius:'50%', background:'rgba(255,255,255,0.03)', pointerEvents:'none' }}/>

                    <div style={{ maxWidth:'1200px', margin:'0 auto', position:'relative', zIndex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>

                            {/* Left: avatar + greeting */}
                            <div style={{ display:'flex', alignItems:'center', gap:'clamp(0.75rem,2vw,1.25rem)', minWidth:0 }}>
                                <div style={{ width:'clamp(44px,6vw,56px)', height:'clamp(44px,6vw,56px)', borderRadius:'50%', background:'rgba(255,255,255,0.15)', border:'2px solid rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'clamp(1.1rem,2.5vw,1.4rem)', fontWeight:'800', color:'white', flexShrink:0 }}>
                                    {initial}
                                </div>
                                <div style={{ minWidth:0 }}>
                                    <p style={{ margin:'0 0 2px', fontSize:'0.75rem', color:'rgba(255,255,255,0.5)', fontWeight:'600', letterSpacing:'0.04em', textTransform:'uppercase' }}>Member Portal</p>
                                    <h1 style={{ margin:'0 0 3px', fontSize:'clamp(1rem,3vw,1.4rem)', fontWeight:'800', color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                        Welcome back, {user?.name?.split(' ')[0]}!
                                    </h1>
                                    <p style={{ margin:0, fontSize:'0.8rem', color:'rgba(255,255,255,0.55)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</p>
                                </div>
                            </div>

                            {/* Right: role badge + sign out */}
                            <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', flexWrap:'wrap', flexShrink:0 }}>
                                <span style={{ background: roleBg, color: roleColor, border: `1px solid ${roleColor}30`, padding:'0.3rem 0.9rem', borderRadius:'100px', fontSize:'0.72rem', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.07em', backdropFilter:'blur(8px)', background:'rgba(255,255,255,0.12)', color:'white', border:'1px solid rgba(255,255,255,0.2)' }}>
                                    {roleLabel}
                                </span>
                                {isAdmin?.() && (
                                    <button onClick={() => navigate('/admin-dashboard')}
                                        style={{ padding:'0.4rem 0.9rem', background:'rgba(124,58,237,0.85)', color:'white', border:'1px solid rgba(124,58,237,0.4)', borderRadius:'8px', fontWeight:'700', fontSize:'0.78rem', cursor:'pointer', fontFamily:'var(--font-sans)', display:'flex', alignItems:'center', gap:'5px', whiteSpace:'nowrap' }}>
                                        <Shield size={13}/> Admin Panel
                                    </button>
                                )}
                                <button onClick={handleLogout}
                                    style={{ padding:'0.4rem 0.9rem', background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.9)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:'8px', fontWeight:'600', fontSize:'0.78rem', cursor:'pointer', fontFamily:'var(--font-sans)', display:'flex', alignItems:'center', gap:'5px', whiteSpace:'nowrap' }}>
                                    <LogOut size={13}/>Sign Out
                                </button>
                            </div>
                        </div>

                        {/* Stats strip */}
                        <div style={{ display:'flex', gap:'clamp(1rem,3vw,2rem)', marginTop:'1.5rem', flexWrap:'wrap' }}>
                            {[
                                { label:'Events Registered', value: loading ? '—' : registrations.length },
                                { label:'Upcoming Events',   value: loading ? '—' : events.length },
                                { label:'Membership',        value: roleLabel },
                            ].map(({ label, value }) => (
                                <div key={label}>
                                    <p style={{ margin:'0 0 1px', fontSize:'clamp(1rem,2.5vw,1.3rem)', fontWeight:'800', color:'white', lineHeight:1 }}>{value}</p>
                                    <p style={{ margin:0, fontSize:'0.7rem', color:'rgba(255,255,255,0.45)', fontWeight:'600' }}>{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ═══ BODY ═══ */}
                <div className="dash-body">
                    <div className="dash-grid">

                        {/* ── LEFT SIDEBAR ── */}
                        <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

                            {/* Profile card */}
                            <div className="dash-card">
                                <h3 className="sec-title"><User size={15} color="#003366"/> My Account</h3>
                                <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem', marginBottom:'1.1rem' }}>
                                    {[
                                        { label:'Name',   value: user?.name },
                                        { label:'Email',  value: user?.email },
                                        { label:'Role',   value: roleLabel },
                                        ...(user?.role === 'professional' && user?.professional_sub_type ? [{
                                            label: 'Type',
                                            value: user.professional_sub_type === 'working_professional' ? '💼 Working Professional' : '🎓 Final Year Undergraduate',
                                        }] : []),
                                        { label:'Status', value: user?.status ?? 'Active' },
                                    ].map(({ label, value }) => (
                                        <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.5rem', paddingBottom:'0.5rem', borderBottom:'1px solid #F1F5F9', fontSize:'0.85rem' }}>
                                            <span style={{ color:'#94A3B8', fontWeight:'500', flexShrink:0 }}>{label}</span>
                                            <span style={{ color:'#1E293B', fontWeight:'600', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0, textAlign:'right' }}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => navigate('/profile')}
                                    style={{ width:'100%', padding:'0.65rem', background:'#003366', color:'white', border:'none', borderRadius:'9px', fontWeight:'700', fontSize:'0.875rem', cursor:'pointer', fontFamily:'var(--font-sans)', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', transition:'background 0.15s' }}
                                    onMouseOver={e => e.currentTarget.style.background='#002244'}
                                    onMouseOut={e => e.currentTarget.style.background='#003366'}>
                                    <User size={14}/> Edit Profile
                                </button>
                            </div>

                            {/* Quick links */}
                            <div className="dash-card">
                                <h3 className="sec-title"><Zap size={15} color="#003366"/> Quick Links</h3>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem' }}>
                                    {QUICK_LINKS.map(({ icon: Icon, label, path, color }) => (
                                        <a key={path} href={path} className="ql-btn">
                                            <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:`${color}12`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                                <Icon size={17} color={color}/>
                                            </div>
                                            <span style={{ fontSize:'0.72rem', color:'#374151', fontWeight:'600', textAlign:'center', lineHeight:'1.2' }}>{label}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>

                            {/* Upgrade card — show for ALL professional members; hide only for council_member & founding_member */}
                            {user?.role !== 'founding_member' && user?.role !== 'council_member' && (
                            <div className="dash-card" style={{ background:'linear-gradient(135deg,#002855 0%,#003d80 100%)', border:'none' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'0.6rem' }}>
                                    <Star size={14} color='#FCD34D'/>
                                    <span style={{ fontSize:'0.68rem', fontWeight:'700', color:'#FCD34D', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                                        Upgrade Membership
                                    </span>
                                </div>
                                <h3 style={{ margin:'0 0 0.45rem', color:'white', fontWeight:'800', fontSize:'1rem' }}>
                                    {user?.professional_sub_type === 'final_year_undergrad'
                                        ? 'Upgrade Your Access'
                                        : 'Become a Council Member'}
                                </h3>
                                <p style={{ margin:'0 0 0.875rem', color:'rgba(147,197,253,0.85)', fontSize:'0.8rem', lineHeight:'1.6' }}>
                                    {user?.professional_sub_type === 'final_year_undergrad'
                                        ? 'Upgrade to Working Professional for downloads, or apply for Council Member for full platform access.'
                                        : 'Unlock content creation, product reviews, and full platform privileges.'}
                                </p>
                                <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem', marginBottom:'1rem' }}>
                                    {(user?.professional_sub_type === 'final_year_undergrad'
                                        ? ['10 downloads/month (Working Pro)', 'Content creation (Council Member)', 'No extra cost for sub-type upgrade']
                                        : ['Create events, news & workshops', 'Submit AI product reviews', 'Priority event registration']
                                    ).map(f => (
                                        <div key={f} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'0.75rem', color:'rgba(203,213,225,0.85)' }}>
                                            <span style={{ width:'4px', height:'4px', borderRadius:'50%', background:'#FCD34D', flexShrink:0 }}/>{f}
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => navigate('/membership')}
                                    style={{ width:'100%', padding:'0.65rem', background:'#FCD34D', color:'#1E293B', border:'none', borderRadius:'9px', fontWeight:'800', fontSize:'0.85rem', cursor:'pointer', fontFamily:'var(--font-sans)', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                                    View Upgrade Options <ArrowRight size={14}/>
                                </button>
                            </div>
                            )}{/* end upgrade card conditional */}
                        </div>

                        {/* ── RIGHT CONTENT ── */}
                        <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem', minWidth:0 }}>

                            {/* Events + News row */}
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(280px,100%),1fr))', gap:'1.25rem' }}>

                                {/* Upcoming Events */}
                                <div className="dash-card">
                                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
                                        <h3 className="sec-title" style={{ margin:0 }}><Calendar size={15} color="#003366"/> Upcoming Events</h3>
                                        <a href="/events" style={{ fontSize:'0.78rem', color:'#003366', fontWeight:'700', textDecoration:'none', display:'flex', alignItems:'center', gap:'3px', flexShrink:0 }}>
                                            All <ChevronRight size={13}/>
                                        </a>
                                    </div>
                                    {loading ? (
                                        <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                                            {[1,2,3].map(i => <div key={i} className="skel" style={{ height:'60px' }}/>)}
                                        </div>
                                    ) : events.length === 0 ? (
                                        <div style={{ textAlign:'center', padding:'2rem 1rem', color:'#94A3B8' }}>
                                            <Calendar size={32} style={{ opacity:0.25, marginBottom:'0.5rem' }}/>
                                            <p style={{ fontSize:'0.85rem', margin:0 }}>No upcoming events.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                                            {events.slice(0, 4).map(ev => (
                                                <div key={ev.id} className="feed-row" onClick={() => navigate('/events')}>
                                                    <div style={{ width:'38px', height:'38px', background:'#EFF6FF', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                                        <Calendar size={16} color='#003366'/>
                                                    </div>
                                                    <div style={{ flex:1, minWidth:0 }}>
                                                        <p style={{ margin:0, fontWeight:'600', fontSize:'0.85rem', color:'#1E293B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.title}</p>
                                                        <p style={{ margin:'2px 0 0', fontSize:'0.73rem', color:'#94A3B8' }}>{fmtDate(ev.date)}</p>
                                                    </div>
                                                    <span style={{ flexShrink:0, background:'#EFF6FF', color:'#003366', fontSize:'0.63rem', fontWeight:'700', padding:'2px 8px', borderRadius:'100px', whiteSpace:'nowrap' }}>
                                                        {getCountdown(ev.date)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* My Posts */}
                                <div className="dash-card">
                                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
                                        <h3 className="sec-title" style={{ margin:0 }}><MessageSquare size={15} color="#003366"/> My Posts</h3>
                                        <button onClick={() => setShowPostsModal(true)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'0.78rem', color:'#003366', fontWeight:'700', display:'flex', alignItems:'center', gap:'3px', padding:0, fontFamily:'var(--font-sans)' }}>
                                            All <ChevronRight size={13}/>
                                        </button>
                                    </div>
                                    {loading ? (
                                        <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                                            {[1,2].map(i => <div key={i} className="skel" style={{ height:'75px' }}/>)}
                                        </div>
                                    ) : posts.length === 0 ? (
                                        <div style={{ textAlign:'center', padding:'2rem 1rem', color:'#94A3B8' }}>
                                            <MessageSquare size={32} style={{ opacity:0.25, marginBottom:'0.5rem' }}/>
                                            <p style={{ fontSize:'0.85rem', margin:0 }}>You haven't published any posts yet.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                                            {posts.slice(0, 4).map(post => (
                                                <div key={post.id} className="feed-row" onClick={() => navigate(`/community-qna/${post.id}`)} style={{ alignItems:'flex-start' }}>
                                                    <div style={{ flex:1, minWidth:0 }}>
                                                        <p style={{ margin:'0 0 0.35rem', fontSize:'0.84rem', color:'#1E293B', lineHeight:'1.5', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{post.content}</p>
                                                        <div style={{ display:'flex', gap:'0.85rem', flexWrap:'wrap' }}>
                                                            <span style={{ fontSize:'0.7rem', color:'#94A3B8' }}>{timeAgo(post.created_at)}</span>
                                                            <span style={{ fontSize:'0.7rem', color:'#94A3B8' }}>♥ {post.like_count}</span>
                                                            <span style={{ fontSize:'0.7rem', color:'#94A3B8' }}>💬 {post.comment_count}</span>
                                                            <span style={{ fontSize:'0.7rem', color:'#94A3B8' }}>🔖 {post.save_count}</span>
                                                            {!!post.is_hidden && <span style={{ fontSize:'0.7rem', color:'#EF4444', fontWeight:'700' }}>Hidden</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="dash-card">
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
                                    <h3 className="sec-title" style={{ margin:0 }}><BarChart2 size={16} color="#003366"/> My Stats</h3>
                                    <button onClick={() => setShowStatsModal(true)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'0.78rem', color:'#003366', fontWeight:'700', display:'flex', alignItems:'center', gap:'3px', padding:0, fontFamily:'var(--font-sans)' }}>
                                        Details <ChevronRight size={13}/>
                                    </button>
                                </div>
                                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(140px,100%),1fr))', gap:'0.875rem' }}>
                                    {[
                                        { label: 'Comments Made', value: stats?.comments_made ?? '—', icon: MessageSquare, color: '#0369A1', bg: '#EFF6FF' },
                                        { label: 'Likes Given',   value: stats?.likes_given   ?? '—', icon: Heart,         color: '#DC2626', bg: '#FEF2F2' },
                                        { label: 'Posts Saved',   value: stats?.posts_saved   ?? '—', icon: Bookmark,      color: '#7C3AED', bg: '#FAF5FF' },
                                        { label: 'Downloads Used', value: usage?.unlimited ? '∞' : (usage?.used ?? '—'), icon: Download, color: '#059669', bg: '#ECFDF5' },
                                        ...(user?.role === 'founding_member' || user?.role === 'council_member' ? [
                                            { label: 'Total Posts', value: stats?.total_posts ?? '—', icon: FileText, color: '#003366', bg: '#EFF6FF' }
                                        ] : [])
                                    ].map((s, i) => (
                                        <div key={i} style={{ background:'white', borderRadius:'10px', border:'1px solid #E2E8F0', padding:'0.85rem', display:'flex', alignItems:'center', gap:'0.75rem' }}>
                                            <div style={{ width:34, height:34, borderRadius:'8px', background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                                <s.icon size={15} color={s.color}/>
                                            </div>
                                            <div style={{ minWidth:0 }}>
                                                <p style={{ margin:0, fontSize:'1.1rem', fontWeight:'800', color:'#1E293B', lineHeight:1 }}>{loading ? '—' : s.value}</p>
                                                <p style={{ margin:'2px 0 0', fontSize:'0.65rem', color:'#94A3B8', fontWeight:'700', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.label}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Platform Features */}
                            <div className="dash-card">
                                <h3 className="sec-title"><Zap size={15} color="#003366"/> Platform Features</h3>
                                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(200px,100%),1fr))', gap:'0.75rem' }}>
                                    {PLATFORM_FEATURES.map(({ icon: FIcon, label, desc, path, allowed, lockMsg }) => (
                                        <div key={label}
                                            className={`feat-tile ${allowed ? 'allowed' : 'locked'}`}
                                            onClick={() => allowed && navigate(path)}>
                                            <div style={{ width:'36px', height:'36px', borderRadius:'9px', background:allowed?'#EFF6FF':'#F1F5F9', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                                {allowed ? <FIcon size={16} color="#003366"/> : <Lock size={14} color="#94A3B8"/>}
                                            </div>
                                            <div style={{ flex:1, minWidth:0 }}>
                                                <p style={{ margin:0, fontWeight:'700', fontSize:'0.84rem', color:allowed?'#1E293B':'#94A3B8' }}>{label}</p>
                                                <p style={{ margin:'2px 0 0', fontSize:'0.72rem', color:'#94A3B8', lineHeight:'1.4' }}>{allowed ? desc : lockMsg}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* My Registrations */}
                            <div className="dash-card">
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem', flexWrap:'wrap', gap:'0.5rem' }}>
                                    <h3 className="sec-title" style={{ margin:0 }}><ClipboardList size={15} color="#003366"/> My Event Registrations</h3>
                                    <a href="/events" style={{ fontSize:'0.78rem', color:'#003366', fontWeight:'700', textDecoration:'none', display:'flex', alignItems:'center', gap:'3px', flexShrink:0 }}>
                                        Browse <ChevronRight size={13}/>
                                    </a>
                                </div>

                                {loading ? (
                                    <div className="reg-grid">
                                        {[1,2,3].map(i => <div key={i} className="skel" style={{ height:'100px' }}/>)}
                                    </div>
                                ) : registrations.length === 0 ? (
                                    <div style={{ textAlign:'center', padding:'2.5rem 1rem', background:'#F8FAFC', borderRadius:'12px', border:'1.5px dashed #E2E8F0' }}>
                                        <ClipboardList size={36} style={{ opacity:0.2, marginBottom:'0.75rem', display:'block', margin:'0 auto 0.75rem' }}/>
                                        <p style={{ fontSize:'0.9rem', color:'#64748B', marginBottom:'0.75rem' }}>You haven't registered for any events yet.</p>
                                        <a href="/events" style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:'#003366', color:'white', padding:'0.55rem 1.25rem', borderRadius:'8px', fontWeight:'700', fontSize:'0.82rem', textDecoration:'none' }}>
                                            Find Events <ArrowRight size={13}/>
                                        </a>
                                    </div>
                                ) : (
                                    <div className="reg-grid">
                                        {registrations.map(reg => {
                                            const catColors = { webinar:'#1D4ED8', seminar:'#16A34A', workshop:'#D97706', podcast:'#7C3AED' };
                                            const catBg     = { webinar:'#EFF6FF', seminar:'#F0FDF4', workshop:'#FFFBEB', podcast:'#FAF5FF' };
                                            const cat   = (reg.event_category || '').toLowerCase();
                                            const color = catColors[cat] || '#64748B';
                                            const bg    = catBg[cat]    || '#F1F5F9';
                                            const isPast = !reg.is_upcoming;
                                            return (
                                                <div key={reg.id}
                                                    style={{ border:'1px solid #E2E8F0', borderLeft:`3px solid ${color}`, borderRadius:'10px', padding:'0.9rem 1rem', background:'white', transition:'box-shadow 0.15s' }}
                                                    onMouseOver={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(0,51,102,0.09)'}
                                                    onMouseOut={e => e.currentTarget.style.boxShadow='none'}>
                                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.4rem', gap:'6px', flexWrap:'wrap' }}>
                                                        <span style={{ background:bg, color, fontSize:'0.63rem', fontWeight:'700', padding:'2px 8px', borderRadius:'100px', textTransform:'capitalize', whiteSpace:'nowrap' }}>{reg.event_category}</span>
                                                        <span style={{ background:isPast?'#F1F5F9':'#DCFCE7', color:isPast?'#64748B':'#16A34A', fontSize:'0.63rem', fontWeight:'700', padding:'2px 8px', borderRadius:'100px', display:'flex', alignItems:'center', gap:'3px', whiteSpace:'nowrap' }}>
                                                            <CheckCircle size={9}/> {isPast?'Past':'Upcoming'}
                                                        </span>
                                                    </div>
                                                    <p style={{ margin:'0 0 0.35rem', fontWeight:'700', fontSize:'0.875rem', color:'#1E293B', lineHeight:'1.3' }}>{reg.event_title}</p>
                                                    <p style={{ margin:0, fontSize:'0.73rem', color:'#64748B', display:'flex', alignItems:'center', gap:'4px' }}>
                                                        <Calendar size={11} color={color}/> {fmtDate(reg.event_date)}
                                                    </p>
                                                    {reg.event_location && (
                                                        <p style={{ margin:'2px 0 0', fontSize:'0.73rem', color:'#64748B', display:'flex', alignItems:'center', gap:'4px' }}>
                                                            <MapPin size={11} color={color}/> {reg.event_location}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                        </div>{/* end right */}
                    </div>{/* end dash-grid */}
                </div>{/* end dash-body */}
            </div>

            {/* Modals */}
            <MyPostsModal isOpen={showPostsModal} onClose={() => setShowPostsModal(false)} />
            <MyStatsModal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} stats={stats} usage={usage} user={user} loading={loading} />
        </>
    );
};

export default UserDashboard;