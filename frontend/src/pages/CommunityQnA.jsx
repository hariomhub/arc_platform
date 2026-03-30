import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    MessageCircle, PlusCircle, ThumbsUp, Search, X,
    AlertCircle, RefreshCw, ArrowRight, Tag, Users, TrendingUp, BookOpen
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { getQnaPosts } from '../api/qna.js';
import { timeAgo } from '../utils/dateFormatter.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import Pagination from '../components/common/Pagination.jsx';
import AskQuestionModal from '../components/modals/AskQuestionModal.jsx';

const ITEMS_PER_PAGE = 10;

const roleLabel = (role) => {
    const map = { founding_member:'Founding Member', executive:'Executive', professional:'Professional', member:'Member', fellow:'Fellow', expert:'Expert' };
    return map[role?.toLowerCase()] || role || 'Member';
};

const roleBg = (role) => {
    const map = {
        admin:  { bg:'#FFF3E0', color:'#E65100', border:'#FFCC80' },
        fellow: { bg:'#E8F5E9', color:'#2E7D32', border:'#A5D6A7' },
        expert: { bg:'#E3F2FD', color:'#1565C0', border:'#90CAF9' },
    };
    return map[role?.toLowerCase()] || { bg:'#F1F5F9', color:'#475569', border:'#CBD5E1' };
};

const StatBadge = ({ icon: Icon, value, label }) => (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Icon size={16} color="rgba(255,255,255,0.7)"/>
            <span style={{ fontSize:'clamp(1.1rem,3vw,1.5rem)', fontWeight:800, color:'#fff', lineHeight:1 }}>{value}</span>
        </div>
        <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600, textAlign:'center' }}>{label}</span>
    </div>
);

const SkeletonCard = () => (
    <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'24px', marginBottom:12 }}>
        <div style={{ height:14, width:'70%', background:'#F1F5F9', borderRadius:8, marginBottom:12 }}/>
        <div style={{ height:10, width:'90%', background:'#F1F5F9', borderRadius:8, marginBottom:8 }}/>
        <div style={{ height:10, width:'60%', background:'#F1F5F9', borderRadius:8 }}/>
    </div>
);

const TagChip = ({ tag, onClick }) => (
    <button onClick={() => onClick(tag)}
        style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#EFF6FF', color:'#1D4ED8', border:'1px solid #BFDBFE', borderRadius:20, fontSize:'0.72rem', fontWeight:700, padding:'2px 10px', cursor:'pointer', fontFamily:'inherit' }}>
        <Tag size={10}/>#{tag}
    </button>
);

const QuestionCard = ({ q, onTagClick }) => {
    const rb = roleBg(q.author_role);
    return (
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', padding:'clamp(12px,2vw,16px) clamp(14px,3vw,20px)', transition:'box-shadow 0.2s,transform 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 20px rgba(0,51,102,0.10)'; e.currentTarget.style.transform='translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.transform='translateY(0)'; }}>

            <Link to={`/community-qna/${q.id}`}
                style={{ display:'block', fontSize:'clamp(0.9rem,2vw,1rem)', fontWeight:700, color:'#1E293B', textDecoration:'none', marginBottom:8, lineHeight:1.4 }}
                onMouseEnter={e => e.currentTarget.style.color='#003366'}
                onMouseLeave={e => e.currentTarget.style.color='#1E293B'}>
                {q.title}
            </Link>

            {q.body && (
                <p style={{ fontSize:'0.83rem', color:'#64748B', lineHeight:1.6, margin:'0 0 12px' }}>
                    {q.body.length > 140 ? `${q.body.slice(0,140)}\u2026` : q.body}
                </p>
            )}

            {q.tags && q.tags.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
                    {q.tags.map(tag => <TagChip key={tag} tag={tag} onClick={onTagClick}/>)}
                </div>
            )}

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8, paddingTop:12, borderTop:'1px solid #F1F5F9' }}>
                {/* Author */}
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', minWidth:0, flex:1 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#003366,#0055A4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', fontWeight:800, color:'#fff', flexShrink:0 }}>
                        {(q.author_name||'A').charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize:'0.78rem', fontWeight:600, color:'#334155', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'clamp(80px,20vw,160px)' }}>{q.author_name||'Anonymous'}</span>
                    {q.author_role && (
                        <span style={{ fontSize:'0.65rem', fontWeight:700, padding:'2px 8px', borderRadius:20, background:rb.bg, color:rb.color, border:`1px solid ${rb.border}`, whiteSpace:'nowrap' }}>
                            {roleLabel(q.author_role)}
                        </span>
                    )}
                    <span style={{ fontSize:'0.75rem', color:'#94A3B8', whiteSpace:'nowrap' }}>&middot; {timeAgo(q.created_at)}</span>
                </div>
                {/* Stats */}
                <div style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
                    <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.78rem', color:'#64748B', fontWeight:600 }}>
                        <ThumbsUp size={13}/>{q.vote_count??0}
                    </span>
                    <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.78rem', color:'#64748B', fontWeight:600 }}>
                        <MessageCircle size={13}/>{q.answer_count??0}
                    </span>
                    <Link to={`/community-qna/${q.id}`} style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.78rem', fontWeight:700, color:'#003366', textDecoration:'none', whiteSpace:'nowrap' }}>
                        View <ArrowRight size={12}/>
                    </Link>
                </div>
            </div>
        </div>
    );
};

