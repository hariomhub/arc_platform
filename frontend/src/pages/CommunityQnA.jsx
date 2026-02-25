import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    MessageCircle, PlusCircle, ThumbsUp, Search, X,
    AlertCircle, Loader2, RefreshCw, ArrowRight
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

// ─── Skeleton card ─────────────────────────────────────────────────────────────
const SkeletonCard = () => (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="h-4 w-3/4 bg-slate-200 rounded mb-3 animate-pulse" />
        <div className="h-3 w-full bg-slate-200 rounded mb-2 animate-pulse" />
        <div className="h-3 w-4/5 bg-slate-200 rounded animate-pulse" />
    </div>
);

// ─── Question card ─────────────────────────────────────────────────────────────
const QuestionCard = ({ q, onTagClick }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
        <Link
            to={`/community-qna/${q.id}`}
            className="block text-lg font-bold text-slate-800 no-underline mb-2 leading-snug hover:text-[#003366] transition-colors"
        >
            {q.title}
        </Link>

        {q.body && (
            <p className="text-sm text-slate-500 leading-relaxed mb-3">
                {q.body.length > 150 ? `${q.body.slice(0, 150)}...` : q.body}
            </p>
        )}

        {q.tags && q.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
                {q.tags.map((tag) => (
                    <button
                        key={tag}
                        onClick={() => onTagClick(tag)}
                        className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border-none cursor-pointer hover:bg-blue-100 transition-colors font-sans"
                    >
                        #{tag}
                    </button>
                ))}
            </div>
        )}

        <div className="flex justify-between items-center flex-wrap gap-2">
            <span className="text-xs text-slate-400">
                {q.author_name && <strong className="text-slate-500">{q.author_name}</strong>}
                {q.author_name && ' · '}{timeAgo(q.created_at)}
            </span>
            <div className="flex gap-4 items-center">
                <span className="flex items-center gap-1 text-xs text-slate-500">
                    <ThumbsUp size={13} /> {q.vote_count ?? 0}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                    <MessageCircle size={13} /> {q.answer_count ?? 0}
                </span>
                <Link to={`/community-qna/${q.id}`} className="flex items-center gap-1 text-xs text-[#003366] font-bold no-underline">
                    View <ArrowRight size={12} />
                </Link>
            </div>
        </div>
    </div>
);

// ─── Main page ─────────────────────────────────────────────────────────────────
const CommunityQnA = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const { showToast } = useToast();

    const sort = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1', 10);

    const [searchInput, setSearchInput] = useState('');
    const [tagFilter, setTagFilter] = useState('');
    const debouncedSearch = useDebounce(searchInput, 350);

    const [posts, setPosts] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [askOpen, setAskOpen] = useState(false);

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
                setPosts(Array.isArray(payload) ? payload : (payload?.posts || []));
                setTotalPages(payload?.totalPages ?? 1);
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
        setSearchParams((prev) => {
            const n = new URLSearchParams(prev);
            n.set(key, value);
            if (key !== 'page') n.set('page', '1');
            return n;
        });
    }, [setSearchParams]);

    const handleAskClick = () => {
        if (!user) navigate('/login', { state: { message: 'Please login to ask questions', from: '/community-qna' } });
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

    const hasActiveSearch = debouncedSearch || tagFilter;

    return (
        <div className="bg-slate-50 min-h-screen py-12 px-8 pb-20">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
                    <div>
                        <h1 className="text-[#003366] text-4xl font-extrabold mb-1.5">Community Q&amp;A</h1>
                        <p className="text-slate-500 text-base">Ask questions and share knowledge with global AI risk professionals.</p>
                    </div>
                    <button
                        onClick={handleAskClick}
                        className="inline-flex items-center gap-2 bg-[#003366] text-white px-5 py-2.5 border-none rounded-lg font-bold text-sm cursor-pointer font-sans"
                    >
                        <PlusCircle size={18} /> Ask a Question
                    </button>
                </div>

                {/* Filter bar */}
                <div className="flex flex-wrap gap-3 items-center mb-7">
                    {/* Sort toggle */}
                    <div className="flex bg-slate-200 rounded-lg p-0.5 gap-0.5">
                        {['newest', 'most_voted'].map((s) => (
                            <button key={s} onClick={() => setParam('sort', s)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold border-none cursor-pointer transition-all font-sans ${sort === s ? 'bg-white text-[#003366] shadow-sm' : 'bg-transparent text-slate-500'}`}>
                                {s === 'newest' ? 'Newest' : 'Most Voted'}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search questions…"
                            className="w-full pl-8 pr-8 py-2 border border-slate-300 rounded-lg text-sm font-sans outline-none focus:border-[#003366] transition-colors" />
                        {searchInput && (
                            <button onClick={() => setSearchInput('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 border-none bg-transparent cursor-pointer text-slate-400 p-0">
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Tag filter */}
                    <div className="relative flex-1 min-w-[150px] max-w-[220px]">
                        <input type="text" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}
                            placeholder="Filter by tag…"
                            className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm font-sans outline-none focus:border-[#003366] transition-colors" />
                        {tagFilter && (
                            <button onClick={() => setTagFilter('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 border-none bg-transparent cursor-pointer text-slate-400 p-0">
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {hasActiveSearch && (
                        <button onClick={() => { setSearchInput(''); setTagFilter(''); }}
                            className="bg-transparent border-none text-slate-500 text-xs cursor-pointer underline font-sans">
                            Clear all
                        </button>
                    )}
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col gap-4" aria-busy="true">
                        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
                    </div>
                )}

                {/* Error */}
                {error && !loading && (
                    <div className="text-center py-16 text-red-500">
                        <AlertCircle size={36} className="mx-auto mb-4 opacity-60" />
                        <p className="mb-5">{error}</p>
                        <button onClick={() => fetchPosts()} className="inline-flex items-center gap-1.5 bg-[#003366] text-white border-none px-5 py-2.5 rounded-md cursor-pointer font-bold">
                            <RefreshCw size={14} /> Try Again
                        </button>
                    </div>
                )}

                {/* Empty */}
                {!loading && !error && posts.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                        <MessageCircle size={48} className="mx-auto mb-4 text-slate-300" />
                        <p className="text-slate-400 mb-4">
                            {hasActiveSearch ? 'No questions match your search.' : 'No questions yet. Be the first!'}
                        </p>
                        {hasActiveSearch
                            ? <button onClick={() => { setSearchInput(''); setTagFilter(''); }} className="bg-[#003366] text-white border-none px-5 py-2 rounded-md cursor-pointer font-bold text-sm font-sans">Clear Filters</button>
                            : <button onClick={handleAskClick} className="inline-flex items-center gap-2 bg-[#003366] text-white border-none px-5 py-2 rounded-md cursor-pointer font-bold text-sm font-sans"><PlusCircle size={15} /> Ask a Question</button>
                        }
                    </div>
                )}

                {/* List */}
                {!loading && !error && posts.length > 0 && (
                    <>
                        <p className="text-xs text-slate-400 mb-4" aria-live="polite">
                            {posts.length} question{posts.length !== 1 ? 's' : ''}
                        </p>
                        <div className="flex flex-col gap-4" aria-live="polite">
                            {posts.map((q) => <QuestionCard key={q.id} q={q} onTagClick={handleTagClick} />)}
                        </div>
                        {totalPages > 1 && (
                            <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setParam('page', String(p))} />
                        )}
                    </>
                )}
            </div>

            {askOpen && <AskQuestionModal isOpen={askOpen} onClose={() => setAskOpen(false)} onSuccess={handleQuestionPosted} />}
        </div>
    );
};

export default CommunityQnA;
