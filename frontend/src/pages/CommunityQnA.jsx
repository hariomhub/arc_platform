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
        padding: '1.25rem', overflow: 'hidden',
        animation: `cf-fadeslide 0.5s ease ${delay}ms both`,
    }}>
        <style>{`@keyframes cf-shimmer2{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(90deg,#e8edf3 25%,#f8fafc 50%,#e8edf3 75%)', backgroundSize: '200% 100%', flexShrink: 0, animation: 'cf-shimmer2 1.6s ease-in-out infinite' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
                <div style={{ height: 12, width: '35%', background: 'linear-gradient(90deg,#e8edf3 25%,#f8fafc 50%,#e8edf3 75%)', backgroundSize: '200% 100%', borderRadius: 5, animation: 'cf-shimmer2 1.6s ease-in-out infinite' }} />
                <div style={{ height: 9, width: '20%', background: 'linear-gradient(90deg,#e8edf3 25%,#f8fafc 50%,#e8edf3 75%)', backgroundSize: '200% 100%', borderRadius: 4, animation: 'cf-shimmer2 1.6s ease-in-out infinite .1s' }} />
            </div>
        </div>
        {[88, 73, 57].map((w, i) => (
            <div key={i} style={{ height: 11, width: `${w}%`, background: 'linear-gradient(90deg,#e8edf3 25%,#f8fafc 50%,#e8edf3 75%)', backgroundSize: '200% 100%', borderRadius: 4, marginBottom: 8, animation: `cf-shimmer2 1.6s ease-in-out infinite ${i * 0.07}s` }} />
        ))}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
            {[48, 58, 44].map((w, i) => (
                <div key={i} style={{ height: 28, width: w, background: 'linear-gradient(90deg,#e8edf3 25%,#f8fafc 50%,#e8edf3 75%)', backgroundSize: '200% 100%', borderRadius: 7, animation: `cf-shimmer2 1.6s ease-in-out infinite ${i * 0.06}s` }} />
            ))}
        </div>
    </div>
);

const Sidebar = ({ onTagClick, topTags, totalCount }) => {
    const { user, isCouncilMember, isAdmin } = useAuth();
    const canPost = (isCouncilMember?.() || isAdmin?.());

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'sticky', top: '76px' }}>

            {/* Feed identity card */}
            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,51,102,0.1)', boxShadow: '0 2px 12px rgba(0,51,102,0.07)' }}>
                <div style={{ background: '#003366', padding: '16px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -16, right: -16, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', animation: 'cf-pulse-dot 2s ease-in-out infinite' }} />
                            <span style={{ fontSize: '0.62rem', fontWeight: '800', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Live Feed</span>
                        </div>
                        <h3 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: '800', color: 'white' }}>Community Feed</h3>
                        <p style={{ margin: '0 0 12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', lineHeight: '1.5' }}>
                            Curated knowledge from AI risk professionals.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            {[
                                { v: totalCount > 0 ? totalCount : '—', l: 'Posts' },
                                { v: '1,200+', l: 'Members' },
                            ].map(({ v, l }) => (
                                <div key={l} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: 'white', lineHeight: 1 }}>{v}</p>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', fontWeight: '600' }}>{l}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div style={{ background: 'white', padding: '10px 14px' }}>
                    {[
                        { dot: '#003366', text: 'Council Members can post' },
                        { dot: '#057642', text: 'All members can engage' },
                        { dot: '#f59e0b', text: 'Ranked by engagement' },
                    ].map(({ dot, text }) => (
                        <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 0' }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                            <span style={{ fontSize: '0.76rem', color: '#475569' }}>{text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Popular tags */}
            {topTags.length > 0 && (
                <div style={{ background: 'white', borderRadius: '12px', padding: '12px 14px', border: '1px solid rgba(0,51,102,0.08)', boxShadow: '0 2px 8px rgba(0,51,102,0.04)' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '0.68rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Trending Tags</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {topTags.map((tag, i) => (
                            <button key={tag} onClick={() => onTagClick(tag)}
                                style={{
                                    display: 'inline-flex', alignItems: 'center',
                                    background: i % 3 === 0 ? '#eef2ff' : i % 3 === 1 ? '#f0fdf4' : '#fffbeb',
                                    color: i % 3 === 0 ? '#003366' : i % 3 === 1 ? '#057642' : '#d97706',
                                    border: 'none', borderRadius: 4, fontSize: '0.71rem', fontWeight: '700',
                                    padding: '3px 8px', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                                    transition: 'all 0.13s',
                                }}
                                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)'; }}
                                onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                                #{tag}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Upgrade nudge */}
            {user && !canPost && (
                <div style={{ background: '#003366', borderRadius: '12px', padding: '14px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -16, right: -16, width: 64, height: 64, borderRadius: '50%', background: 'rgba(245,158,11,0.1)' }} />
                    <p style={{ margin: '0 0 4px', fontSize: '0.84rem', fontWeight: '800', color: 'white', position: 'relative', zIndex: 1 }}>Want to post?</p>
                    <p style={{ margin: '0 0 10px', fontSize: '0.74rem', color: 'rgba(147,197,253,0.85)', lineHeight: '1.5', position: 'relative', zIndex: 1 }}>
                        Council Members share knowledge and build their professional presence.
                    </p>
                    <a href="/membership"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f59e0b', color: '#1e293b', padding: '6px 12px', borderRadius: 7, fontWeight: '800', fontSize: '0.76rem', textDecoration: 'none', position: 'relative', zIndex: 1 }}
                        onMouseOver={e => { e.currentTarget.style.background = '#fbbf24'; }}
                        onMouseOut={e => { e.currentTarget.style.background = '#f59e0b'; }}>
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

    const canPost = (isCouncilMember?.() || isAdmin?.());
    const feedRef = useRef(null);

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

    const handleLoadMore   = () => { fetchPosts(page + 1, true); setParam('page', String(page + 1)); };
    const handlePostCreated = useCallback((p)  => { setPosts(prev => [p, ...prev]); setTotalCount(c => c + 1); }, []);
    const handlePostUpdate  = useCallback((u)  => { setPosts(prev => prev.map(p => p.id === u.id ? { ...p, ...u } : p)); }, []);
    const handlePostDelete  = useCallback((id) => { setPosts(prev => prev.filter(p => p.id !== id)); setTotalCount(c => Math.max(0, c - 1)); }, []);
    const handleTagClick    = useCallback((tag) => { setParam('tag', tag === tagFilter ? '' : tag); }, [tagFilter, setParam]);

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap');

                @keyframes cf-fadeslide { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
                @keyframes cf-pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.8)} }
                @keyframes cf-hero-float { 0%,100%{transform:translateY(0)rotate(0)} 33%{transform:translateY(-6px)rotate(1deg)} 66%{transform:translateY(-3px)rotate(-.5deg)} }
                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

                .cf-root { background: #f0f4f8; min-height: 100vh; font-family: 'DM Sans', var(--font-sans), sans-serif; }

                /* ── Compact hero ── */
                .cf-hero {
                    background: linear-gradient(135deg, #000d1a 0%, #001433 30%, #002266 65%, #003399 100%);
                    padding: clamp(1.25rem,3vw,2rem) clamp(1rem,4vw,2rem) clamp(2.5rem,5vw,4rem);
                    position: relative; overflow: hidden;
                }

                /* ── Body ── */
                .cf-body {
                    max-width: 1100px; margin: -2.5rem auto 0;
                    padding: 0 clamp(0.75rem,3vw,1.5rem) 4rem;
                    display: grid;
                    grid-template-columns: 1fr 272px;
                    gap: 14px; align-items: start;
                    position: relative; z-index: 1;
                }
                @media (max-width: 860px) {
                    .cf-body { grid-template-columns: 1fr; gap: 12px; }
                    .cf-sidebar { order: 2; }
                    .cf-main { order: 1; }
                }
                @media (max-width: 480px) {
                    .cf-hero { padding: 1rem 1rem 2.5rem; }
                    .cf-body { padding: 0 0.75rem 3rem; margin-top: -2rem; }
                }

                /* ── Individual Post Card ── */
                .cf-post-item {
                    background: white;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                }

                .cf-empty-card {
                    background: white; border-radius: 8px; border: 1px solid #e2e8f0;
                    padding: 3rem 1.5rem; text-align: center;
                }

                .cf-error-card {
                    background: white; border-radius: 8px; border: 1px solid #fca5a5;
                    padding: 2rem 1.5rem; text-align: center;
                }

                .cf-load-more {
                    display: flex; align-items: center; justify-content: center; gap: 7px;
                    width: 100%; padding: 11px;
                    background: white; border: 1px solid rgba(0,51,102,0.1); border-radius: 12px;
                    font-size: 0.82rem; font-weight: 700; color: #003366;
                    cursor: pointer; font-family: inherit; transition: background 0.13s;
                    box-shadow: 0 1px 6px rgba(0,51,102,0.05);
                }
                .cf-load-more:hover { background: #f0f5ff; }
                .cf-load-more:disabled { color: #9aaab7; cursor: not-allowed; background: white; }

                .cf-empty {
                    padding: 40px 20px; text-align: center;
                }

                .cf-login-card {
                    background: white; border-radius: 12px;
                    border: 1px solid rgba(0,51,102,0.08);
                    padding: 14px 16px; text-align: center;
                    box-shadow: 0 1px 6px rgba(0,51,102,0.04);
                }
            `}</style>

            <div className="cf-root">

                {/* ── Hero — kept but tighter ── */}
                <div className="cf-hero">
                    <div style={{ position:'absolute', top:'15%', right:'6%', width:110, height:110, borderRadius:'30% 70% 70% 30% / 30% 30% 70% 70%', background:'rgba(245,158,11,0.06)', animation:'cf-hero-float 8s ease-in-out infinite', pointerEvents:'none' }} />
                    <div style={{ position:'absolute', bottom:'8%', left:'4%', width:70, height:70, borderRadius:'50%', background:'rgba(255,255,255,0.03)', animation:'cf-hero-float 6s ease-in-out infinite 2s', pointerEvents:'none' }} />
                    <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(ellipse at 80% 50%, rgba(0,85,170,0.25) 0%, transparent 60%)', pointerEvents:'none' }} />

                    <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                        <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:100, padding:'3px 10px', marginBottom:'0.75rem' }}>
                            <div style={{ width:5, height:5, borderRadius:'50%', background:'#f59e0b', animation:'cf-pulse-dot 2s ease-in-out infinite' }} />
                            <span style={{ fontSize:'0.62rem', fontWeight:'800', color:'#fbbf24', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:"'Sora',sans-serif" }}>AI Risk Knowledge Hub</span>
                        </div>

                        <h1 style={{ fontFamily:"'Sora',sans-serif", fontSize:'clamp(1.4rem,3vw,2.1rem)', fontWeight:'900', color:'white', margin:'0 0 0.4rem', lineHeight:1.15, letterSpacing:'-0.02em', maxWidth:520 }}>
                            Where AI Risk Professionals
                            <span style={{ display:'block', background:'linear-gradient(90deg,#f59e0b,#fbbf24)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                                Share What Matters
                            </span>
                        </h1>

                        <p style={{ fontSize:'clamp(0.8rem,1.2vw,0.9rem)', color:'rgba(255,255,255,0.6)', margin:'0 0 1.1rem', lineHeight:'1.6', maxWidth:420 }}>
                            Curated insights, research, and discussion from the people building safer AI systems.
                        </p>

                        <div style={{ display:'flex', gap:'clamp(1rem,2.5vw,2rem)', flexWrap:'wrap' }}>
                            {[
                                { v: totalCount > 0 ? totalCount : '—', l: 'Posts' },
                                { v: '1,200+', l: 'Members' },
                                { v: '50+',    l: 'Topics' },
                            ].map(({ v, l }) => (
                                <div key={l}>
                                    <p style={{ margin:0, fontFamily:"'Sora',sans-serif", fontSize:'clamp(1rem,2vw,1.3rem)', fontWeight:'900', color:'white', lineHeight:1 }}>{v}</p>
                                    <p style={{ margin:'2px 0 0', fontSize:'0.68rem', color:'rgba(255,255,255,0.4)', fontWeight:'600' }}>{l}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="cf-body">

                    {/* ── Main ── */}
                    <div className="cf-main" style={{ display:'flex', flexDirection:'column', gap:12, minWidth:0 }}>

                        {canPost && <CreatePost onPostCreated={handlePostCreated} />}

                        {!user && (
                            <div className="cf-login-card">
                                <p style={{ margin:'0 0 10px', fontSize:'0.875rem', color:'#64748b' }}>
                                    <strong style={{ color:'#1e293b' }}>Join the conversation</strong> — sign in to upvote, discuss and save posts.
                                </p>
                                <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
                                    <a href="/login" style={{ display:'inline-flex', alignItems:'center', background:'#003366', color:'white', padding:'7px 18px', borderRadius:8, fontWeight:'700', fontSize:'0.82rem', textDecoration:'none' }}
                                        onMouseOver={e => e.currentTarget.style.background='#002244'}
                                        onMouseOut={e => e.currentTarget.style.background='#003366'}>Sign In</a>
                                    <a href="/register" style={{ display:'inline-flex', alignItems:'center', background:'white', color:'#003366', padding:'7px 18px', borderRadius:8, fontWeight:'700', fontSize:'0.82rem', textDecoration:'none', border:'1.5px solid rgba(0,51,102,0.2)' }}
                                        onMouseOver={e => { e.currentTarget.style.background='#eff6ff'; }}
                                        onMouseOut={e => { e.currentTarget.style.background='white'; }}>Join</a>
                                </div>
                            </div>
                        )}

                        {/* Filters Standalone */}
                        <FeedFilters
                            sort={sort}
                            onSortChange={v => setParam('sort', v)}
                            search={searchInput}
                            onSearchChange={v => { setSearchInput(v); setParam('q', v); }}
                            tagFilter={tagFilter}
                            onTagFilterChange={v => setParam('tag', v)}
                        />

                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[0, 80, 160].map(d => <SkeletonPost key={d} delay={d} />)}
                            </div>
                        ) : error ? (
                            <div className="cf-error-card">
                                <p style={{ margin: '0 0 12px', color: '#DC2626', fontSize: '0.875rem' }}>{error}</p>
                                <button onClick={() => fetchPosts(1)}
                                    style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#003366', color:'white', border:'none', padding:'8px 18px', borderRadius:8, cursor:'pointer', fontWeight:'700', fontSize:'0.82rem', fontFamily:'inherit' }}>
                                    Try Again
                                </button>
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="cf-empty-card">
                                <div style={{ width:48, height:48, borderRadius:12, background:'#f8fafc', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', fontSize:'1.3rem' }}>💡</div>
                                <p style={{ margin:'0 0 4px', fontSize:'0.9rem', fontWeight:'700', color:'#0f172a' }}>
                                    {tagFilter || searchInput ? 'No matching posts' : 'The feed is empty'}
                                </p>
                                <p style={{ margin:0, fontSize:'0.8rem', color:'#64748b' }}>
                                    {tagFilter || searchInput ? 'Try a different filter.' : 'Be the first Council Member to share something.'}
                                </p>
                            </div>
                        ) : (
                            <>
                                {(tagFilter || debouncedSearch) ? (
                                    <p style={{ margin: '0', padding: '0 4px', fontSize: '0.78rem', color: '#64748b' }}>
                                        {totalCount} result{totalCount !== 1 ? 's' : ''}
                                        {tagFilter && <> for <strong style={{ color:'#003366' }}>#{tagFilter}</strong></>}
                                        {debouncedSearch && <> matching <strong style={{ color:'#003366' }}>"{debouncedSearch}"</strong></>}
                                    </p>
                                ) : null}
                                <div ref={feedRef} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                                    {posts.map((post, i) => (
                                        <div key={post.id} className="cf-post-item" style={{ animation:`cf-fadeslide 0.3s ease ${Math.min(i,4)*40}ms both` }}>
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
                            </>
                        )}

                        {!loading && !error && page < totalPages && (
                            <button onClick={handleLoadMore} disabled={loadingMore} className="cf-load-more">
                                {loadingMore
                                    ? <><span style={{ width:13, height:13, border:'2px solid #e2e8f0', borderTopColor:'#003366', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }} /> Loading…</>
                                    : 'Show more posts'
                                }
                            </button>
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