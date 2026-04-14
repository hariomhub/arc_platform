/**
 * QnADetail.jsx — Single Post Detail Page
 * ─────────────────────────────────────────────────────────────────────────────
 * URL: /community-qna/:id
 * Shows full post + threaded comments.
 * Supports ?edit=true query param to open edit mode directly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
    ArrowLeft, AlertCircle, RefreshCw,
    MessageCircle, Loader2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { getFeedPost, updateFeedPost } from '../api/feed.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import FeedPost from '../components/feed/FeedPost.jsx';
import CommentThread from '../components/feed/CommentThread.jsx';

// ── Page skeleton ─────────────────────────────────────────────────────────────
const PageSkeleton = () => (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem clamp(0.875rem,3vw,1.5rem)' }}>
        <style>{`@keyframes sk-pulse2 { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
        <div style={{ height: '14px', width: '80px', background: '#e2e8f0', borderRadius: '6px', marginBottom: '2rem', animation: 'sk-pulse2 1.4s ease-in-out infinite' }} />
        <div style={{ background: 'white', border: '1px solid #e8edf3', borderRadius: '18px', padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#f1f5f9', flexShrink: 0, animation: 'sk-pulse2 1.4s ease-in-out infinite' }} />
                <div style={{ flex: 1 }}>
                    <div style={{ height: '13px', width: '35%', background: '#f1f5f9', borderRadius: '4px', marginBottom: '7px', animation: 'sk-pulse2 1.4s ease-in-out infinite' }} />
                    <div style={{ height: '10px', width: '20%', background: '#f1f5f9', borderRadius: '4px', animation: 'sk-pulse2 1.4s ease-in-out infinite' }} />
                </div>
            </div>
            {[90, 80, 70, 55].map((w, i) => (
                <div key={i} style={{ height: '13px', width: `${w}%`, background: '#f1f5f9', borderRadius: '4px', marginBottom: '10px', animation: 'sk-pulse2 1.4s ease-in-out infinite' }} />
            ))}
        </div>
    </div>
);

// ── Edit form ─────────────────────────────────────────────────────────────────
const EditPostForm = ({ post, onSave, onCancel }) => {
    const { showToast } = useToast();
    const [content,    setContent]    = useState(post.content);
    const [tagInput,   setTagInput]   = useState('');
    const [tags,       setTags]       = useState(post.tags || []);
    const [submitting, setSubmitting] = useState(false);

    const charsLeft = 5000 - content.length;

    const addTag = () => {
        const clean = tagInput.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_]/g, '').slice(0, 30);
        if (!clean || tags.includes(clean) || tags.length >= 5) return;
        setTags(prev => [...prev, clean]);
        setTagInput('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;
        setSubmitting(true);
        try {
            const res = await updateFeedPost(post.id, { content: content.trim(), tags });
            showToast('Post updated.', 'success');
            onSave(res.data?.data);
        } catch (err) {
            showToast(getErrorMessage(err), 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ background: 'white', border: '1.5px solid #003366', borderRadius: '18px', padding: '1.5rem', marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', fontWeight: '700', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Editing post</p>
            <form onSubmit={handleSubmit}>
                <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    maxLength={5000}
                    rows={6}
                    style={{ width: '100%', padding: '0.875rem', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.925rem', fontFamily: 'var(--font-sans)', lineHeight: '1.7', resize: 'vertical', outline: 'none', color: '#1e293b', background: '#fafbfc', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                    onFocus={e => e.target.style.borderColor = '#003366'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', marginBottom: '0.875rem' }}>
                    <span style={{ fontSize: '0.7rem', color: charsLeft < 200 ? '#D97706' : '#cbd5e1' }}>{charsLeft} remaining</span>
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '0.5rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', alignItems: 'center', marginBottom: '1rem', cursor: 'text' }}>
                    {tags.map(tag => (
                        <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#eff6ff', color: '#1D4ED8', border: '1px solid #bfdbfe', borderRadius: '100px', fontSize: '0.72rem', fontWeight: '700', padding: '2px 8px' }}>
                            #{tag}
                            <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#1D4ED8', display: 'flex' }}>
                                ×
                            </button>
                        </span>
                    ))}
                    {tags.length < 5 && (
                        <input
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                            placeholder={tags.length ? '' : 'Add tags…'}
                            style={{ border: 'none', outline: 'none', fontSize: '0.82rem', fontFamily: 'var(--font-sans)', background: 'transparent', color: '#1e293b', minWidth: '80px' }}
                        />
                    )}
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={onCancel}
                        style={{ padding: '0.6rem 1.25rem', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', color: '#64748b' }}>
                        Cancel
                    </button>
                    <button type="submit" disabled={submitting || !content.trim()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.6rem 1.5rem', background: submitting ? '#94a3b8' : '#003366', border: 'none', borderRadius: '9px', fontWeight: '700', fontSize: '0.875rem', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', color: 'white' }}>
                        {submitting ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

// ── Main Detail Page ──────────────────────────────────────────────────────────
const QnADetail = () => {
    const { id }        = useParams();
    const navigate      = useNavigate();
    const { user }      = useAuth();
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    const [post,      setPost]      = useState(null);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState('');
    const [notFound,  setNotFound]  = useState(false);
    const [editing,   setEditing]   = useState(searchParams.get('edit') === 'true');

    const fetchPost = useCallback(async () => {
        setLoading(true); setError(''); setNotFound(false);
        try {
            const res = await getFeedPost(id);
            const data = res.data?.data;
            setPost(data);
            document.title = `${data?.author_name || 'Post'} on Community Feed | AI Risk Council`;
        } catch (err) {
            if (err?.response?.status === 404) setNotFound(true);
            else setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchPost(); }, [fetchPost]);

    // Clear ?edit=true from URL without navigation
    useEffect(() => {
        if (searchParams.get('edit') === 'true') {
            const n = new URLSearchParams(searchParams);
            n.delete('edit');
            setSearchParams(n, { replace: true });
        }
    }, []);

    const handlePostUpdate = useCallback((updated) => {
        setPost(prev => ({ ...prev, ...updated }));
        setEditing(false);
    }, []);

    const handlePostDelete = useCallback(() => {
        showToast('Post deleted.', 'success');
        navigate('/community-qna', { replace: true });
    }, [navigate, showToast]);

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) return (
        <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
            <PageSkeleton />
        </div>
    );

    // ── Not found ─────────────────────────────────────────────────────────────
    if (notFound) return (
        <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <MessageCircle size={28} color="#cbd5e1" />
            </div>
            <h2 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '1.3rem', fontWeight: '800' }}>Post Not Found</h2>
            <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.9rem' }}>This post may have been removed or the link is incorrect.</p>
            <Link to="/community-qna"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#003366', color: 'white', padding: '0.65rem 1.5rem', borderRadius: '9px', fontWeight: '700', textDecoration: 'none', fontSize: '0.875rem' }}>
                <ArrowLeft size={14} /> Back to Feed
            </Link>
        </div>
    );

    // ── Error ─────────────────────────────────────────────────────────────────
    if (error) return (
        <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
            <AlertCircle size={36} color="#DC2626" style={{ margin: '0 auto 0.875rem', display: 'block', opacity: 0.7 }} />
            <p style={{ margin: '0 0 1.25rem', color: '#64748b' }}>{error}</p>
            <button onClick={fetchPost}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#003366', color: 'white', border: 'none', padding: '0.65rem 1.5rem', borderRadius: '9px', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem', fontFamily: 'var(--font-sans)' }}>
                <RefreshCw size={14} /> Try Again
            </button>
        </div>
    );

    // ── Main render ───────────────────────────────────────────────────────────
    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>

            <div style={{ maxWidth: '760px', margin: '0 auto', padding: 'clamp(1.5rem,4vw,2.5rem) clamp(0.875rem,3vw,1.5rem) 4rem' }}>

                {/* Back button */}
                <Link to="/community-qna"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', fontWeight: '600', fontSize: '0.84rem', textDecoration: 'none', marginBottom: '1.5rem', padding: '5px 0', transition: 'color 0.12s' }}
                    onMouseOver={e => e.currentTarget.style.color = '#003366'}
                    onMouseOut={e => e.currentTarget.style.color = '#64748b'}>
                    <ArrowLeft size={15} /> Back to Feed
                </Link>

                {/* Edit form or post card */}
                {editing && user?.id === post?.author_id ? (
                    <EditPostForm
                        post={post}
                        onSave={handlePostUpdate}
                        onCancel={() => setEditing(false)}
                    />
                ) : (
                    <FeedPost
                        post={post}
                        compact={false}
                        onUpdate={handlePostUpdate}
                        onDelete={handlePostDelete}
                    />
                )}

                {/* Comments section */}
                <div style={{ marginTop: '1.25rem', background: 'white', border: '1px solid #e8edf3', borderRadius: '18px', padding: 'clamp(1.1rem,3vw,1.5rem)', boxShadow: '0 2px 12px rgba(0,51,102,0.05)' }}>
                    <CommentThread
                        postId={parseInt(id, 10)}
                        initialCount={post?.comment_count || 0}
                    />
                </div>
            </div>
        </div>
    );
};

export default QnADetail;