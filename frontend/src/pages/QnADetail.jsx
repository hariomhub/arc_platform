import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ThumbsUp, MessageCircle, ArrowLeft, AlertCircle,
    Loader2, RefreshCw, User, Send
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { getQnaPost, createAnswer, votePost } from '../api/qna.js';
import { timeAgo, formatDateTime } from '../utils/dateFormatter.js';
import { getErrorMessage } from '../utils/apiHelpers.js';

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const PageSkeleton = () => (
    <div className="max-w-3xl mx-auto px-8 py-12">
        <div className="h-3.5 w-20 bg-slate-200 rounded mb-8 animate-pulse" />
        <div className="h-7 w-11/12 bg-slate-200 rounded mb-3 animate-pulse" />
        <div className="h-3 w-2/5 bg-slate-200 rounded mb-8 animate-pulse" />
        {[1, 2, 3].map((i) => <div key={i} className={`h-3 bg-slate-200 rounded mb-2 animate-pulse`} style={{ width: `${70 + (i * 8) % 30}%` }} />)}
        <div className="mt-12 h-24 bg-slate-200 rounded-lg animate-pulse" />
    </div>
);

// ─── Answer item ──────────────────────────────────────────────────────────────
const AnswerItem = ({ answer }) => (
    <div className="border-b border-slate-100 pb-6 mb-6 last:border-0 last:mb-0">
        <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                <User size={17} className="text-slate-400" />
            </div>
            <div>
                <p className="m-0 text-sm font-bold text-slate-700">{answer.author_name || 'Anonymous'}</p>
                <p className="m-0 text-xs text-slate-400">{timeAgo(answer.created_at)}</p>
            </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed m-0 whitespace-pre-wrap">
            {answer.body || answer.content}
        </p>
    </div>
);

