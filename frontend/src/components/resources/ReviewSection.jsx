/**
 * ReviewSection.jsx
 * Full reviews section for ResourceDetail page.
 * - Rating summary with breakdown bars
 * - Sort tabs: Recent | Most Upvoted | Highest Rated | Lowest Rated
 * - Write / Edit review form
 * - Each review card with upvote toggle
 */
import React, { useState, useEffect, useCallback } from 'react';
import { ThumbsUp, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import {
    getReviews, createReview, updateReview,
    deleteReview, toggleReviewUpvote,
} from '../../api/resources.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';
import { timeAgo } from '../../utils/dateFormatter.js';
import StarRating from './StarRating.jsx';

const ROLE_META = {
    founding_member: { label: 'Founder',        color: '#7c3aed', bg: '#f5f3ff' },
    council_member:  { label: 'Council Member', color: '#0369a1', bg: '#eff6ff' },
    professional:    { label: 'Professional',   color: '#057642', bg: '#f0fdf4' },
};

const SORT_OPTIONS = [
    { key: 'recent',  label: 'Most Recent'  },
    { key: 'upvoted', label: 'Most Helpful' },
    { key: 'highest', label: 'Highest Rated'},
    { key: 'lowest',  label: 'Lowest Rated' },
];

// ── Rating summary bar ────────────────────────────────────────────────────────
const RatingBar = ({ star, count, total }) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', color: '#5e6e82', width: 14, textAlign: 'right', flexShrink: 0 }}>{star}</span>
            <div style={{ flex: 1, height: 6, background: '#f0f3f7', borderRadius: 100, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: '#f59e0b', borderRadius: 100, transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: '0.72rem', color: '#9aaab7', width: 20, flexShrink: 0 }}>{count}</span>
        </div>
    );
};

