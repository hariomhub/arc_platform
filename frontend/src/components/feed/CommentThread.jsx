/**
 * CommentThread.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Threaded comments section for the post detail page.
 * - Max 2 levels deep (enforced on backend too)
 * - Like on comments
 * - Edit/delete own comments
 * - Hide for founding_member
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Heart, CornerDownRight, Pencil, Trash2,
    EyeOff, Loader2, Send, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import {
    getComments, createComment, updateComment,
    deleteComment, toggleHideComment, toggleCommentLike,
} from '../../api/feed.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';
import { timeAgo } from '../../utils/dateFormatter.js';

const ROLE_META = {
    founding_member: { label: 'Founding Member', color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
    council_member:  { label: 'Council Member',  color: '#003366', bg: 'rgba(0,51,102,0.09)'  },
    professional:    { label: 'Professional',    color: '#0369A1', bg: 'rgba(3,105,161,0.09)'  },
};

// ── Small Avatar ──────────────────────────────────────────────────────────────
const MiniAvatar = ({ name, photo, role, size = 32 }) => {
    const meta = ROLE_META[role] || ROLE_META.professional;
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: photo ? 'transparent' : `linear-gradient(135deg,${meta.color}cc,${meta.color}77)`, border: `1.5px solid ${meta.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: '800', color: 'white', overflow: 'hidden' }}>
            {photo ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name || 'A').charAt(0).toUpperCase()}
        </div>
    );
};

// ── Comment input box ─────────────────────────────────────────────────────────
const CommentInput = ({ postId, parentId, onSuccess, onCancel, placeholder = 'Write a comment…', autoFocus = false }) => {
    const { user }      = useAuth();
    const { showToast } = useToast();
    const [text, setText]         = useState('');
    const [submitting, setSubmitting] = useState(false);
    const textareaRef = useRef(null);

    useEffect(() => { if (autoFocus && textareaRef.current) textareaRef.current.focus(); }, [autoFocus]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!text.trim() || submitting) return;
        setSubmitting(true);
        try {
            const res = await createComment(postId, { content: text.trim(), parent_comment_id: parentId || undefined });
            const comment = res.data?.data;
            setText('');
            if (onSuccess) onSuccess(comment);
        } catch (err) {
            showToast(getErrorMessage(err), 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <MiniAvatar name={user?.name} role={user?.role} size={32} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={placeholder}
                    rows={2}
                    maxLength={2000}
                    disabled={submitting}
                    style={{ width: '100%', padding: '0.65rem 0.875rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.85rem', fontFamily: 'var(--font-sans)', lineHeight: '1.55', resize: 'vertical', minHeight: '68px', outline: 'none', color: '#1e293b', background: '#fafbfc', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                    onFocus={e => e.target.style.borderColor = '#003366'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', color: text.length > 1800 ? '#D97706' : '#cbd5e1' }}>
                        {text.length}/2000
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {onCancel && (
                            <button type="button" onClick={onCancel}
                                style={{ padding: '5px 12px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                                Cancel
                            </button>
                        )}
                        <button type="submit" disabled={!text.trim() || submitting}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 14px', background: text.trim() && !submitting ? '#003366' : '#94a3b8', border: 'none', borderRadius: '7px', fontSize: '0.78rem', fontWeight: '700', color: 'white', cursor: text.trim() && !submitting ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-sans)', transition: 'background 0.15s' }}>
                            {submitting ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={12} />}
                            {submitting ? 'Posting…' : 'Post'}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
};

// ── Single comment row ────────────────────────────────────────────────────────
const CommentRow = ({ comment, postId, depth = 0, onCommentAdded, onCommentDeleted, onCommentUpdated }) => {
    const { user }      = useAuth();
    const { showToast } = useToast();

    const [liked,      setLiked]      = useState(!!comment.is_liked);
    const [likeCount,  setLikeCount]  = useState(comment.like_count || 0);
    const [replying,   setReplying]   = useState(false);
    const [editing,    setEditing]    = useState(false);
    const [editText,   setEditText]   = useState(comment.content);
    const [deleting,   setDeleting]   = useState(false);
    const [collapsed,  setCollapsed]  = useState(false);

    const isOwner   = user?.id === comment.author_id;
    const isFounder = user?.role === 'founding_member';
    const roleMeta  = ROLE_META[comment.author_role] || ROLE_META.professional;
    const hasReplies = comment.replies && comment.replies.length > 0;

    const handleLike = async () => {
        if (!user) return;
        const was = liked;
        setLiked(!was); setLikeCount(c => was ? c - 1 : c + 1);
        try { await toggleCommentLike(comment.id); }
        catch { setLiked(was); setLikeCount(c => was ? c + 1 : c - 1); }
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete this comment?')) return;
        setDeleting(true);
        try {
            await deleteComment(comment.id);
            if (onCommentDeleted) onCommentDeleted(comment.id, comment.parent_comment_id);
        } catch (err) {
            showToast(getErrorMessage(err), 'error');
            setDeleting(false);
        }
    };

    const handleHide = async () => {
        try {
            await toggleHideComment(comment.id);
            showToast('Comment visibility updated.', 'success');
            if (onCommentUpdated) onCommentUpdated({ ...comment, is_hidden: !comment.is_hidden });
        } catch (err) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editText.trim()) return;
        try {
            const res = await updateComment(comment.id, { content: editText.trim() });
            if (onCommentUpdated) onCommentUpdated(res.data?.data);
            setEditing(false);
        } catch (err) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    return (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <MiniAvatar name={comment.author_name} photo={comment.author_photo} role={comment.author_role} size={depth === 0 ? 34 : 28} />

            <div style={{ flex: 1, minWidth: 0 }}>
                {/* Comment bubble */}
                <div style={{ background: depth === 0 ? '#f8fafc' : '#f0f5ff', border: `1px solid ${depth === 0 ? '#f1f5f9' : '#dbeafe'}`, borderRadius: '12px', padding: '0.75rem 0.875rem', marginBottom: '4px' }}>

                    {/* Author line */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '5px' }}>
                        <span style={{ fontSize: '0.83rem', fontWeight: '700', color: '#1e293b' }}>{comment.author_name}</span>
                        <span style={{ fontSize: '0.62rem', fontWeight: '700', padding: '1px 7px', borderRadius: '100px', background: roleMeta.bg, color: roleMeta.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {roleMeta.label}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: 'auto' }}>{timeAgo(comment.created_at)}</span>
                        {comment.is_edited && <span style={{ fontSize: '0.65rem', color: '#cbd5e1', fontStyle: 'italic' }}>edited</span>}
                    </div>

                    {/* Content or edit form */}
                    {editing ? (
                        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <textarea
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                rows={2}
                                autoFocus
                                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid #003366', borderRadius: '8px', fontSize: '0.84rem', fontFamily: 'var(--font-sans)', resize: 'vertical', outline: 'none', boxSizing: 'border-box', background: 'white' }}
                            />
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button type="submit" style={{ padding: '4px 12px', background: '#003366', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Save</button>
                                <button type="button" onClick={() => { setEditing(false); setEditText(comment.content); }} style={{ padding: '4px 12px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-sans)', color: '#64748b' }}>Cancel</button>
                            </div>
                        </form>
                    ) : (
                        <p style={{ margin: 0, fontSize: '0.855rem', color: '#374151', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {comment.content}
                        </p>
                    )}
                </div>

                {/* Action row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', paddingLeft: '4px' }}>
                    {/* Like */}
                    <button onClick={handleLike}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: user ? 'pointer' : 'default', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: '600', color: liked ? '#e11d48' : '#64748b', padding: '3px 7px', borderRadius: '6px', transition: 'all 0.12s' }}
                        onMouseOver={e => { if (user) e.currentTarget.style.background = '#f1f5f9'; }}
                        onMouseOut={e => e.currentTarget.style.background = 'none'}>
                        <Heart size={13} fill={liked ? '#e11d48' : 'none'} color={liked ? '#e11d48' : '#64748b'} />
                        {likeCount > 0 && <span>{likeCount}</span>}
                    </button>

                    {/* Reply — only on top-level comments */}
                    {depth === 0 && user && (
                        <button onClick={() => setReplying(r => !r)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', padding: '3px 7px', borderRadius: '6px', transition: 'background 0.12s' }}
                            onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseOut={e => e.currentTarget.style.background = 'none'}>
                            <CornerDownRight size={12} /> Reply
                        </button>
                    )}

                    {/* Edit */}
                    {isOwner && !editing && (
                        <button onClick={() => setEditing(true)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', padding: '3px 7px', borderRadius: '6px', transition: 'background 0.12s' }}
                            onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseOut={e => e.currentTarget.style.background = 'none'}>
                            <Pencil size={12} />
                        </button>
                    )}

                    {/* Hide (founding_member) */}
                    {isFounder && (
                        <button onClick={handleHide}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: '600', color: '#D97706', padding: '3px 7px', borderRadius: '6px', transition: 'background 0.12s' }}
                            onMouseOver={e => e.currentTarget.style.background = '#fffbeb'}
                            onMouseOut={e => e.currentTarget.style.background = 'none'}>
                            <EyeOff size={12} />
                        </button>
                    )}

                    {/* Delete */}
                    {(isOwner || isFounder) && (
                        <button onClick={handleDelete} disabled={deleting}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: '600', color: '#DC2626', padding: '3px 7px', borderRadius: '6px', transition: 'background 0.12s' }}
                            onMouseOver={e => e.currentTarget.style.background = '#fff1f2'}
                            onMouseOut={e => e.currentTarget.style.background = 'none'}>
                            {deleting ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={12} />}
                        </button>
                    )}

                    {/* Collapse replies toggle */}
                    {hasReplies && (
                        <button onClick={() => setCollapsed(c => !c)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: '#003366', fontWeight: '700', padding: '3px 7px', borderRadius: '6px', marginLeft: 'auto', transition: 'background 0.12s' }}
                            onMouseOver={e => e.currentTarget.style.background = '#eff6ff'}
                            onMouseOut={e => e.currentTarget.style.background = 'none'}>
                            {collapsed
                                ? <><ChevronDown size={12} /> {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</>
                                : <><ChevronUp size={12} /> Hide replies</>
                            }
                        </button>
                    )}
                </div>

                {/* Reply input */}
                {replying && (
                    <div style={{ marginTop: '0.6rem', paddingLeft: '4px' }}>
                        <CommentInput
                            postId={postId}
                            parentId={comment.id}
                            autoFocus
                            placeholder={`Reply to ${comment.author_name}…`}
                            onCancel={() => setReplying(false)}
                            onSuccess={(newComment) => {
                                setReplying(false);
                                if (onCommentAdded) onCommentAdded(newComment, comment.id);
                            }}
                        />
                    </div>
                )}

                {/* Nested replies */}
                {!collapsed && hasReplies && (
                    <div style={{ marginTop: '0.75rem', paddingLeft: '8px', borderLeft: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {comment.replies.map(reply => (
                            <CommentRow
                                key={reply.id}
                                comment={reply}
                                postId={postId}
                                depth={1}
                                onCommentAdded={onCommentAdded}
                                onCommentDeleted={onCommentDeleted}
                                onCommentUpdated={onCommentUpdated}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Main CommentThread ────────────────────────────────────────────────────────
const CommentThread = ({ postId, initialCount = 0 }) => {
    const { user }      = useAuth();
    const { showToast } = useToast();
    const [comments,  setComments]  = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState('');
    const [count,     setCount]     = useState(initialCount);

    const fetchComments = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await getComments(postId);
            setComments(res.data?.data || []);
            setCount(res.data?.data?.length || 0);
        } catch (err) {
            setError(getErrorMessage(err) || 'Failed to load comments.');
        } finally {
            setLoading(false);
        }
    }, [postId]);

    useEffect(() => { fetchComments(); }, [fetchComments]);

    // Add new top-level comment or reply
    const handleCommentAdded = useCallback((newComment, parentId) => {
        setCount(c => c + 1);
        if (!parentId) {
            setComments(prev => [...prev, { ...newComment, replies: [] }]);
        } else {
            setComments(prev => prev.map(c => {
                if (c.id === parentId) {
                    return { ...c, replies: [...(c.replies || []), { ...newComment, replies: [] }] };
                }
                return c;
            }));
        }
    }, []);

    const handleCommentDeleted = useCallback((id, parentId) => {
        setCount(c => Math.max(0, c - 1));
        if (!parentId) {
            setComments(prev => prev.filter(c => c.id !== id));
        } else {
            setComments(prev => prev.map(c => {
                if (c.replies?.some(r => r.id === id)) {
                    return { ...c, replies: c.replies.filter(r => r.id !== id) };
                }
                return c;
            }));
        }
    }, []);

    const handleCommentUpdated = useCallback((updated) => {
        setComments(prev => prev.map(c => {
            if (c.id === updated.id) return { ...c, ...updated };
            return { ...c, replies: (c.replies || []).map(r => r.id === updated.id ? { ...r, ...updated } : r) };
        }));
    }, []);

    return (
        <div id="comments">
            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>
                    Comments
                </h3>
                <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', padding: '2px 8px', borderRadius: '100px' }}>
                    {count}
                </span>
            </div>

            {/* Write a comment — logged-in users */}
            {user ? (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fafbfc', border: '1px solid #f1f5f9', borderRadius: '14px' }}>
                    <CommentInput
                        postId={postId}
                        placeholder="Share your thoughts…"
                        onSuccess={(c) => handleCommentAdded(c, null)}
                    />
                </div>
            ) : (
                <div style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', background: '#f8fafc', border: '1.5px dashed #e2e8f0', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#64748b' }}>
                        Sign in to join the conversation
                    </p>
                    <a href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#003366', color: 'white', padding: '0.55rem 1.25rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.83rem', textDecoration: 'none' }}>
                        Sign In
                    </a>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#f1f5f9', flexShrink: 0, animation: 'adm-pulse 1.4s ease-in-out infinite' }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ height: '68px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '12px', animation: 'adm-pulse 1.4s ease-in-out infinite' }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <p style={{ color: '#DC2626', fontSize: '0.875rem', textAlign: 'center' }}>{error}</p>
            )}

            {/* Empty */}
            {!loading && !error && comments.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#f8fafc', borderRadius: '12px', border: '1.5px dashed #e2e8f0' }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>No comments yet. Be the first to share your thoughts.</p>
                </div>
            )}

            {/* Comment list */}
            {!loading && !error && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {comments.map(comment => (
                        <CommentRow
                            key={comment.id}
                            comment={comment}
                            postId={postId}
                            depth={0}
                            onCommentAdded={handleCommentAdded}
                            onCommentDeleted={handleCommentDeleted}
                            onCommentUpdated={handleCommentUpdated}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CommentThread;