// ─── QnADetail ────────────────────────────────────────────────────────────────
const QnADetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const answerRef = useRef(null);

    const [post, setPost] = useState(null);
    const [answers, setAnswers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notFound, setNotFound] = useState(false);
    const [optimisticVotes, setOptimisticVotes] = useState(0);
    const [hasVoted, setHasVoted] = useState(false);
    const [voting, setVoting] = useState(false);
    const [answerBody, setAnswerBody] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchPost = useCallback(async () => {
        setLoading(true); setError(''); setNotFound(false);
        try {
            const res = await getQnaPost(id);
            const data = res.data?.data || res.data;
            setPost(data);
            setOptimisticVotes(data?.vote_count ?? 0);
            setHasVoted(!!data?.has_voted);
            setAnswers(data?.answers || []);
            document.title = `${data?.title ?? 'Question'} | ARC`;
        } catch (err) {
            if (err?.response?.status === 404) setNotFound(true);
            else setError(getErrorMessage(err));
        } finally { setLoading(false); }
    }, [id]);

    useEffect(() => { fetchPost(); }, [fetchPost]);

    useEffect(() => {
        if (!loading && post && user && answerRef.current) answerRef.current.focus();
    }, [loading, post, user]);

    const handleVote = async () => {
        if (!user) { navigate('/login', { state: { from: `/community-qna/${id}` } }); return; }
        if (hasVoted || voting) return;
        setOptimisticVotes((v) => v + 1);
        setHasVoted(true);
        setVoting(true);
        try { await votePost(id); }
        catch (err) {
            setOptimisticVotes((v) => v - 1);
            setHasVoted(false);
            showToast('Failed to vote. Please try again.', 'error');
        } finally { setVoting(false); }
    };

    const handleAnswerSubmit = async (e) => {
        e.preventDefault();
        if (!answerBody.trim() || submitting) return;
        setSubmitting(true);
        try {
            const res = await createAnswer(id, { body: answerBody });
            const newAnswer = res.data?.data || res.data;
            setAnswers((prev) => [...prev, newAnswer]);
            setPost((p) => p ? { ...p, answer_count: (p.answer_count ?? 0) + 1 } : p);
            setAnswerBody('');
            showToast('Answer posted!', 'success');
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setSubmitting(false); }
    };

    if (loading) return <PageSkeleton />;

    if (notFound) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-8 py-16 text-center">
            <MessageCircle size={48} className="text-slate-300 mb-4" />
            <h2 className="text-slate-800 mb-2">Question Not Found</h2>
            <p className="text-slate-500 mb-8">This question may have been removed or the link is incorrect.</p>
            <Link to="/community-qna" className="inline-flex items-center gap-1.5 bg-[#003366] text-white px-5 py-2.5 rounded-md font-bold no-underline text-sm">
                <ArrowLeft size={15} /> Back to Community
            </Link>
        </div>
    );

    if (error) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-8 py-16 text-center text-red-500">
            <AlertCircle size={40} className="mb-4" />
            <p className="mb-6">{error}</p>
            <button onClick={fetchPost} className="inline-flex items-center gap-1.5 bg-[#003366] text-white border-none px-5 py-2.5 rounded-md cursor-pointer font-bold">
                <RefreshCw size={14} /> Try Again
            </button>
        </div>
    );

    return (
        <div className="bg-slate-50 min-h-screen py-12 px-8 pb-20">
            <div className="max-w-3xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-1.5 bg-transparent border-none text-slate-500 cursor-pointer text-sm font-semibold p-0 mb-6 font-sans hover:text-slate-700 transition-colors"
                >
                    <ArrowLeft size={15} /> Back
                </button>

                {/* Question card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-5">
                    {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                            {post.tags.map((tag) => (
                                <span key={tag} className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">#{tag}</span>
                            ))}
                        </div>
                    )}

                    <h1 className="text-2xl font-extrabold text-slate-800 mb-4 leading-snug">{post.title}</h1>

                    <div className="flex items-center gap-2.5 mb-5 flex-wrap">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                            <User size={15} className="text-slate-400" />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{post.author_name || 'Anonymous'}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-sm text-slate-400">{formatDateTime(post.created_at)}</span>
                    </div>

                    <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap border-t border-slate-100 pt-5">
                        {post.body}
                    </div>

                    {/* Vote section */}
                    <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-4">
                        <button
                            onClick={handleVote}
                            disabled={hasVoted || voting || !user}
                            title={!user ? 'Login to vote' : hasVoted ? 'Already voted' : 'Vote helpful'}
                            aria-label={`Vote helpful. Current votes: ${optimisticVotes}`}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border font-bold text-sm transition-all font-sans cursor-pointer
                                ${hasVoted ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-[#003366]'}
                                ${(hasVoted || voting || !user) ? 'cursor-default' : ''}`}
                        >
                            {voting ? <Loader2 size={14} className="animate-spin" /> : <ThumbsUp size={14} />}
                            {optimisticVotes} {optimisticVotes === 1 ? 'vote' : 'votes'}
                        </button>
                        {!user && (
                            <Link to="/login" className="text-sm text-[#003366] font-semibold underline">Login to vote</Link>
                        )}
                    </div>
                </div>

                {/* Answers */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-5">
                    <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
                        <MessageCircle size={20} color="#003366" />
                        {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
                    </h2>

                    {answers.length === 0 ? (
                        <p className="text-slate-400 italic text-center py-8">No answers yet. Be the first!</p>
                    ) : (
                        <div aria-live="polite">
                            {answers.map((ans) => <AnswerItem key={ans.id} answer={ans} />)}
                        </div>
                    )}
                </div>

                {/* Answer form */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                    <h3 className="text-lg font-extrabold text-slate-800 mb-5">Your Answer</h3>

                    {user ? (
                        <form onSubmit={handleAnswerSubmit} noValidate>
                            <textarea
                                ref={answerRef}
                                value={answerBody}
                                onChange={(e) => setAnswerBody(e.target.value)}
                                placeholder="Write your answer here…"
                                rows={5}
                                disabled={submitting}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm font-sans leading-relaxed resize-y min-h-[120px] outline-none focus:border-[#003366] transition-colors"
                            />
                            <div className="flex justify-end mt-4">
                                <button
                                    type="submit"
                                    disabled={submitting || !answerBody.trim()}
                                    className="inline-flex items-center gap-2 bg-[#003366] text-white border-none px-6 py-2.5 rounded-lg font-bold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-sans"
                                >
                                    {submitting
                                        ? <><Loader2 size={14} className="animate-spin" /> Posting…</>
                                        : <><Send size={14} /> Post Answer</>
                                    }
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                            <p className="text-slate-500 mb-4">You must be logged in to post an answer.</p>
                            <Link to="/login" className="inline-flex items-center gap-1.5 bg-[#003366] text-white px-5 py-2.5 rounded-md font-bold no-underline text-sm">
                                Login to Answer
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QnADetail;
