import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { Users, Award, Newspaper, FileText, Calendar, BookOpen, LogOut, PenSquare, Mic } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { getLeadDashboard } from '../api/chapterLead.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import { getEvents, getMyRegistrations } from '../api/events.js';
import { getMyStats, getMyPosts } from '../api/feed.js';
import { getMyDownloadUsage } from '../api/resources.js';
import MyPostsModal from '../components/modals/MyPostsModal.jsx';
import MyStatsModal from '../components/modals/MyStatsModal.jsx';
import MyContactMessages from '../components/dashboard/MyContactMessages.jsx';
import {
    EventsCard, PostsCard, StatsCard, FeatureTiles, RegistrationsCard, AccountCard, QuickLinksCard, ContributeCard,
} from '../components/dashboard/DashboardCards.jsx';
import TeamDashboard from '../components/team/TeamDashboard.jsx';
import { tabKeysFor, leadHeroStats, LeadUnavailable } from '../components/chapterLead/LeadProgramme.jsx';
import { metaOfUser } from '../config/roles.js';

const UserDashboard = () => {
    const navigate = useNavigate();
    const { user, logout, isAdmin, isTeamMember, can } = useAuth();

    if (isAdmin && isAdmin()) return <Navigate to="/admin-dashboard" replace />;

    const [events,        setEvents]        = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [stats,         setStats]         = useState(null);
    const [usage,         setUsage]         = useState(null);
    const [posts,         setPosts]         = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [showPostsModal, setShowPostsModal] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);

    // ── Chapter programme (only chapter team members load or see any of this) ──
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const isTeam = !!isTeamMember?.();
    const [lead, setLead] = useState({ data: null, loading: isTeam, error: '', noProfile: false });

    const loadLead = useCallback(async () => {
        try {
            const res = await getLeadDashboard();
            setLead({ data: res.data?.data || null, loading: false, error: '', noProfile: false });
        } catch (err) {
            const status = err?.response?.status;
            setLead({ data: null, loading: false, noProfile: status === 404, error: status === 404 ? '' : getErrorMessage(err) });
        }
    }, []);
    useEffect(() => { if (isTeam) loadLead(); }, [isTeam, loadLead]);

    const role = metaOfUser(user);
    const tier = lead.data?.profile?.tier || user?.tier || 'lead';
    useEffect(() => {
        document.title = isTeam ? `${role.label} Dashboard | Risk AI Council` : 'Dashboard | Risk AI Council';
    }, [isTeam, role.label]);

    // /user/dashboard?tab=requests opens that tab directly (used by notifications and tiles).
    const requestedTab = searchParams.get('tab');
    const tab = isTeam && tabKeysFor(tier).includes(requestedTab) ? requestedTab : 'overview';
    const setTab = (next) => setSearchParams(next === 'overview' ? {} : { tab: next }, { replace: true });

    useEffect(() => {
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

    const initial = user?.name?.charAt(0).toUpperCase() ?? '?';
    const handleLogout = async () => { await logout(); navigate('/'); };
    const isUndergrad = user?.role === 'professional' && user?.professional_sub_type === 'final_year_undergrad';

    // What each tile needs comes from the server's capability list, so the page can never offer
    // something the API will refuse.
    const PLATFORM_FEATURES = [
        { icon: Users,      label: 'Manage Your Team',  desc: 'Applications and ambassadors',           path: '/user/dashboard?tab=team',               allowed: can?.('team.manage'),        lockMsg: 'Chapter Lead only' },
        { icon: PenSquare,  label: 'Write a Blog',      desc: 'Share your expertise (reviewed before it goes live)', path: '/chapter-lead/blog/new', allowed: can?.('blog.write'),         lockMsg: 'Chapter team only' },
        { icon: Mic,        label: 'Request to Host',   desc: 'Ask to host a podcast or workshop',     path: '/user/dashboard?tab=requests',           allowed: isTeam,                      lockMsg: 'Chapter team only' },
        { icon: Newspaper,  label: 'Manage News',       desc: 'Create news articles (an admin publishes)', path: '/news',                              allowed: can?.('content.draft'),      lockMsg: 'Chapter team / Founding Member only' },
        { icon: Calendar,   label: 'Manage Events',     desc: 'Create events (an admin publishes)',    path: '/events',                                allowed: can?.('content.draft'),      lockMsg: 'Chapter team / Founding Member only' },
        { icon: BookOpen,   label: 'Auto-News',         desc: 'Approve automated news feed',           path: '/admin-dashboard?tab=auto_news',         allowed: can?.('autonews.manage'),    lockMsg: 'Chapter Lead / Founding Member only' },
        { icon: FileText,   label: 'Approve Resources', desc: 'Review pending resource uploads',       path: '/admin-dashboard?tab=pending_resources', allowed: can?.('resources.approve'),  lockMsg: 'Founding Member only' },
        { icon: Users,      label: 'Approve Members',   desc: 'Review membership applications',        path: '/admin-dashboard?tab=pending',           allowed: isAdmin?.(),                 lockMsg: 'Founding Member only' },
        { icon: Award,      label: 'Manage Awards',     desc: 'Manage nominees & voting',              path: '/admin-dashboard?tab=nominations',       allowed: isAdmin?.(),                 lockMsg: 'Founding Member only' },
    ];

    return (
        <>
            <style>{`
                /* ─ Page shell ─ */
                .dash-page { min-height: 100vh; background: #F1F5F9; font-family: var(--font-sans); }

                /* ─ Hero: a plain band, no decoration ─ */
                .dash-hero { background: #003366; padding: clamp(1.25rem,3.5vw,2rem) clamp(0.75rem,1.6vw,1rem); border-bottom: 3px solid #0A4F99; }

                /* ─ Content area ─ */
                .dash-body { box-sizing: content-box; max-width: 1320px; margin: 0 auto; padding: clamp(0.75rem,2vw,1.25rem) clamp(0.75rem,1.6vw,1rem) 3rem; }

                /* ─ Main grid ─ */
                .dash-grid { display: grid; grid-template-columns: 300px 1fr; gap: 1.25rem; align-items: start; }
                @media (max-width: 900px) { .dash-grid { grid-template-columns: 1fr; } .dash-main { order: -1; } }

                /* ─ Card ─ */
                .dash-card { background: white; border-radius: 16px; border: 1px solid #E2E8F0; padding: clamp(1.1rem,2.5vw,1.5rem); box-shadow: 0 1px 4px rgba(0,0,0,0.04); }

                /* ─ Quick link button ─ */
                .ql-btn {
                    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px;
                    padding: 0.875rem 0.5rem; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;
                    cursor: pointer; font-family: var(--font-sans); text-decoration: none;
                    transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease, background-color .15s ease;
                }
                .ql-btn:hover { background: #EFF6FF; border-color: #BFDBFE; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,51,102,0.08); text-decoration: none; }
                .ql-btn:focus-visible, .feat-tile.allowed:focus-visible { outline: 2px solid #1D4ED8; outline-offset: 2px; }

                /* ─ Feature tile ─ */
                .feat-tile { display: flex; align-items: flex-start; gap: 12px; padding: 1rem; border-radius: 12px; border: 1px solid #E2E8F0; background: white; transition: background-color .15s ease, border-color .15s ease; }
                .feat-tile.allowed { cursor: pointer; }
                .feat-tile.allowed:hover { background: #EFF6FF; border-color: #BFDBFE; }
                .feat-tile.locked { opacity: 0.6; cursor: not-allowed; background: #FAFAFA; }

                /* ─ Event / news row ─ */
                .feed-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-radius: 10px; border: 1px solid #F1F5F9; transition: background-color .12s ease; cursor: pointer; }
                .feed-row:hover { background: #F8FAFC; }

                /* ─ Registration grid ─ */
                .reg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(260px,100%), 1fr)); gap: 0.875rem; }

                /* ─ Skeleton ─ */
                @keyframes dash-pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
                .skel { background: #E9EEF4; border-radius: 10px; animation: dash-pulse 1.5s ease-in-out infinite; }
                @media (prefers-reduced-motion: reduce) { .skel { animation: none; } .ql-btn { transition: none; } }

                /* ─ Section title ─ */
                .sec-title { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; font-weight: 700; color: #1E293B; margin: 0 0 1.1rem; }
            `}</style>

            <div className="dash-page">

                {/* ═══ HERO ═══ */}
                <div className="dash-hero">
                    <div style={{ maxWidth:'1320px', margin:'0 auto' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>

                            {/* Left: avatar + name */}
                            <div style={{ display:'flex', alignItems:'center', gap:'clamp(0.75rem,2vw,1.25rem)', minWidth:0 }}>
                                <div aria-hidden="true" style={{ width:'clamp(44px,6vw,56px)', height:'clamp(44px,6vw,56px)', borderRadius:'50%', background:'rgba(255,255,255,0.14)', border:'2px solid rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'clamp(1.1rem,2.5vw,1.4rem)', fontWeight:'800', color:'white', flexShrink:0 }}>
                                    {initial}
                                </div>
                                <div style={{ minWidth:0 }}>
                                    <p style={{ margin:'0 0 2px', fontSize:'0.75rem', color:'rgba(255,255,255,0.78)', fontWeight:'700', letterSpacing:'0.05em', textTransform:'uppercase' }}>
                                        {isTeam ? `${role.label} dashboard` : 'Member portal'}
                                    </p>
                                    <h1 style={{ margin:'0 0 3px', fontSize:'clamp(1.05rem,3vw,1.4rem)', fontWeight:'800', color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                        {user?.name}
                                    </h1>
                                    <p style={{ margin:0, fontSize:'0.8rem', color:'rgba(255,255,255,0.78)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</p>
                                </div>
                            </div>

                            {/* Right: role badge + sign out */}
                            <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', flexWrap:'wrap', flexShrink:0 }}>
                                <span style={{ padding:'0.3rem 0.9rem', borderRadius:'100px', fontSize:'0.72rem', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.07em', background:'rgba(255,255,255,0.14)', color:'white', border:'1px solid rgba(255,255,255,0.3)' }}>
                                    {role.label}
                                </span>
                                {user?.profile_badge && (
                                    <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'0.3rem 0.9rem', borderRadius:'100px', fontSize:'0.7rem', fontWeight:'700', background:'rgba(253,224,71,0.16)', color:'#FDE68A', border:'1px solid rgba(253,224,71,0.35)', whiteSpace:'nowrap' }}>
                                        <Award size={12} aria-hidden="true" /> {user.profile_badge}
                                    </span>
                                )}
                                <button onClick={handleLogout} className="kit-btn kit-focus"
                                    style={{ padding:'0.4rem 0.9rem', background:'rgba(255,255,255,0.1)', color:'white', border:'1px solid rgba(255,255,255,0.28)', borderRadius:'8px', fontWeight:'600', fontSize:'0.78rem', cursor:'pointer', fontFamily:'var(--font-sans)', display:'flex', alignItems:'center', gap:'5px', whiteSpace:'nowrap' }}>
                                    <LogOut size={13} aria-hidden="true" />Sign Out
                                </button>
                            </div>
                        </div>

                        {/* Stats strip */}
                        <div style={{ display:'flex', gap:'clamp(1rem,3vw,2rem)', marginTop:'1.4rem', flexWrap:'wrap' }}>
                            {[
                                { label:'Events Registered', value: loading ? '—' : registrations.length },
                                { label:'Upcoming Events',   value: loading ? '—' : events.length },
                                { label:'Membership',        value: role.label },
                                ...leadHeroStats(lead.data),
                            ].map(({ label, value }) => (
                                <div key={label}>
                                    <p style={{ margin:'0 0 1px', fontSize:'clamp(1rem,2.5vw,1.3rem)', fontWeight:'800', color:'white', lineHeight:1.1 }}>{value}</p>
                                    <p style={{ margin:0, fontSize:'0.7rem', color:'rgba(255,255,255,0.78)', fontWeight:'600' }}>{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ═══ BODY ═══ */}
                <div className="dash-body">
                    {isTeam ? (
                        <TeamDashboard
                            lead={lead}
                            tab={tab}
                            setTab={setTab}
                            showToast={showToast}
                            onReload={loadLead}
                            UnavailableView={
                                <LeadUnavailable error={lead.error} noProfile={lead.noProfile}
                                    onRetry={() => { setLead((s) => ({ ...s, loading: true })); loadLead(); }} />
                            }
                            member={{ events, registrations, posts, stats, usage, loading, openPosts: () => setShowPostsModal(true), openStats: () => setShowStatsModal(true) }}
                        />
                    ) : (
                        <div className="dash-grid">
                            <div className="dash-side" style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
                                <AccountCard rows={[
                                    { label:'Name', value: user?.name },
                                    { label:'Email', value: user?.email },
                                    { label:'Role', value: role.label },
                                    ...(user?.role === 'professional' && user?.professional_sub_type ? [{
                                        label: 'Type',
                                        value: user.professional_sub_type === 'working_professional' ? 'Working Professional' : 'Final Year Undergraduate',
                                    }] : []),
                                    { label:'Status', value: user?.status ?? 'Active' },
                                    ...(user?.profile_badge ? [{ label: 'Badge', value: user.profile_badge }] : []),
                                ]} />
                                <QuickLinksCard />
                                {user?.role === 'professional' && <ContributeCard isUndergrad={isUndergrad} />}
                            </div>

                            <div className="dash-main" style={{ display:'flex', flexDirection:'column', gap:'1.25rem', minWidth:0 }}>
                                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(280px,100%),1fr))', gap:'1.25rem' }}>
                                    <EventsCard events={events} loading={loading} />
                                    <PostsCard posts={posts} loading={loading} onSeeAll={() => setShowPostsModal(true)} />
                                </div>
                                <MyContactMessages />
                                <StatsCard stats={stats} usage={usage} loading={loading} canPost={can?.('feed.post')} onDetails={() => setShowStatsModal(true)} />
                                <FeatureTiles features={PLATFORM_FEATURES} />
                                <RegistrationsCard registrations={registrations} loading={loading} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <MyPostsModal isOpen={showPostsModal} onClose={() => setShowPostsModal(false)} />
            <MyStatsModal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} stats={stats} usage={usage} user={user} loading={loading} />
        </>
    );
};

export default UserDashboard;
