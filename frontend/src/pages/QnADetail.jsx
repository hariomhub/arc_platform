import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ThumbsUp, MessageCircle, ArrowLeft, AlertCircle,
    Loader2, RefreshCw, User, Send, Tag, Clock, Shield
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { getQnaPost, createAnswer, votePost } from '../api/qna.js';
import { timeAgo, formatDateTime } from '../utils/dateFormatter.js';
import { getErrorMessage } from '../utils/apiHelpers.js';

const roleLabel = (role) => {
    const map = { admin: 'Admin', member: 'Member', fellow: 'Fellow', expert: 'Expert' };
    return map[role?.toLowerCase()] || role || 'Member';
};

const roleBg = (role) => {
    const map = {
        admin:  { bg: '#FFF3E0', color: '#E65100', border: '#FFCC80' },
        fellow: { bg: '#E8F5E9', color: '#2E7D32', border: '#A5D6A7' },
        expert: { bg: '#E3F2FD', color: '#1565C0', border: '#90CAF9' },
    };
    return map[role?.toLowerCase()] || { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' };
};

const Avatar = ({ name, size = 36 }) => (
    <div style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #003366, #0055A4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.35, fontWeight: 800, color: '#fff',
    }}>
        {(name || 'A').charAt(0).toUpperCase()}
    </div>
);

const PageSkeleton = () => (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ height: 14, width: 80, background: '#E2E8F0', borderRadius: 8, marginBottom: 32 }} />
        <div style={{ height: 28, width: '80%', background: '#E2E8F0', borderRadius: 8, marginBottom: 16 }} />
        <div style={{ height: 12, width: '40%', background: '#E2E8F0', borderRadius: 8, marginBottom: 32 }} />
        {[1,2,3].map((i) => <div key={i} style={{ height: 12, background: '#E2E8F0', borderRadius: 8, marginBottom: 10, width: `${65 + (i * 11) % 30}%` }} />)}
        <div style={{ marginTop: 40, height: 96, background: '#E2E8F0', borderRadius: 12 }} />
    </div>
);

const AnswerItem = ({ answer, index }) => {
    const rb = roleBg(answer.author_role);
    return (
        <div style={{ padding: '24px 0', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                {/* Number badge */}
                <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: '#F1F5F9', border: '1.5px solid #E2E8F0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 800, color: '#64748B', marginTop: 4,
                }}>
                    {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                    {/* Author row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                        <Avatar name={answer.author_name} size={32} />
                        <div>
                            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#1E293B' }}>{answer.author_name || 'Anonymous'}</p>
                            <p style={{ margin: 0, fontSize: '0.72rem', color: '#94A3B8' }}>{timeAgo(answer.created_at)}</p>
                        </div>
                        {answer.author_role && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: rb.bg, color: rb.color, border: `1px solid ${rb.border}` }}>
                                {roleLabel(answer.author_role)}
                            </span>
                        )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                        {answer.body || answer.content}
                    </p>
                </div>
            </div>
        </div>
    );
};

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
    useEffect(() => { if (!loading && post && user && answerRef.current) answerRef.current.focus(); }, [loading, post, user]);

    const handleVote = async () => {
        if (!user) { navigate('/login', { state: { from: `/community-qna/${id}` } }); return; }
        if (voting) return;
        const wasVoted = hasVoted;
        setOptimisticVotes((v) => wasVoted ? v - 1 : v + 1);
        setHasVoted(!wasVoted);
        setVoting(true);
        try { await votePost(id); }
        catch (err) {
            setOptimisticVotes((v) => wasVoted ? v + 1 : v - 1);
            setHasVoted(wasVoted);
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
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 32px', textAlign: 'center' }}>
            <MessageCircle size={52} style={{ color: '#CBD5E1', marginBottom: 16 }} />
            <h2 style={{ color: '#1E293B', margin: '0 0 8px' }}>Question Not Found</h2>
            <p style={{ color: '#64748B', marginBottom: 28 }}>This question may have been removed or the link is incorrect.</p>
            <Link to="/community-qna" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#003366', color: '#fff', padding: '10px 22px', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '0.88rem' }}>
                <ArrowLeft size={15} /> Back to Community
            </Link>
        </div>
    );

    if (error) return (
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 32px', textAlign: 'center', color: '#DC2626' }}>
            <AlertCircle size={44} style={{ marginBottom: 16 }} />
            <p style={{ marginBottom: 24, color: '#64748B' }}>{error}</p>
            <button onClick={fetchPost} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#003366', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>
                <RefreshCw size={14} /> Try Again
            </button>
        </div>
    );

    const rb = roleBg(post.author_role);

    return (
        <div style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 24px 80px' }}>
            <div style={{ maxWidth: 760, margin: '0 auto' }}>

                {/* Back */}
                <button
                    onClick={() => navigate(-1)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', padding: 0, marginBottom: 28, fontFamily: 'inherit' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#003366'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#64748B'}
                >
                    <ArrowLeft size={15} /> Back to Community
                </button>

                {/* Question card */}
                <article style={{ background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 2px 12px rgba(0,51,102,0.07)', marginBottom: 20, overflow: 'hidden' }}>
                    {/* Top bar */}
                    <div style={{ background: 'linear-gradient(135deg, #002244 0%, #003366 100%)', padding: '24px 32px' }}>
                        {post.tags && post.tags.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                                {post.tags.map((tag) => (
                                    <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px' }}>
                                        <Tag size={10} />#{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                        <h1 style={{ color: '#fff', fontSize: 'clamp(1.25rem, 3vw, 1.65rem)', fontWeight: 800, margin: 0, lineHeight: 1.35 }}>
                            {post.title}
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                            <Avatar name={post.author_name} size={34} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{post.author_name || 'Anonymous'}</span>
                            {post.author_role && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: rb.bg, color: rb.color, border: `1px solid ${rb.border}` }}>
                                    {roleLabel(post.author_role)}
                                </span>
                            )}
                            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={12} /> {formatDateTime(post.created_at)}
                            </span>
                        </div>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '28px 32px' }}>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                            {post.body}
                        </p>

                        {/* Vote row */}
                        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            <button
                                onClick={handleVote}
                                disabled={voting || !user}
                                title={!user ? 'Login to vote' : hasVoted ? 'Remove vote' : 'Mark as helpful'}
                                aria-label={`${hasVoted ? 'Remove vote' : 'Vote helpful'}. Current: ${optimisticVotes}`}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                    padding: '9px 18px', borderRadius: 10, cursor: (voting || !user) ? 'not-allowed' : 'pointer',
                                    fontWeight: 700, fontSize: '0.85rem', fontFamily: 'inherit', transition: 'all 0.2s',
                                    border: hasVoted ? '1.5px solid #3B82F6' : '1.5px solid #E2E8F0',
                                    background: hasVoted ? '#EFF6FF' : '#F8FAFC',
                                    color: hasVoted ? '#1D4ED8' : '#475569',
                                    opacity: (!user) ? 0.6 : 1,
                                }}
                            >
                                {voting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ThumbsUp size={14} />}
                                {optimisticVotes} {optimisticVotes === 1 ? 'upvote' : 'upvotes'}
                            </button>
                            {!user && (
                                <Link to="/login" style={{ fontSize: '0.83rem', color: '#003366', fontWeight: 600 }}>
                                    Login to vote
                                </Link>
                            )}
                            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#94A3B8' }}>
                                <MessageCircle size={13} /> {answers.length} answer{answers.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                </article>

                {/* Answers */}
                <section style={{ background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 2px 12px rgba(0,51,102,0.07)', marginBottom: 20, padding: '28px 32px' }}>
                    <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MessageCircle size={18} color="#003366" />
                        {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
                    </h2>
                    <p style={{ margin: '0 0 20px', fontSize: '0.78rem', color: '#94A3B8' }}>Responses from the ARC community</p>

                    {answers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 24px', background: '#F8FAFC', borderRadius: 12, border: '1px dashed #E2E8F0' }}>
                            <MessageCircle size={36} style={{ color: '#CBD5E1', marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                            <p style={{ color: '#94A3B8', fontSize: '0.88rem', margin: 0 }}>No answers yet — be the first expert to respond!</p>
                        </div>
                    ) : (
                        <div aria-live="polite">
                            {answers.map((ans, i) => <AnswerItem key={ans.id} answer={ans} index={i} />)}
                        </div>
                    )}
                </section>

                {/* Answer form */}
                <section style={{ background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 2px 12px rgba(0,51,102,0.07)', padding: '28px 32px' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Send size={16} color="#003366" /> Your Answer
                    </h3>
                    <p style={{ margin: '0 0 20px', fontSize: '0.78rem', color: '#94A3B8' }}>Share your expertise with the community</p>

                    {user ? (
                        <form onSubmit={handleAnswerSubmit} noValidate>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
                                <Avatar name={user.name} size={36} />
                                <div style={{ flex: 1 }}>
                                    <textarea
                                        ref={answerRef}
                                        value={answerBody}
                                        onChange={(e) => setAnswerBody(e.target.value)}
                                        placeholder="Write a clear, detailed answer\u2026"
                                        rows={5}
                                        disabled={submitting}
                                        style={{
                                            width: '100%', padding: '14px 16px',
                                            border: '1.5px solid #E2E8F0', borderRadius: 12,
                                            fontSize: '0.88rem', fontFamily: 'inherit', lineHeight: 1.7,
                                            resize: 'vertical', minHeight: 120, outline: 'none',
                                            color: '#1E293B', background: '#FAFBFC', boxSizing: 'border-box',
                                            transition: 'border-color 0.2s',
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#003366'}
                                        onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    type="submit"
                                    disabled={submitting || !answerBody.trim()}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 8,
                                        background: (!answerBody.trim() || submitting) ? '#94A3B8' : '#003366',
                                        color: '#fff', border: 'none',
                                        padding: '11px 24px', borderRadius: 10,
                                        fontWeight: 700, fontSize: '0.88rem',
                                        cursor: (!answerBody.trim() || submitting) ? 'not-allowed' : 'pointer',
                                        fontFamily: 'inherit', transition: 'background 0.2s, transform 0.15s',
                                    }}
                                    onMouseEnter={(e) => { if (answerBody.trim() && !submitting) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    {submitting
                                        ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Posting\u2026</>
                                        : <><Send size={14} /> Post Answer</>
                                    }
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 24px', background: '#F8FAFC', borderRadius: 12, border: '1px dashed #E2E8F0' }}>
                            <Shield size={32} style={{ color: '#CBD5E1', display: 'block', margin: '0 auto 12px' }} />
                            <p style={{ color: '#64748B', marginBottom: 20, fontSize: '0.9rem' }}>You must be logged in to post an answer.</p>
                            <Link
                                to="/login"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#003366', color: '#fff', padding: '10px 22px', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '0.88rem' }}
                            >
                                Login to Answer
                            </Link>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default QnADetail;