const CommunityQnA = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const { showToast } = useToast();

    const sort = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1', 10);

    const [searchInput, setSearchInput] = useState('');
    const [tagFilter,   setTagFilter]   = useState('');
    const debouncedSearch = useDebounce(searchInput, 350);

    const [posts,      setPosts]      = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState('');
    const [askOpen,    setAskOpen]    = useState(false);

    useEffect(() => { document.title = 'Community Q&A | ARC'; }, []);

    const fetchPosts = useCallback(async (signal) => {
        setLoading(true); setError('');
        try {
            const params = { sort, page, limit: ITEMS_PER_PAGE };
            if (debouncedSearch) params.search = debouncedSearch;
            if (tagFilter.trim()) params.tags = tagFilter.trim();
            const res = await getQnaPosts(params);
            if (!signal?.aborted) {
                const payload = res.data?.data;
                const items = Array.isArray(payload) ? payload : (payload?.posts || []);
                setPosts(items);
                setTotalPages(payload?.totalPages ?? 1);
                setTotalCount(payload?.total ?? items.length);
            }
        } catch (err) {
            if (!signal?.aborted) setError(getErrorMessage(err) || 'Failed to load questions.');
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [sort, page, debouncedSearch, tagFilter]);

    useEffect(() => {
        const ctrl = new AbortController();
        fetchPosts(ctrl.signal);
        return () => ctrl.abort();
    }, [fetchPosts]);

    const setParam = useCallback((key, value) => {
        setSearchParams(prev => {
            const n = new URLSearchParams(prev);
            n.set(key, value);
            if (key !== 'page') n.set('page', '1');
            return n;
        });
    }, [setSearchParams]);

    const handleAskClick = () => {
        if (!user) navigate('/login', { state: { message:'Please login to ask questions', from:'/community-qna' } });
        else setAskOpen(true);
    };

    const handleQuestionPosted = useCallback(() => {
        setAskOpen(false);
        showToast('Question posted successfully!', 'success');
        fetchPosts();
    }, [showToast, fetchPosts]);

    const handleTagClick = useCallback((tag) => {
        setTagFilter(tag);
        setParam('page', '1');
    }, [setParam]);

    const hasActiveFilter = debouncedSearch || tagFilter;

    return (
        <div style={{ background:'#F8FAFC', minHeight:'100vh' }}>
            <style>{`
                .qna-input { outline:none; transition:border-color 0.2s,box-shadow 0.2s; }
                .qna-input:focus { border-color:#003366 !important; box-shadow:0 0 0 3px rgba(0,51,102,0.08) !important; }

                /* Filter bar responsive */
                .qna-filter-bar {
                    background: white;
                    border: 1px solid #E2E8F0;
                    border-radius: 14px;
                    padding: clamp(10px,2vw,14px) clamp(12px,3vw,16px);
                    margin-bottom: 20px;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    align-items: center;
                    box-shadow: 0 1px 6px rgba(0,0,0,0.05);
                }

                /* Stats strip */
                .qna-stats {
                    display: flex;
                    gap: clamp(16px,3vw,24px);
                    flex-wrap: wrap;
                    margin-bottom: clamp(16px,3vw,24px);
                    padding-bottom: clamp(16px,3vw,24px);
                    border-bottom: 1px solid rgba(255,255,255,0.12);
                }
            `}</style>

            {/* ── Hero ── */}
            <section style={{ background:'linear-gradient(135deg,#001a3a 0%,#002c5f 50%,#003d80 100%)', padding:'clamp(1.5rem,4vw,2.5rem) clamp(1rem,4vw,2rem) clamp(1.5rem,4vw,2rem)', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(255,255,255,0.06) 1.5px,transparent 1.5px)', backgroundSize:'26px 26px', pointerEvents:'none' }}/>
                <div style={{ position:'absolute', top:-60, right:-60, width:280, height:280, borderRadius:'50%', background:'rgba(0,85,164,0.18)', filter:'blur(60px)', pointerEvents:'none' }}/>

                <div style={{ maxWidth:780, margin:'0 auto', position:'relative', zIndex:1 }}>
                    <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.10)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:20, padding:'5px 14px', marginBottom:16, fontSize:'0.75rem', fontWeight:700, color:'rgba(255,255,255,0.85)', letterSpacing:'0.06em', textTransform:'uppercase' }}>
                        <BookOpen size={13}/> Knowledge Exchange
                    </div>
                    <h1 style={{ fontSize:'clamp(1.75rem,5vw,2.8rem)', fontWeight:900, color:'#fff', margin:'0 0 10px', lineHeight:1.1 }}>
                        Community Q&amp;A
                    </h1>
                    <p style={{ fontSize:'clamp(0.875rem,1.5vw,1.05rem)', color:'rgba(255,255,255,0.68)', maxWidth:520, margin:'0 0 24px', lineHeight:1.6 }}>
                        Ask questions, share insights and connect with AI risk professionals worldwide.
                    </p>

                    <div className="qna-stats">
                        <StatBadge icon={MessageCircle} value={totalCount??'—'} label="Questions"/>
                        <StatBadge icon={Users} value="1,200+" label="Active Members"/>
                        <StatBadge icon={TrendingUp} value="4,800+" label="Answers Shared"/>
                    </div>

                    <button onClick={handleAskClick}
                        style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#fff', color:'#003366', border:'none', borderRadius:10, padding:'clamp(10px,2vw,12px) clamp(18px,3vw,26px)', fontWeight:800, fontSize:'clamp(0.85rem,1.5vw,0.9rem)', cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 20px rgba(0,0,0,0.25)', transition:'transform 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
                        <PlusCircle size={18}/> Ask a Question
                    </button>
                </div>
            </section>

            {/* ── Main content ── */}
            <div style={{ maxWidth:780, margin:'0 auto', padding:'clamp(16px,3vw,24px) clamp(1rem,3vw,1.5rem) 60px' }}>

                {/* Filter bar */}
                <div className="qna-filter-bar">
                    {/* Sort pills */}
                    <div style={{ display:'flex', gap:4, background:'#F1F5F9', borderRadius:8, padding:3, flexShrink:0 }}>
                        {[{key:'newest',label:'Newest'},{key:'most_voted',label:'Most Voted'}].map(({key,label}) => (
                            <button key={key} onClick={() => setParam('sort',key)}
                                style={{ padding:'6px clamp(10px,2vw,14px)', borderRadius:6, border:'none', cursor:'pointer', fontSize:'0.78rem', fontWeight:700, fontFamily:'inherit', transition:'all 0.15s', background:sort===key?'#fff':'transparent', color:sort===key?'#003366':'#64748B', boxShadow:sort===key?'0 1px 4px rgba(0,0,0,0.10)':'none', whiteSpace:'nowrap' }}>
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Search input */}
                    <div style={{ position:'relative', flex:'1 1 140px', minWidth:'120px', maxWidth:'300px' }}>
                        <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94A3B8', pointerEvents:'none' }}/>
                        <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
                            placeholder="Search questions\u2026" className="qna-input"
                            style={{ width:'100%', paddingLeft:32, paddingRight:30, paddingTop:8, paddingBottom:8, border:'1px solid #E2E8F0', borderRadius:8, fontSize:'0.82rem', fontFamily:'inherit', background:'#FAFBFC', color:'#1E293B', boxSizing:'border-box' }}/>
                        {searchInput && <button onClick={() => setSearchInput('')} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', padding:0, color:'#94A3B8', display:'flex' }}><X size={13}/></button>}
                    </div>

                    {/* Tag filter */}
                    <div style={{ position:'relative', flex:'1 1 110px', minWidth:'100px', maxWidth:'220px' }}>
                        <Tag size={12} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94A3B8', pointerEvents:'none' }}/>
                        <input type="text" value={tagFilter} onChange={e => setTagFilter(e.target.value)}
                            placeholder="Filter by tag\u2026" className="qna-input"
                            style={{ width:'100%', paddingLeft:28, paddingRight:28, paddingTop:8, paddingBottom:8, border:'1px solid #E2E8F0', borderRadius:8, fontSize:'0.82rem', fontFamily:'inherit', background:'#FAFBFC', color:'#1E293B', boxSizing:'border-box' }}/>
                        {tagFilter && <button onClick={() => setTagFilter('')} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', padding:0, color:'#94A3B8', display:'flex' }}><X size={13}/></button>}
                    </div>

                    {hasActiveFilter && (
                        <button onClick={() => { setSearchInput(''); setTagFilter(''); }}
                            style={{ background:'none', border:'none', color:'#64748B', fontSize:'0.78rem', cursor:'pointer', textDecoration:'underline', fontFamily:'inherit', whiteSpace:'nowrap', flexShrink:0 }}>
                            Clear all
                        </button>
                    )}
                </div>

                {/* Loading */}
                {loading && <div aria-busy="true">{[1,2,3,4].map(i => <SkeletonCard key={i}/>)}</div>}

                {/* Error */}
                {!loading && error && (
                    <div style={{ textAlign:'center', padding:'clamp(40px,8vw,64px) 32px', color:'#DC2626' }}>
                        <AlertCircle size={40} style={{ margin:'0 auto 16px', opacity:0.7, display:'block' }}/>
                        <p style={{ marginBottom:20, color:'#64748B' }}>{error}</p>
                        <button onClick={() => fetchPosts()} style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#003366', color:'#fff', border:'none', padding:'10px 22px', borderRadius:8, cursor:'pointer', fontWeight:700, fontFamily:'inherit' }}>
                            <RefreshCw size={14}/> Try Again
                        </button>
                    </div>
                )}

                {/* Empty state */}
                {!loading && !error && posts.length === 0 && (
                    <div style={{ textAlign:'center', padding:'clamp(40px,8vw,72px) clamp(16px,4vw,32px)', background:'#fff', borderRadius:16, border:'2px dashed #E2E8F0' }}>
                        <MessageCircle size={48} style={{ margin:'0 auto 16px', display:'block', color:'#CBD5E1' }}/>
                        <h3 style={{ margin:'0 0 8px', color:'#475569', fontSize:'clamp(0.95rem,2vw,1.1rem)', fontWeight:700 }}>
                            {hasActiveFilter ? 'No matching questions' : 'No questions yet'}
                        </h3>
                        <p style={{ color:'#94A3B8', marginBottom:24, fontSize:'0.88rem' }}>
                            {hasActiveFilter ? 'Try different search terms or tags.' : 'Be the first to start the conversation!'}
                        </p>
                        {hasActiveFilter ? (
                            <button onClick={() => { setSearchInput(''); setTagFilter(''); }} style={{ background:'#003366', color:'#fff', border:'none', padding:'10px 22px', borderRadius:8, cursor:'pointer', fontWeight:700, fontFamily:'inherit' }}>Clear Filters</button>
                        ) : (
                            <button onClick={handleAskClick} style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#003366', color:'#fff', border:'none', padding:'10px 22px', borderRadius:8, cursor:'pointer', fontWeight:700, fontFamily:'inherit' }}>
                                <PlusCircle size={15}/> Ask a Question
                            </button>
                        )}
                    </div>
                )}

                {/* Posts */}
                {!loading && !error && posts.length > 0 && (
                    <>
                        <p style={{ fontSize:'0.78rem', color:'#94A3B8', marginBottom:16 }} aria-live="polite">
                            {hasActiveFilter
                                ? `${posts.length} result${posts.length!==1?'s':''} found`
                                : `${totalCount??posts.length} question${(totalCount??posts.length)!==1?'s':''} in the community`}
                        </p>
                        <div style={{ display:'flex', flexDirection:'column', gap:12 }} aria-live="polite">
                            {posts.map(q => <QuestionCard key={q.id} q={q} onTagClick={handleTagClick}/>)}
                        </div>
                        {totalPages > 1 && (
                            <div style={{ marginTop:32 }}>
                                <Pagination page={page} totalPages={totalPages} onPageChange={p => setParam('page',String(p))}/>
                            </div>
                        )}
                    </>
                )}
            </div>

            {askOpen && <AskQuestionModal isOpen={askOpen} onClose={() => setAskOpen(false)} onSuccess={handleQuestionPosted}/>}
        </div>
    );
};

export default CommunityQnA;