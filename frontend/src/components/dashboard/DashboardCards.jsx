import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    User, Calendar, BookOpen, ArrowRight, MessageSquare, HelpCircle, ClipboardList, MapPin,
    CheckCircle, Lock, Zap, Users, FileText, ChevronRight, Heart, Bookmark, BarChart2, Download, Crown, HeartHandshake,
} from 'lucide-react';

/**
 * The cards of the member dashboard (/user/dashboard), one component each, so the page that lays them out
 * (UserDashboard for everyone, TeamDashboard for the chapter team) only decides where they go.
 * The classes used here (.dash-card, .feed-row, .sec-title ...) are defined by UserDashboard.
 */

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

const getCountdown = (dateStr) => {
    const diff = new Date(dateStr) - new Date();
    if (diff <= 0) return 'Now';
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    return `${days} days`;
};

const timeAgo = (dateString) => {
    const minutes = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
};

const linkButton = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#003366', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px', padding: 0, fontFamily: 'var(--font-sans)', flexShrink: 0 };

const CardHead = ({ icon: Icon, title, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <h3 className="sec-title" style={{ margin: 0 }}><Icon size={15} color="#003366" aria-hidden="true" /> {title}</h3>
        {children}
    </div>
);

const EmptyNote = ({ icon: Icon, children }) => (
    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748B' }}>
        <Icon size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} aria-hidden="true" />
        <p style={{ fontSize: '0.85rem', margin: 0 }}>{children}</p>
    </div>
);

export const EventsCard = ({ events, loading }) => {
    const navigate = useNavigate();
    return (
        <div className="dash-card">
            <CardHead icon={Calendar} title="Upcoming Events">
                <Link to="/events" style={{ ...linkButton, textDecoration: 'none' }}>All <ChevronRight size={13} aria-hidden="true" /></Link>
            </CardHead>
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {[1, 2, 3].map((i) => <div key={i} className="skel" style={{ height: '60px' }} />)}
                </div>
            ) : events.length === 0 ? (
                <EmptyNote icon={Calendar}>No upcoming events.</EmptyNote>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {events.slice(0, 4).map((ev) => (
                        <div key={ev.id} className="feed-row" onClick={() => navigate('/events')}>
                            <div style={{ width: '38px', height: '38px', background: '#EFF6FF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Calendar size={16} color="#003366" aria-hidden="true" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontWeight: '600', fontSize: '0.85rem', color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</p>
                                <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: '#64748B' }}>{fmtDate(ev.date)}</p>
                            </div>
                            <span style={{ flexShrink: 0, background: '#EFF6FF', color: '#003366', fontSize: '0.63rem', fontWeight: '700', padding: '2px 8px', borderRadius: '100px', whiteSpace: 'nowrap' }}>
                                {getCountdown(ev.date)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const PostsCard = ({ posts, loading, onSeeAll, emptyAction }) => {
    const navigate = useNavigate();
    return (
        <div className="dash-card">
            <CardHead icon={MessageSquare} title="My Posts">
                <button onClick={onSeeAll} className="kit-focus" style={linkButton}>All <ChevronRight size={13} aria-hidden="true" /></button>
            </CardHead>
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {[1, 2].map((i) => <div key={i} className="skel" style={{ height: '75px' }} />)}
                </div>
            ) : posts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.6rem 1rem', color: '#64748B' }}>
                    <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} aria-hidden="true" />
                    <p style={{ fontSize: '0.85rem', margin: 0 }}>You haven't published any posts yet.</p>
                    {emptyAction && (
                        <Link to={emptyAction.to} className="kit-btn kit-focus" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: '0.8rem', background: '#003366', color: 'white', padding: '0.5rem 1.1rem', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none' }}>
                            {emptyAction.label} <ArrowRight size={13} aria-hidden="true" />
                        </Link>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {posts.slice(0, 4).map((post) => (
                        <div key={post.id} className="feed-row" onClick={() => navigate(`/community-qna/${post.id}`)} style={{ alignItems: 'flex-start' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: '0 0 0.35rem', fontSize: '0.84rem', color: '#1E293B', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.content}</p>
                                <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#64748B' }}>{timeAgo(post.created_at)}</span>
                                    <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Heart size={11} aria-hidden="true" /> {post.like_count}</span>
                                    <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: 3 }}><MessageSquare size={11} aria-hidden="true" /> {post.comment_count}</span>
                                    <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Bookmark size={11} aria-hidden="true" /> {post.save_count}</span>
                                    {!!post.is_hidden && <span style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: '700' }}>Hidden</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const StatsCard = ({ stats, usage, loading, canPost, onDetails }) => (
    <div className="dash-card">
        <CardHead icon={BarChart2} title="My Stats">
            <button onClick={onDetails} className="kit-focus" style={linkButton}>Details <ChevronRight size={13} aria-hidden="true" /></button>
        </CardHead>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(140px,100%),1fr))', gap: '0.875rem' }}>
            {[
                { label: 'Comments Made', value: stats?.comments_made ?? '—', icon: MessageSquare, color: '#0369A1', bg: '#EFF6FF' },
                { label: 'Likes Given', value: stats?.likes_given ?? '—', icon: Heart, color: '#DC2626', bg: '#FEF2F2' },
                { label: 'Posts Saved', value: stats?.posts_saved ?? '—', icon: Bookmark, color: '#7C3AED', bg: '#FAF5FF' },
                { label: 'Downloads Used', value: usage?.unlimited ? '∞' : (usage?.used ?? '—'), icon: Download, color: '#059669', bg: '#ECFDF5' },
                ...(canPost ? [{ label: 'Total Posts', value: stats?.total_posts ?? '—', icon: FileText, color: '#003366', bg: '#EFF6FF' }] : []),
            ].map((s) => (
                <div key={s.label} style={{ background: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '8px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <s.icon size={15} color={s.color} aria-hidden="true" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#1E293B', lineHeight: 1 }}>{loading ? '—' : s.value}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

/** Tiles that open a part of the portal. `features` = [{ icon, label, desc, path, allowed, lockMsg }]. Locked ones are shown only when `showLocked`. */
export const FeatureTiles = ({ title = 'Platform Features', features, showLocked = true }) => {
    const navigate = useNavigate();
    const shown = showLocked ? features : features.filter((f) => f.allowed);
    return (
        <div className="dash-card">
            <h3 className="sec-title"><Zap size={15} color="#003366" aria-hidden="true" /> {title}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(200px,100%),1fr))', gap: '0.75rem' }}>
                {shown.map(({ icon: FIcon, label, desc, path, allowed, lockMsg }) => (
                    <div
                        key={label}
                        className={`feat-tile ${allowed ? 'allowed' : 'locked'}`}
                        role={allowed ? 'link' : undefined}
                        tabIndex={allowed ? 0 : undefined}
                        onKeyDown={(e) => { if (allowed && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); navigate(path); } }}
                        onClick={() => allowed && navigate(path)}
                    >
                        <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: allowed ? '#EFF6FF' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {allowed ? <FIcon size={16} color="#003366" aria-hidden="true" /> : <Lock size={14} color="#94A3B8" aria-hidden="true" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: '700', fontSize: '0.84rem', color: allowed ? '#1E293B' : '#64748B' }}>{label}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#64748B', lineHeight: '1.4' }}>{allowed ? desc : lockMsg}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const CATEGORY = {
    webinar: ['#1D4ED8', '#EFF6FF'], seminar: ['#16A34A', '#F0FDF4'], workshop: ['#D97706', '#FFFBEB'], podcast: ['#7C3AED', '#FAF5FF'],
};

export const RegistrationsCard = ({ registrations, loading }) => (
    <div className="dash-card">
        <CardHead icon={ClipboardList} title="My Event Registrations">
            <Link to="/events" style={{ ...linkButton, textDecoration: 'none' }}>Browse <ChevronRight size={13} aria-hidden="true" /></Link>
        </CardHead>
        {loading ? (
            <div className="reg-grid">{[1, 2, 3].map((i) => <div key={i} className="skel" style={{ height: '100px' }} />)}</div>
        ) : registrations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#F8FAFC', borderRadius: '12px', border: '1.5px dashed #E2E8F0' }}>
                <ClipboardList size={36} style={{ opacity: 0.25, display: 'block', margin: '0 auto 0.75rem' }} aria-hidden="true" />
                <p style={{ fontSize: '0.9rem', color: '#64748B', marginBottom: '0.75rem' }}>You haven't registered for any events yet.</p>
                <Link to="/events" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#003366', color: 'white', padding: '0.55rem 1.25rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.82rem', textDecoration: 'none' }}>
                    Find Events <ArrowRight size={13} aria-hidden="true" />
                </Link>
            </div>
        ) : (
            <div className="reg-grid">
                {registrations.map((reg) => {
                    const [color, bg] = CATEGORY[(reg.event_category || '').toLowerCase()] || ['#64748B', '#F1F5F9'];
                    const isPast = !reg.is_upcoming;
                    return (
                        <div key={reg.id} className="kit-lift" style={{ border: '1px solid #E2E8F0', borderLeft: `3px solid ${color}`, borderRadius: '10px', padding: '0.9rem 1rem', background: 'white' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ background: bg, color, fontSize: '0.63rem', fontWeight: '700', padding: '2px 8px', borderRadius: '100px', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{reg.event_category}</span>
                                <span style={{ background: isPast ? '#F1F5F9' : '#DCFCE7', color: isPast ? '#64748B' : '#16A34A', fontSize: '0.63rem', fontWeight: '700', padding: '2px 8px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                                    <CheckCircle size={9} aria-hidden="true" /> {isPast ? 'Past' : 'Upcoming'}
                                </span>
                            </div>
                            <p style={{ margin: '0 0 0.35rem', fontWeight: '700', fontSize: '0.875rem', color: '#1E293B', lineHeight: '1.3' }}>{reg.event_title}</p>
                            <p style={{ margin: 0, fontSize: '0.73rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Calendar size={11} color={color} aria-hidden="true" /> {fmtDate(reg.event_date)}
                            </p>
                            {reg.event_location && (
                                <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <MapPin size={11} color={color} aria-hidden="true" /> {reg.event_location}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        )}
    </div>
);

/** Name, email, role and the rows a caller adds (chapter, term ...), with a way to edit the profile. */
export const AccountCard = ({ rows }) => {
    const navigate = useNavigate();
    return (
        <div className="dash-card">
            <h3 className="sec-title"><User size={15} color="#003366" aria-hidden="true" /> My Account</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.1rem' }}>
                {rows.map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #F1F5F9', fontSize: '0.85rem' }}>
                        <span style={{ color: '#64748B', fontWeight: '500', flexShrink: 0 }}>{label}</span>
                        <span style={{ color: '#1E293B', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, textAlign: 'right' }}>{value}</span>
                    </div>
                ))}
            </div>
            <button onClick={() => navigate('/profile')} className="kit-btn kit-focus"
                style={{ width: '100%', padding: '0.65rem', background: '#003366', color: 'white', border: 'none', borderRadius: '9px', fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <User size={14} aria-hidden="true" /> Edit Profile
            </button>
        </div>
    );
};

const QUICK_LINKS = [
    { icon: User, label: 'Edit Profile', path: '/profile', color: '#003366' },
    { icon: Calendar, label: 'All Events', path: '/events', color: '#0369A1' },
    { icon: MessageSquare, label: 'Community Feed', path: '/community-qna', color: '#059669' },
    { icon: HelpCircle, label: 'AI Framework', path: '/framework', color: '#7C3AED' },
    { icon: BookOpen, label: 'Resources', path: '/resources', color: '#D97706' },
    { icon: FileText, label: 'Certifications', path: '/certification', color: '#DC2626' },
];

export const QuickLinksCard = () => (
    <div className="dash-card">
        <h3 className="sec-title"><Zap size={15} color="#003366" aria-hidden="true" /> Quick Links</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            {QUICK_LINKS.map(({ icon: Icon, label, path, color }) => (
                <Link key={path} to={path} className="ql-btn">
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={17} color={color} aria-hidden="true" />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#374151', fontWeight: '600', textAlign: 'center', lineHeight: '1.2' }}>{label}</span>
                </Link>
            ))}
        </div>
    </div>
);

/** For professionals who are not on a chapter team yet: what joining one means, in plain words. */
export const ContributeCard = ({ isUndergrad }) => (
    <div className="dash-card">
        <h3 className="sec-title"><Users size={15} color="#003366" aria-hidden="true" /> Ways to contribute</h3>
        <div style={{ display: 'grid', gap: '0.7rem' }}>
            <Link to="/membership" className="kit-lift kit-focus" style={{ display: 'flex', gap: '0.7rem', textDecoration: 'none', padding: '0.75rem', border: '1px solid #E2E8F0', borderRadius: '12px', color: 'inherit' }}>
                <HeartHandshake size={18} color="#0F766E" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                <span>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: '#1E293B' }}>Chapter Ambassador</strong>
                    <span style={{ fontSize: '0.76rem', color: '#64748B', lineHeight: 1.5 }}>Volunteer with a chapter near you. Post, write and bring in members, with the chapter's lead.</span>
                </span>
            </Link>
            <Link to="/membership" className="kit-lift kit-focus" style={{ display: 'flex', gap: '0.7rem', textDecoration: 'none', padding: '0.75rem', border: '1px solid #E2E8F0', borderRadius: '12px', color: 'inherit' }}>
                <Crown size={18} color="#0369A1" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                <span>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: '#1E293B' }}>Chapter Lead</strong>
                    <span style={{ fontSize: '0.76rem', color: '#64748B', lineHeight: 1.5 }}>Lead a chapter, approve its ambassadors and shape its programme.</span>
                </span>
            </Link>
            {isUndergrad && (
                <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748B', lineHeight: 1.55 }}>
                    Final-year undergraduates can also request an upgrade to Working Professional for resource downloads, on the <Link to="/membership" style={{ color: '#003366', fontWeight: 700 }}>Membership page</Link>.
                </p>
            )}
        </div>
    </div>
);
