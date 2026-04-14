import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { getFeedPosts } from '../api/feed.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import FeedPost from '../components/feed/FeedPost.jsx';
import CreatePost from '../components/feed/CreatePost.jsx';
import FeedFilters from '../components/feed/FeedFilters.jsx';

const ITEMS_PER_PAGE = 10;

const SkeletonPost = ({ delay = 0 }) => (
    <div style={{
        background: 'white', borderRadius: '20px',
        border: '1px solid rgba(0,51,102,0.08)',
        padding: '1.5rem', overflow: 'hidden',
        animation: `cf-fadeslide 0.5s ease ${delay}ms both`,
    }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '1.1rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg,#e8edf3,#f1f5f9)', flexShrink: 0, animation: 'cf-shimmer 1.6s ease-in-out infinite' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px', justifyContent: 'center' }}>
                <div style={{ height: '13px', width: '38%', background: 'linear-gradient(90deg,#e8edf3 25%,#f8fafc 50%,#e8edf3 75%)', backgroundSize: '200% 100%', borderRadius: '6px', animation: 'cf-shimmer 1.6s ease-in-out infinite' }} />
                <div style={{ height: '10px', width: '22%', background: 'linear-gradient(90deg,#e8edf3 25%,#f8fafc 50%,#e8edf3 75%)', backgroundSize: '200% 100%', borderRadius: '6px', animation: 'cf-shimmer 1.6s ease-in-out infinite 0.1s' }} />
            </div>
        </div>
        {[92, 78, 61].map((w, i) => (
            <div key={i} style={{ height: '12px', width: `${w}%`, background: 'linear-gradient(90deg,#e8edf3 25%,#f8fafc 50%,#e8edf3 75%)', backgroundSize: '200% 100%', borderRadius: '5px', marginBottom: '9px', animation: `cf-shimmer 1.6s ease-in-out infinite ${i * 0.08}s` }} />
        ))}
        <div style={{ display: 'flex', gap: '8px', marginTop: '1.1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
            {[52, 62, 48, 44].map((w, i) => (
                <div key={i} style={{ height: '32px', width: `${w}px`, background: 'linear-gradient(90deg,#e8edf3 25%,#f8fafc 50%,#e8edf3 75%)', backgroundSize: '200% 100%', borderRadius: '8px', animation: `cf-shimmer 1.6s ease-in-out infinite ${i * 0.06}s` }} />
            ))}
        </div>
    </div>
);

const Sidebar = ({ onTagClick, topTags, totalCount }) => {
    const { user, isCouncilMember, isAdmin } = useAuth();
    const canPost = (isCouncilMember?.() || isAdmin?.());

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '86px' }}>

            {/* Feed identity card */}
            <div style={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,51,102,0.12)' }}>
                <div style={{ background: 'linear-gradient(135deg,#001433 0%,#002966 50%,#003d99 100%)', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                    <div style={{ position: 'absolute', bottom: '-30px', left: '20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(245,158,11,0.08)' }} />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 8px rgba(245,158,11,0.6)', animation: 'cf-pulse-dot 2s ease-in-out infinite' }} />
                            <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Live Feed</span>
                        </div>
                        <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.05rem', fontWeight: '800', color: 'white', letterSpacing: '-0.01em' }}>Community Feed</h3>
                        <p style={{ margin: '0 0 1rem', fontSize: '0.76rem', color: 'rgba(255,255,255,0.55)', lineHeight: '1.5' }}>
                            Curated knowledge from AI risk professionals.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            {[
                                { v: totalCount || '0', l: 'Posts' },
                                { v: '1,200+', l: 'Members' },
                            ].map(({ v, l }) => (
                                <div key={l} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.6rem 0.75rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'white', lineHeight: 1 }}>{v}</p>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', fontWeight: '600' }}>{l}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div style={{ background: 'white', padding: '1rem 1.25rem' }}>
                    {[
                        { dot: '#003366', text: 'Council Members can post' },
                        { dot: '#059669', text: 'All members can engage' },
                        { dot: '#f59e0b', text: 'Ranked by real engagement' },
                    ].map(({ dot, text }) => (
                        <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: dot, flexShrink: 0 }} />
                            <span style={{ fontSize: '0.78rem', color: '#475569' }}>{text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Popular tags */}
            {topTags.length > 0 && (
                <div style={{ background: 'white', borderRadius: '20px', padding: '1.25rem', border: '1px solid rgba(0,51,102,0.08)', boxShadow: '0 2px 16px rgba(0,51,102,0.05)' }}>
                    <p style={{ margin: '0 0 0.875rem', fontSize: '0.72rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Trending Tags</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {topTags.map((tag, i) => (
                            <button key={tag} onClick={() => onTagClick(tag)}
                                style={{ display: 'inline-flex', alignItems: 'center', background: i % 3 === 0 ? '#eff6ff' : i % 3 === 1 ? '#f0fdf4' : '#fffbeb', color: i % 3 === 0 ? '#1d4ed8' : i % 3 === 1 ? '#059669' : '#d97706', border: `1px solid ${i % 3 === 0 ? '#bfdbfe' : i % 3 === 1 ? '#bbf7d0' : '#fde68a'}`, borderRadius: '100px', fontSize: '0.72rem', fontWeight: '700', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.15s', textTransform: 'lowercase' }}
                                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
                                onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                                #{tag}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Upgrade nudge for professional members */}
            {user && !canPost && (
                <div style={{ background: 'linear-gradient(135deg,#001433,#002966)', borderRadius: '20px', padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(245,158,11,0.1)' }} />
                    <p style={{ margin: '0 0 4px', fontSize: '0.875rem', fontWeight: '800', color: 'white', position: 'relative', zIndex: 1 }}>Want to post?</p>
                    <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: 'rgba(147,197,253,0.8)', lineHeight: '1.5', position: 'relative', zIndex: 1 }}>
                        Council Members share knowledge and build their professional presence.
                    </p>
                    <a href="/membership" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f59e0b', color: '#1e293b', padding: '0.5rem 1rem', borderRadius: '10px', fontWeight: '800', fontSize: '0.78rem', textDecoration: 'none', position: 'relative', zIndex: 1, transition: 'all 0.15s' }}
                        onMouseOver={e => { e.currentTarget.style.background = '#fbbf24'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = '#f59e0b'; e.currentTarget.style.transform = 'none'; }}>
                        Upgrade to Council →
                    </a>
                </div>
            )}
        </div>
    );
};

const CommunityQnA = () => {
    const { user, isCouncilMember, isAdmin } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const sort      = searchParams.get('sort')  || 'trending';
    const tagFilter = searchParams.get('tag')   || '';
    const page      = parseInt(searchParams.get('page') || '1', 10);

    const [searchInput,   setSearchInput]   = useState(searchParams.get('q') || '');
    const debouncedSearch = useDebounce(searchInput, 380);
    const [posts,         setPosts]         = useState([]);
    const [totalPages,    setTotalPages]    = useState(1);
    const [totalCount,    setTotalCount]    = useState(0);
    const [loading,       setLoading]       = useState(true);
    const [loadingMore,   setLoadingMore]   = useState(false);
    const [error,         setError]         = useState('');
    const [topTags,       setTopTags]       = useState([]);
    const feedRef = useRef(null);

    const canPost = (isCouncilMember?.() || isAdmin?.());

    useEffect(() => { document.title = 'Community Feed | AI Risk Council'; }, []);

    const setParam = useCallback((key, value) => {
        setSearchParams(prev => {
            const n = new URLSearchParams(prev);
            if (value) n.set(key, value); else n.delete(key);
            if (key !== 'page') n.set('page', '1');
            return n;
        });
    }, [setSearchParams]);

    const fetchPosts = useCallback(async (pageNum = 1, append = false) => {
        if (pageNum === 1) setLoading(true); else setLoadingMore(true);
        setError('');
        try {
            const params = { sort, page: pageNum, limit: ITEMS_PER_PAGE };
            if (debouncedSearch) params.search = debouncedSearch;
            if (tagFilter)       params.tags   = tagFilter;
            const res = await getFeedPosts(params);
            if (res.data?.success) {
                const incoming = res.data.data || [];
                setPosts(prev => append ? [...prev, ...incoming] : incoming);
                setTotalPages(res.data.totalPages || 1);
                setTotalCount(res.data.total || 0);
                if (!append) {
                    const tagMap = {};
                    for (const p of incoming) {
                        if (p.tags) for (const t of p.tags) tagMap[t] = (tagMap[t] || 0) + 1;
                    }
                    setTopTags(Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t));
                }
            }
        } catch (err) {
            setError(getErrorMessage(err) || 'Failed to load feed.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [sort, debouncedSearch, tagFilter]);

    useEffect(() => {
        setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('page', '1'); return n; }, { replace: true });
        fetchPosts(1, false);
    }, [sort, debouncedSearch, tagFilter]);

    const handleLoadMore = () => { fetchPosts(page + 1, true); setParam('page', String(page + 1)); };
    const handlePostCreated  = useCallback((p) => { setPosts(prev => [p, ...prev]); setTotalCount(c => c + 1); }, []);
    const handlePostUpdate   = useCallback((u) => { setPosts(prev => prev.map(p => p.id === u.id ? { ...p, ...u } : p)); }, []);
    const handlePostDelete   = useCallback((id) => { setPosts(prev => prev.filter(p => p.id !== id)); setTotalCount(c => Math.max(0, c - 1)); }, []);
    const handleTagClick     = useCallback((tag) => { setParam('tag', tag === tagFilter ? '' : tag); }, [tagFilter, setParam]);

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap');

                @keyframes cf-fadeslide {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes cf-shimmer {
                    0%   { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                @keyframes cf-pulse-dot {
                    0%,100% { opacity: 1; transform: scale(1); }
                    50%     { opacity: 0.6; transform: scale(0.8); }
                }
                @keyframes cf-hero-float {
                    0%,100% { transform: translateY(0px) rotate(0deg); }
                    33%     { transform: translateY(-8px) rotate(1deg); }
                    66%     { transform: translateY(-4px) rotate(-0.5deg); }
                }
                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

                .cf-root { background: #f0f4f8; min-height: 100vh; font-family: 'DM Sans', var(--font-sans), sans-serif; }

                .cf-hero {
                    background: linear-gradient(135deg, #000d1a 0%, #001433 30%, #002266 65%, #003399 100%);
                    padding: clamp(1.5rem,4vw,2.5rem) clamp(1rem,4vw,2rem) clamp(3rem,6vw,4.5rem);
                    position: relative; overflow: hidden;
                }

                .cf-body {
                    max-width: 1100px; margin: -4rem auto 0;
                    padding: 0 clamp(0.875rem,3vw,1.5rem) 4rem;
                    display: grid;
                    grid-template-columns: 1fr 280px;
                    gap: 1.25rem; align-items: start;
                    position: relative; z-index: 1;
                }
                @media (max-width: 860px) {
                    .cf-body { grid-template-columns: 1fr; gap: 1rem; }
                    .cf-sidebar { order: 2; }
                    .cf-main { order: 1; }
                }

                .cf-load-more {
                    display: inline-flex; align-items: center; gap: 8px;
                    background: white; border: 1.5px solid rgba(0,51,102,0.15);
                    border-radius: 14px; padding: 0.8rem 2rem;
                    font-weight: 700; font-size: 0.875rem; color: #1e293b;
                    cursor: pointer; font-family: inherit;
                    transition: all 0.2s; box-shadow: 0 2px 12px rgba(0,51,102,0.06);
                }
                .cf-load-more:hover {
                    border-color: #003366; color: #003366;
                    box-shadow: 0 4px 20px rgba(0,51,102,0.12);
                    transform: translateY(-1px);
                }
                .cf-load-more:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

                .cf-login-card {
                    background: white; border-radius: 20px;
                    border: 1px solid rgba(0,51,102,0.08);
                    padding: 1.5rem; text-align: center;
                    box-shadow: 0 2px 16px rgba(0,51,102,0.05);
                    animation: cf-fadeslide 0.4s ease both;
                }

                .cf-empty {
                    background: white; border-radius: 20px;
                    border: 2px dashed rgba(0,51,102,0.12);
                    padding: 4rem 2rem; text-align: center;
                    animation: cf-fadeslide 0.4s ease both;
                }
            `}</style>

            <div className="cf-root">

                {/* ── Hero ── */}
                <div className="cf-hero">
                    {/* Decorative floating shapes */}
                    <div style={{ position:'absolute', top:'20%', right:'8%', width:'140px', height:'140px', borderRadius:'30% 70% 70% 30% / 30% 30% 70% 70%', background:'rgba(245,158,11,0.07)', animation:'cf-hero-float 8s ease-in-out infinite', pointerEvents:'none' }} />
                    <div style={{ position:'absolute', bottom:'10%', left:'5%', width:'90px', height:'90px', borderRadius:'50%', background:'rgba(255,255,255,0.04)', animation:'cf-hero-float 6s ease-in-out infinite 2s', pointerEvents:'none' }} />
                    <div style={{ position:'absolute', top:'40%', left:'25%', width:'4px', height:'4px', borderRadius:'50%', background:'rgba(245,158,11,0.5)', boxShadow:'0 0 12px rgba(245,158,11,0.4)', pointerEvents:'none' }} />
                    <div style={{ position:'absolute', top:'30%', right:'30%', width:'3px', height:'3px', borderRadius:'50%', background:'rgba(255,255,255,0.4)', pointerEvents:'none' }} />

                    {/* Mesh gradient overlay */}
                    <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(ellipse at 80% 50%, rgba(0,85,170,0.3) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(245,158,11,0.08) 0%, transparent 50%)', pointerEvents:'none' }} />

                    <div style={{ maxWidth:'1160px', margin:'0 auto', position:'relative', zIndex:1 }}>
                        <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:'100px', padding:'4px 12px', marginBottom:'1rem' }}>
                            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#f59e0b', animation:'cf-pulse-dot 2s ease-in-out infinite' }} />
                            <span style={{ fontSize:'0.65rem', fontWeight:'800', color:'#fbbf24', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:"'Sora',sans-serif" }}>AI Risk Knowledge Hub</span>
                        </div>

                        <h1 style={{ fontFamily:"'Sora',sans-serif", fontSize:'clamp(1.6rem,3.5vw,2.4rem)', fontWeight:'900', color:'white', margin:'0 0 0.5rem', lineHeight:1.15, letterSpacing:'-0.02em', maxWidth:'600px' }}>
                            Where AI Risk Professionals
                            <span style={{ display:'block', background:'linear-gradient(90deg,#f59e0b,#fbbf24)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                                Share What Matters
                            </span>
                        </h1>

                        <p style={{ fontSize:'clamp(0.85rem,1.3vw,0.95rem)', color:'rgba(255,255,255,0.65)', margin:'0 0 1.5rem', lineHeight:'1.6', maxWidth:'460px' }}>
                            Curated insights, research, and discussion from the people building safer AI systems.
                        </p>

                        <div style={{ display:'flex', gap:'clamp(1rem,2.5vw,2rem)', flexWrap:'wrap' }}>
                            {[
                                { v: totalCount || '0', l: 'Posts published' },
                                { v: '1,200+', l: 'Active members' },
                                { v: '50+', l: 'Topics covered' },
                            ].map(({ v, l }) => (
                                <div key={l}>
                                    <p style={{ margin:0, fontFamily:"'Sora',sans-serif", fontSize:'clamp(1.2rem,2.5vw,1.6rem)', fontWeight:'900', color:'white', lineHeight:1 }}>{v}</p>
                                    <p style={{ margin:'3px 0 0', fontSize:'0.72rem', color:'rgba(255,255,255,0.4)', fontWeight:'600', letterSpacing:'0.03em' }}>{l}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="cf-body">

                    {/* ── Main ── */}
                    <div className="cf-main" style={{ display:'flex', flexDirection:'column', gap:'1rem', minWidth:0 }}>

                        {canPost && <CreatePost onPostCreated={handlePostCreated} />}

                        {!user && (
                            <div className="cf-login-card">
                                <p style={{ margin:'0 0 0.875rem', fontSize:'0.9rem', color:'#64748b' }}>
                                    <strong style={{ color:'#1e293b' }}>Join the conversation</strong> — sign in to like, comment and save posts.
                                </p>
                                <div style={{ display:'flex', gap:'8px', justifyContent:'center' }}>
                                    <a href="/login" style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:'#003366', color:'white', padding:'0.55rem 1.25rem', borderRadius:'10px', fontWeight:'700', fontSize:'0.84rem', textDecoration:'none', transition:'all 0.15s' }}
                                        onMouseOver={e => e.currentTarget.style.background='#002244'}
                                        onMouseOut={e => e.currentTarget.style.background='#003366'}>Sign In</a>
                                    <a href="/register" style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:'white', color:'#003366', padding:'0.55rem 1.25rem', borderRadius:'10px', fontWeight:'700', fontSize:'0.84rem', textDecoration:'none', border:'1.5px solid rgba(0,51,102,0.15)', transition:'all 0.15s' }}
                                        onMouseOver={e => { e.currentTarget.style.background='#eff6ff'; e.currentTarget.style.borderColor='#003366'; }}
                                        onMouseOut={e => { e.currentTarget.style.background='white'; e.currentTarget.style.borderColor='rgba(0,51,102,0.15)'; }}>Create Account</a>
                                </div>
                            </div>
                        )}

                        <FeedFilters
                            sort={sort}
                            onSortChange={v => setParam('sort', v)}
                            search={searchInput}
                            onSearchChange={v => { setSearchInput(v); setParam('q', v); }}
                            tagFilter={tagFilter}
                            onTagFilterChange={v => setParam('tag', v)}
                        />

                        {loading ? (
                            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                                {[0,80,160].map(d => <SkeletonPost key={d} delay={d} />)}
                            </div>
                        ) : error ? (
                            <div style={{ background:'white', borderRadius:'20px', border:'1px solid #fca5a5', padding:'2.5rem', textAlign:'center' }}>
                                <p style={{ margin:'0 0 1rem', color:'#DC2626', fontSize:'0.9rem' }}>{error}</p>
                                <button onClick={() => fetchPosts(1)}
                                    style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'#003366', color:'white', border:'none', padding:'0.65rem 1.5rem', borderRadius:'10px', cursor:'pointer', fontWeight:'700', fontSize:'0.84rem', fontFamily:'inherit' }}>
                                    Try Again
                                </button>
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="cf-empty">
                                <div style={{ width:'64px', height:'64px', borderRadius:'20px', background:'linear-gradient(135deg,#eff6ff,#dbeafe)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.25rem', fontSize:'1.75rem' }}>
                                    💡
                                </div>
                                <p style={{ margin:'0 0 6px', fontFamily:"'Sora',sans-serif", fontSize:'1rem', fontWeight:'700', color:'#1e293b' }}>
                                    {tagFilter || searchInput ? 'No matching posts' : 'The feed is waiting'}
                                </p>
                                <p style={{ margin:0, fontSize:'0.84rem', color:'#94a3b8' }}>
                                    {tagFilter || searchInput ? 'Try a different filter.' : 'Be the first Council Member to share something.'}
                                </p>
                            </div>
                        ) : (
                            <>
                                {(tagFilter || debouncedSearch) ? (
                                    <p style={{ margin:'0 0 2px', fontSize:'0.78rem', color:'#94a3b8', fontWeight:'500' }}>
                                        {totalCount} result{totalCount !== 1 ? 's' : ''}
                                        {tagFilter && <> for <strong style={{ color:'#003366' }}>#{tagFilter}</strong></>}
                                        {debouncedSearch && <> matching <strong style={{ color:'#003366' }}>"{debouncedSearch}"</strong></>}
                                    </p>
                                ) : null}
                                <div ref={feedRef} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                                    {posts.map((post, i) => (
                                        <div key={post.id} style={{ animation: `cf-fadeslide 0.4s ease ${Math.min(i,4) * 60}ms both` }}>
                                            <FeedPost
                                                post={post}
                                                compact={true}
                                                onTagClick={handleTagClick}
                                                onUpdate={handlePostUpdate}
                                                onDelete={handlePostDelete}
                                            />
                                        </div>
                                    ))}
                                </div>
                                {page < totalPages ? (
                                    <div style={{ textAlign:'center', paddingTop:'0.5rem' }}>
                                        <button onClick={handleLoadMore} disabled={loadingMore} className="cf-load-more">
                                            {loadingMore
                                                ? <><span style={{ width:'14px', height:'14px', border:'2px solid #e2e8f0', borderTopColor:'#003366', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }} /> Loading…</>
                                                : 'Load more posts'
                                            }
                                        </button>
                                    </div>
                                ) : null}
                            </>
                        )}
                    </div>

                    {/* ── Sidebar ── */}
                    <aside className="cf-sidebar">
                        <Sidebar onTagClick={handleTagClick} topTags={topTags} totalCount={totalCount} />
                    </aside>
                </div>
            </div>
        </>
    );
};

export default CommunityQnA;