// ── Write / Edit form ─────────────────────────────────────────────────────────
const ReviewForm = ({ resourceId, existing, onSuccess, onCancel }) => {
    const { showToast } = useToast();
    const [rating,     setRating]     = useState(existing?.rating || 0);
    const [comment,    setComment]    = useState(existing?.comment || '');
    const [submitting, setSubmitting] = useState(false);
    const [error,      setError]      = useState('');
    const isEdit = !!existing;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!rating) { setError('Please select a star rating.'); return; }
        setError(''); setSubmitting(true);
        try {
            let res;
            if (isEdit) {
                res = await updateReview(resourceId, existing.id, { rating, comment });
            } else {
                res = await createReview(resourceId, { rating, comment });
            }
            showToast(isEdit ? 'Review updated.' : 'Review submitted!', 'success');
            onSuccess(res.data?.data);
        } catch (err) {
            const msg = getErrorMessage(err);
            if (err?.response?.data?.code === 'ALREADY_REVIEWED') {
                setError('You have already reviewed this resource.');
            } else {
                setError(msg || 'Failed to submit review.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '16px' }}>
            <p style={{ margin: '0 0 10px', fontSize: '0.84rem', fontWeight: '700', color: '#1a1a2e' }}>
                {isEdit ? 'Edit your review' : 'Write a review'}
            </p>
            <form onSubmit={handleSubmit}>
                {/* Star selector */}
                <div style={{ marginBottom: 10 }}>
                    <p style={{ margin: '0 0 6px', fontSize: '0.75rem', color: '#5e6e82', fontWeight: '600' }}>Your rating *</p>
                    <StarRating value={rating} onChange={setRating} size={28} color="#f59e0b" />
                    {rating > 0 && (
                        <span style={{ marginLeft: 8, fontSize: '0.78rem', color: '#f59e0b', fontWeight: '700' }}>
                            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                        </span>
                    )}
                </div>

                {/* Comment */}
                <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Share your experience with this resource… (optional)"
                    maxLength={2000}
                    rows={3}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', fontFamily: 'inherit', lineHeight: '1.6', resize: 'vertical', outline: 'none', color: '#1a1a2e', background: 'white', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                    onFocus={e => e.target.style.borderColor = '#003366'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: '0.67rem', color: '#c4cdd6' }}>{comment.length}/2000</span>
                </div>

                {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '7px 10px', marginTop: 8, fontSize: '0.8rem', color: '#DC2626' }}>
                        <AlertCircle size={13} /> {error}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    {onCancel && (
                        <button type="button" onClick={onCancel}
                            style={{ padding: '7px 14px', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 8, fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', color: '#5e6e82' }}>
                            Cancel
                        </button>
                    )}
                    <button type="submit" disabled={!rating || submitting}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 18px', background: rating && !submitting ? '#003366' : '#94a3b8', border: 'none', borderRadius: 8, fontWeight: '700', fontSize: '0.82rem', color: 'white', cursor: rating && !submitting ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'background 0.15s' }}>
                        {submitting
                            ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</>
                            : isEdit ? 'Update Review' : 'Submit Review'
                        }
                    </button>
                </div>
            </form>
        </div>
    );
};

// ── Single review card ────────────────────────────────────────────────────────
const ReviewCard = ({ review, resourceId, onUpdate, onDelete }) => {
    const { user }      = useAuth();
    const { showToast } = useToast();
    const [upvoted,   setUpvoted]   = useState(!!review.is_upvoted);
    const [upvotes,   setUpvotes]   = useState(review.upvote_count || 0);
    const [editing,   setEditing]   = useState(false);
    const [deleting,  setDeleting]  = useState(false);
    const [uvAnim,    setUvAnim]    = useState(false);

    const rm = ROLE_META[review.author_role] || ROLE_META.professional;

    const handleUpvote = async () => {
        if (!user) return;
        const was = upvoted;
        setUpvoted(!was); setUpvotes(c => was ? c - 1 : c + 1);
        if (!was) { setUvAnim(true); setTimeout(() => setUvAnim(false), 500); }
        try { await toggleReviewUpvote(resourceId, review.id); }
        catch { setUpvoted(was); setUpvotes(c => was ? c + 1 : c - 1); }
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete this review?')) return;
        setDeleting(true);
        try {
            await deleteReview(resourceId, review.id);
            showToast('Review deleted.', 'success');
            onDelete(review.id);
        } catch (err) {
            showToast(getErrorMessage(err), 'error');
            setDeleting(false);
        }
    };

    if (editing) {
        return (
            <ReviewForm
                resourceId={resourceId}
                existing={review}
                onSuccess={(updated) => { onUpdate(updated); setEditing(false); }}
                onCancel={() => setEditing(false)}
            />
        );
    }

    return (
        <div style={{ padding: '14px 0', borderBottom: '1px solid #f0f3f7' }}>
            <style>{`@keyframes uv-pop{0%{transform:scale(1)}35%{transform:scale(1.35)}70%{transform:scale(0.9)}100%{transform:scale(1)}}`}</style>

            {/* Author row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: review.author_photo ? 'transparent' : `${rm.color}22`, border: `2px solid ${rm.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.88rem', fontWeight: '800', color: rm.color }}>
                    {review.author_photo
                        ? <img src={review.author_photo} alt={review.author_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (review.author_name || 'A').charAt(0).toUpperCase()
                    }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1a1a2e' }}>{review.author_name}</span>
                        <span style={{ fontSize: '0.62rem', fontWeight: '700', padding: '1px 6px', borderRadius: 4, background: rm.bg, color: rm.color }}>{rm.label}</span>
                        {review.is_edited && <span style={{ fontSize: '0.66rem', color: '#c4cdd6', fontStyle: 'italic' }}>edited</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <StarRating value={review.rating} size={13} color="#f59e0b" />
                        <span style={{ fontSize: '0.72rem', color: '#9aaab7' }}>{timeAgo(review.created_at)}</span>
                    </div>
                </div>

                {/* Actions for own review or admin */}
                {(review.is_own || user?.role === 'founding_member') && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {review.is_own && (
                            <button onClick={() => setEditing(true)}
                                style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer' }}>
                                <Pencil size={12} color="#0369a1" />
                            </button>
                        )}
                        <button onClick={handleDelete} disabled={deleting}
                            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', opacity: deleting ? 0.5 : 1 }}>
                            {deleting ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={12} color="#DC2626" />}
                        </button>
                    </div>
                )}
            </div>

            {/* Comment */}
            {review.comment && (
                <p style={{ margin: '0 0 10px', fontSize: '0.875rem', color: '#374151', lineHeight: '1.65', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {review.comment}
                </p>
            )}

            {/* Upvote */}
            <button onClick={handleUpvote}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: upvoted ? '#eef2ff' : 'none', border: `1px solid ${upvoted ? '#c7d2fe' : '#e2e8f0'}`, borderRadius: 100, padding: '4px 10px', cursor: user ? 'pointer' : 'default', fontFamily: 'inherit', fontSize: '0.76rem', fontWeight: '600', color: upvoted ? '#003366' : '#5e6e82', transition: 'all 0.13s' }}
                onMouseOver={e => { if (user) e.currentTarget.style.borderColor = '#003366'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = upvoted ? '#c7d2fe' : '#e2e8f0'; }}>
                <ThumbsUp size={13}
                    style={{ animation: uvAnim ? 'uv-pop 0.5s ease' : 'none', transition: 'fill 0.13s' }}
                    fill={upvoted ? '#003366' : 'none'}
                    color={upvoted ? '#003366' : '#5e6e82'}
                />
                <span>Helpful{upvotes > 0 ? ` · ${upvotes}` : ''}</span>
            </button>
        </div>
    );
};

// ── Main ReviewSection ────────────────────────────────────────────────────────
const ReviewSection = ({ resourceId }) => {
    const { user }    = useAuth();
    const [reviews,   setReviews]   = useState([]);
    const [stats,     setStats]     = useState(null);
    const [userReview,setUserReview]= useState(null);
    const [sort,      setSort]      = useState('recent');
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState('');
    const [showForm,  setShowForm]  = useState(false);

    const fetchReviews = useCallback(async (s = sort) => {
        setLoading(true); setError('');
        try {
            const res = await getReviews(resourceId, s);
            if (res.data?.success) {
                setReviews(res.data.data || []);
                setStats(res.data.stats);
                setUserReview(res.data.user_review);
            }
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [resourceId, sort]);

    useEffect(() => { fetchReviews(); }, [resourceId, sort]);

    const handleSortChange = (s) => {
        setSort(s);
    };

    const handleReviewCreated = (newReview) => {
        setReviews(prev => [newReview, ...prev]);
        setUserReview({ id: newReview.id, rating: newReview.rating, comment: newReview.comment });
        setShowForm(false);
    };

    const handleReviewUpdated = (updated) => {
        setReviews(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));
        setUserReview({ id: updated.id, rating: updated.rating, comment: updated.comment });
    };

    const handleReviewDeleted = (id) => {
        setReviews(prev => prev.filter(r => r.id !== id));
        setUserReview(null);
    };

    const total      = parseInt(stats?.total || 0, 10);
    const avgRating  = parseFloat(stats?.avg_rating || 0);

    return (
        <div>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#1a1a2e' }}>Reviews</h3>
                    {total > 0 && (
                        <span style={{ background: '#f0f3f7', color: '#5e6e82', fontSize: '0.75rem', fontWeight: '700', padding: '2px 8px', borderRadius: 100 }}>{total}</span>
                    )}
                </div>
                {user && !userReview && !showForm && (
                    <button onClick={() => setShowForm(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#003366', color: 'white', border: 'none', borderRadius: 8, fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
                        onMouseOver={e => e.currentTarget.style.background = '#002244'}
                        onMouseOut={e => e.currentTarget.style.background = '#003366'}>
                        ✦ Write a Review
                    </button>
                )}
            </div>

            {/* Rating summary — only show if there are reviews */}
            {total > 0 && stats && (
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', background: '#f8fafc', borderRadius: 12, padding: '14px 16px', marginBottom: 16, flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: '2.2rem', fontWeight: '900', color: '#1a1a2e', lineHeight: 1 }}>{avgRating.toFixed(1)}</p>
                        <StarRating value={avgRating} size={14} color="#f59e0b" />
                        <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: '#9aaab7' }}>{total} review{total !== 1 ? 's' : ''}</p>
                    </div>
                    <div style={{ flex: 1, minWidth: 140, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {[5, 4, 3, 2, 1].map(star => (
                            <RatingBar key={star} star={star} count={parseInt(stats[`r${star}`] || 0, 10)} total={total} />
                        ))}
                    </div>
                </div>
            )}

            {/* Write review form */}
            {showForm && (
                <div style={{ marginBottom: 16 }}>
                    <ReviewForm
                        resourceId={resourceId}
                        onSuccess={handleReviewCreated}
                        onCancel={() => setShowForm(false)}
                    />
                </div>
            )}

            {/* Prompt to sign in */}
            {!user && (
                <div style={{ background: '#f8fafc', border: '1.5px dashed #e2e8f0', borderRadius: 10, padding: '14px 16px', textAlign: 'center', marginBottom: 14 }}>
                    <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#5e6e82' }}>
                        Sign in to write a review and help others discover quality resources.
                    </p>
                    <a href="/login" style={{ display: 'inline-flex', alignItems: 'center', background: '#003366', color: 'white', padding: '7px 18px', borderRadius: 8, fontWeight: '700', fontSize: '0.8rem', textDecoration: 'none' }}>
                        Sign In
                    </a>
                </div>
            )}

            {/* Sort tabs — only show if reviews exist */}
            {total > 0 && (
                <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e8ecf0', marginBottom: 4, overflowX: 'auto', scrollbarWidth: 'none' }}>
                    {SORT_OPTIONS.map(({ key, label }) => (
                        <button key={key} onClick={() => handleSortChange(key)}
                            style={{ padding: '9px 14px', border: 'none', borderBottom: `2.5px solid ${sort === key ? '#003366' : 'transparent'}`, background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.79rem', fontWeight: sort === key ? '700' : '500', color: sort === key ? '#003366' : '#5e6e82', whiteSpace: 'nowrap', transition: 'all 0.13s', flexShrink: 0 }}>
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {/* Reviews list */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0' }}>
                    {[1, 2].map(i => (
                        <div key={i} style={{ height: 80, background: '#f8fafc', borderRadius: 8, animation: 'sk 1.4s ease infinite' }} />
                    ))}
                    <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
                </div>
            ) : error ? (
                <p style={{ color: '#DC2626', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>{error}</p>
            ) : reviews.length === 0 && !showForm ? (
                <div style={{ textAlign: 'center', padding: '28px 16px', background: '#f8fafc', borderRadius: 10, border: '1.5px dashed #e2e8f0' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '0.9rem', fontWeight: '700', color: '#9aaab7' }}>No reviews yet</p>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#c4cdd6' }}>Be the first to review this resource.</p>
                </div>
            ) : (
                <div>
                    {reviews.map(review => (
                        <ReviewCard
                            key={review.id}
                            review={review}
                            resourceId={resourceId}
                            onUpdate={handleReviewUpdated}
                            onDelete={handleReviewDeleted}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReviewSection;