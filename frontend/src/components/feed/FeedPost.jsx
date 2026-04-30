import React, { useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ThumbsUp, MessageSquare, Bookmark, BookmarkCheck,
    Share2, MoreHorizontal, Pencil, Trash2, EyeOff, Eye,
    AlertTriangle, ExternalLink, FileText, Check,
    Bot, BarChart2, CalendarDays, Wrench,
    Users, CalendarCheck, Building2, FlaskConical, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { togglePostLike, savePost, unsavePost, deleteFeedPost, toggleHidePost, togglePostReaction, castPollVote } from '../../api/feed.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';
import { timeAgo } from '../../utils/dateFormatter.js';
import AuthorHoverCard from './AuthorHoverCard.jsx';
import MediaViewer from './MediaViewer.jsx';

const ROLE_META = {
    founding_member: { label: 'Founder',        color: '#7C3AED', bg: '#f5f3ff', border: '#ddd6fe' },
    council_member:  { label: 'Council Member', color: '#0369a1', bg: '#eff6ff', border: '#bfdbfe' },
    professional:    { label: 'Professional',   color: '#057642', bg: '#f0fdf4', border: '#bbf7d0' },
};

const POST_TYPE_META = {
    ai_product:      { label: 'AI Product',      Icon: Bot,          color: '#7C3AED', bg: '#f5f3ff', border: '#ddd6fe' },
    poll:            { label: 'Poll',            Icon: BarChart2,    color: '#2563EB', bg: '#eff6ff', border: '#bfdbfe' },
    event:           { label: 'Event',           Icon: CalendarDays, color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
    troubleshooting: { label: 'Troubleshooting', Icon: Wrench,       color: '#D97706', bg: '#fffbeb', border: '#fde68a' },
    general:         { label: 'General',         Icon: null,         color: '#003366', bg: '#eef2ff', border: '#c7d2fe' },
};

// Inline poll component
const PollBlock = ({ post, user, navigate }) => {
    const [userVote,   setUserVote]   = useState(post.user_poll_vote ?? null);
    const [voteCounts, setVoteCounts] = useState(post.poll_vote_counts || {});
    const [loading,    setLoading]    = useState(false);
    const options    = post.poll_options || [];
    const hasVoted   = userVote !== null;
    const totalVotes = Object.values(voteCounts).reduce((s, v) => s + v, 0);
    const expired    = post.poll_ends_at && new Date(post.poll_ends_at) < new Date();

    const handleVote = async (idx) => {
        if (!user) { navigate('/login'); return; }
        if (expired) return;
        setLoading(true);
        try {
            const res = await castPollVote(post.id, idx);
            setUserVote(res.data.data.user_vote);
            setVoteCounts(res.data.data.vote_counts);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    const pct = (idx) => {
        if (!totalVotes) return 0;
        return Math.round(((voteCounts[idx] || 0) / totalVotes) * 100);
    };

    return (
        <div style={{ marginTop: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {options.map((opt, i) => (
                <div key={i}>
                    {hasVoted || expired ? (
                        <div style={{ position: 'relative', borderRadius: 7, overflow: 'hidden', border: `1.5px solid ${userVote === i ? '#003366' : '#e2e8f0'}`, background: 'white' }}>
                            {/* Base Layer: White Background, Dark Text */}
                            <div style={{ padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: userVote === i ? '700' : '500', color: userVote === i ? '#003366' : '#374151' }}>{opt}</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: userVote === i ? '#003366' : '#64748b' }}>{pct(i)}%</span>
                            </div>

                            {/* Overlay Layer: Dark Blue Background, White Text. Clipped to percentage! */}
                            <div style={{ position: 'absolute', inset: 0, background: userVote === i ? '#003366' : '#005599', clipPath: `inset(0 ${100 - pct(i)}% 0 0)`, transition: 'clip-path 0.4s ease' }}>
                                <div style={{ width: '100%', height: '100%', padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: userVote === i ? '700' : '500', color: 'white', whiteSpace: 'nowrap' }}>{opt}</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'white' }}>{pct(i)}%</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => handleVote(i)} disabled={loading}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '0.45rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: 7, background: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: '500', color: '#374151', textAlign: 'left', transition: 'all 0.15s' }}
                            onMouseOver={e => { if (!loading) { e.currentTarget.style.borderColor = '#003366'; e.currentTarget.style.background = '#eff6ff'; }}}
                            onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; }}>
                            {opt}
                        </button>
                    )}
                </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 2, fontSize: '0.72rem', color: '#94a3b8' }}>
                <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
                {post.poll_ends_at && (
                    <><span>·</span><span>{expired ? 'Poll ended' : `Closes ${timeAgo(post.poll_ends_at)}`}</span></>
                )}
                {hasVoted && !expired && (
                    <button onClick={() => handleVote(userVote)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'inherit', textDecoration: 'underline' }}>Remove vote</button>
                )}
            </div>
        </div>
    );
};

const Avatar = ({ name, photoUrl, role, size = 40 }) => {
    const meta = ROLE_META[role] || ROLE_META.professional;
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
            background: photoUrl ? 'transparent' : `${meta.color}22`,
            border: `2px solid ${meta.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.38, fontWeight: '800', color: meta.color,
        }}>
            {photoUrl
                ? <img src={photoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (name || 'A').charAt(0).toUpperCase()
            }
        </div>
    );
};

const MediaStrip = ({ media, onOpen }) => {
    if (!media?.length) return null;
    const imgs   = media.filter(m => m.type === 'image');
    const pdfs   = media.filter(m => m.type === 'pdf');
    const videos = media.filter(m => m.type === 'video_link');

    return (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Images — compact grid, max height 450px for single */}
            {imgs.length === 1 && (
                <div onClick={() => onOpen(imgs[0])}
                    style={{ borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#f0f3f7', maxHeight: 450, display: 'flex', justifyContent: 'center', border: '1px solid #e8ecf0' }}>
                    <img src={imgs[0].url} alt=""
                        style={{ maxHeight: 450, maxWidth: '100%', objectFit: 'contain', display: 'block', transition: 'transform 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                    />
                </div>
            )}
            {imgs.length === 2 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, borderRadius: 8, overflow: 'hidden', maxHeight: 180 }}>
                    {imgs.map((m, i) => (
                        <div key={i} onClick={() => onOpen(m)} style={{ cursor: 'pointer', overflow: 'hidden', background: '#f0f3f7', height: 180 }}>
                            <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                            />
                        </div>
                    ))}
                </div>
            )}
            {imgs.length >= 3 && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2, borderRadius: 8, overflow: 'hidden', maxHeight: 180 }}>
                    <div onClick={() => onOpen(imgs[0])} style={{ cursor: 'pointer', overflow: 'hidden', background: '#f0f3f7', height: 180 }}>
                        <img src={imgs[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 2 }}>
                        {imgs.slice(1, 3).map((m, i) => (
                            <div key={i} onClick={() => onOpen(m)} style={{ position: 'relative', cursor: 'pointer', overflow: 'hidden', background: '#f0f3f7' }}>
                                <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s' }}
                                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                />
                                {i === 1 && imgs.length > 3 && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ color: 'white', fontSize: '1rem', fontWeight: '800' }}>+{imgs.length - 3}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Videos — standard 16:9 aspect ratio */}
            {videos.map((m, i) => (
                <div key={i} style={{ borderRadius: 8, overflow: 'hidden', position: 'relative', background: '#000', maxHeight: 450 }}>
                    <div style={{ paddingBottom: '56.25%', position: 'relative' }}>
                        <iframe src={m.url} title="Video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                        />
                    </div>
                </div>
            ))}

            {/* PDFs — compact row */}
            {pdfs.map((m, i) => (
                <button key={i} onClick={() => onOpen(m)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.12s', textAlign: 'left' }}
                    onMouseOver={e => e.currentTarget.style.background = '#ede9fe'}
                    onMouseOut={e => e.currentTarget.style.background = '#f5f3ff'}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={14} color="white" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '700', color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.original_name || 'Document.pdf'}</p>
                        <p style={{ margin: 0, fontSize: '0.68rem', color: '#7c3aed', fontWeight: '600' }}>PDF · Click to view</p>
                    </div>
                    <ExternalLink size={12} color="#7c3aed" />
                </button>
            ))}
        </div>
    );
};

const FeedPost = ({ post, onUpdate, onDelete, onTagClick, compact = false }) => {
    const navigate    = useNavigate();
    const { user }    = useAuth();
    const { showToast } = useToast();

    const [liked,    setLiked]    = useState(!!post.is_liked);
    const [lc,       setLc]       = useState(post.like_count || 0);
    const [saved,    setSaved]    = useState(!!post.is_saved);
    const [menu,     setMenu]     = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [viewer,   setViewer]   = useState(null);
    const [copied,   setCopied]   = useState(false);
    const [likeAnim, setLikeAnim] = useState(false);
    // Typed reactions (non-general post types)
    const [reaction,       setReaction]       = useState(post.user_reaction || null);
    const [reactionCounts, setReactionCounts] = useState(post.reaction_counts || {});
    const [reacting,       setReacting]       = useState(false);

    const isOwner   = user?.id === post.author_id;
    const isFounder = user?.role === 'founding_member';
    const rm        = ROLE_META[post.author_role] || ROLE_META.professional;

    const like = useCallback(async () => {
        if (!user) { navigate('/login'); return; }
        const was = liked;
        setLiked(!was); setLc(c => was ? c - 1 : c + 1);
        if (!was) { setLikeAnim(true); setTimeout(() => setLikeAnim(false), 500); }
        try { await togglePostLike(post.id); }
        catch { setLiked(was); setLc(c => was ? c + 1 : c - 1); }
    }, [liked, user, post.id, navigate]);

    const react = useCallback(async (reactionType) => {
        if (!user) { navigate('/login'); return; }
        if (reacting) return;
        setReacting(true);
        const prev = reaction;
        const prevCounts = { ...reactionCounts };
        // Optimistic update
        const newReaction = prev === reactionType ? null : reactionType;
        const newCounts = { ...reactionCounts };
        if (prev) { newCounts[prev] = Math.max(0, (newCounts[prev] || 1) - 1); }
        if (newReaction) { newCounts[newReaction] = (newCounts[newReaction] || 0) + 1; }
        setReaction(newReaction); setReactionCounts(newCounts);
        try { const res = await togglePostReaction(post.id, reactionType); setReaction(res.data.data.reaction_type); setReactionCounts(res.data.data.reaction_counts); }
        catch { setReaction(prev); setReactionCounts(prevCounts); }
        finally { setReacting(false); }
    }, [reaction, reactionCounts, reacting, user, post.id, navigate]);

    const save = useCallback(async () => {
        if (!user) { navigate('/login'); return; }
        if (saved) {
            setSaved(false);
            try { await unsavePost(post.id); } catch { setSaved(true); }
        } else {
            setSaved(true);
            try { await savePost(post.id); showToast('Saved.', 'success'); }
            catch (e) {
                setSaved(false);
                showToast(e?.response?.data?.code === 'SAVE_LIMIT_REACHED' ? 'Save limit (10) reached.' : getErrorMessage(e) || 'Error', 'error');
            }
        }
    }, [saved, user, post.id, navigate, showToast]);

    const share = useCallback(() => {
        navigator.clipboard?.writeText(`${window.location.origin}/community-qna/${post.id}`)
            .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    }, [post.id]);

    const del = useCallback(async () => {
        if (!window.confirm('Delete this post?')) return;
        setDeleting(true);
        try { await deleteFeedPost(post.id); showToast('Deleted.', 'success'); onDelete?.(post.id); }
        catch (e) { showToast(getErrorMessage(e), 'error'); }
        finally { setDeleting(false); setMenu(false); }
    }, [post.id, onDelete, showToast]);

    const hide = useCallback(async () => {
        try {
            await toggleHidePost(post.id);
            showToast(post.is_hidden ? 'Post visible.' : 'Post hidden.', 'success');
            onUpdate?.({ ...post, is_hidden: post.is_hidden ? 0 : 1 });
        } catch (e) { showToast(getErrorMessage(e), 'error'); }
        finally { setMenu(false); }
    }, [post, onUpdate, showToast]);

    return (
        <>
            <style>{`
                @keyframes upvote-pop {
                    0%   { transform: scale(1) translateY(0); }
                    30%  { transform: scale(1.35) translateY(-2px); }
                    65%  { transform: scale(0.92) translateY(0); }
                    100% { transform: scale(1) translateY(0); }
                }
                @keyframes fadeup { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

                .fp-wrap { padding: 14px 16px; transition: background 0.12s; }
                .fp-wrap:hover { background: #fafbfc; }

                .fp-act {
                    display: inline-flex; align-items: center; gap: 5px;
                    border: 1px solid transparent; background: none; cursor: pointer;
                    font-family: inherit; font-size: 0.79rem; font-weight: 600;
                    color: #5e6e82; padding: 5px 10px; border-radius: 20px;
                    transition: all 0.15s; white-space: nowrap;
                }
                .fp-act:hover { background: #f0f3f7; color: #1a1a2e; border-color: #e2e8f0; }
                .fp-act.upvoted { color: #EA580C; background: #FFF7ED; border-color: #FED7AA; }
                .fp-act.upvoted:hover { background: #FFEDD5; border-color: #FDBA74; }
                .fp-act.saved { color: #7C3AED; background: #F5F3FF; border-color: #DDD6FE; }
                .fp-act.saved:hover { background: #EDE9FE; border-color: #C4B5FD; }
                .fp-act.shared { color: #057642; background: #f0fdf4; border-color: #bbf7d0; }
                .fp-act.poc-active { color: #2563EB; background: #eff6ff; border-color: #bfdbfe; }
                .fp-act.poc-active:hover { background: #dbeafe; border-color: #93c5fd; }
                .fp-act.alt-active { color: #057642; background: #f0fdf4; border-color: #bbf7d0; }
                .fp-act.alt-active:hover { background: #dcfce7; border-color: #86efac; }

                .fp-mi {
                    display: flex; align-items: center; gap: 8px;
                    padding: 7px 10px; font-size: 0.81rem; font-weight: 500;
                    color: #1a1a2e; cursor: pointer; background: none; border: none;
                    width: 100%; text-align: left; font-family: inherit;
                    border-radius: 6px; transition: background 0.1s;
                }
                .fp-mi:hover { background: #f0f3f7; }
                .fp-mi.danger { color: #dc2626; }
                .fp-mi.danger:hover { background: #fff5f5; }

                @media (max-width: 480px) {
                    .fp-wrap { padding: 10px 12px; }
                    .fp-act span.act-label { display: none; }
                    .fp-act { padding: 5px 7px; gap: 4px; font-size: 0.75rem; }
                }
                @media (max-width: 380px) {
                    .fp-wrap { padding: 8px 10px; }
                    .fp-act { padding: 4px 6px; }
                }
            `}</style>

            <article className="fp-wrap" style={{ animation: 'fadeup 0.3s ease both' }}>

                {post.is_hidden ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, padding: '7px 10px', marginBottom: 10, fontSize: '0.76rem', color: '#92400e', fontWeight: '600' }}>
                        <AlertTriangle size={13} /> Hidden by admin — only you can see this post.
                    </div>
                ) : null}

                {/* Author row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <AuthorHoverCard
                        authorId={post.author_id}
                        authorName={post.author_name}
                        authorRole={post.author_role}
                        authorPhoto={post.author_photo}
                        authorOrg={post.author_org}
                        authorBio={post.author_bio}>
                        <Avatar name={post.author_name} photoUrl={post.author_photo} role={post.author_role} size={40} />
                    </AuthorHoverCard>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <AuthorHoverCard
                                authorId={post.author_id}
                                authorName={post.author_name}
                                authorRole={post.author_role}
                                authorPhoto={post.author_photo}
                                authorOrg={post.author_org}
                                authorBio={post.author_bio}>
                                <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1a1a2e', cursor: 'pointer', transition: 'color 0.12s' }}
                                    onMouseOver={e => e.currentTarget.style.color = '#003366'}
                                    onMouseOut={e => e.currentTarget.style.color = '#1a1a2e'}>
                                    {post.author_name}
                                </span>
                            </AuthorHoverCard>
                            <span style={{ fontSize: '0.64rem', fontWeight: '700', padding: '2px 6px', borderRadius: 4, background: rm.bg, color: rm.color, border: `1px solid ${rm.border}` }}>
                                {rm.label}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1, flexWrap: 'wrap' }}>
                            {post.author_org && (
                                <span style={{ fontSize: '0.73rem', color: '#9aaab7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                                    {post.author_org} ·
                                </span>
                            )}
                            <span style={{ fontSize: '0.73rem', color: '#9aaab7' }}>{timeAgo(post.created_at)}</span>
                            {!!post.is_edited ? <span style={{ fontSize: '0.68rem', color: '#c4cdd6', fontStyle: 'italic' }}>· edited</span> : null}
                            {/* Post type badge */}
                            {post.post_type && post.post_type !== 'general' && (() => {
                                const ptm = POST_TYPE_META[post.post_type];
                                return ptm ? (
                                    <span style={{ fontSize: '0.62rem', fontWeight: '700', padding: '1px 7px', borderRadius: 4, background: ptm.bg, color: ptm.color, border: `1px solid ${ptm.border}`, display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 2 }}>
                                        {ptm.Icon && <ptm.Icon size={9} />}{ptm.label}
                                    </span>
                                ) : null;
                            })()}
                        </div>
                    </div>

                    {(isOwner || isFounder) && (
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            <button onClick={() => setMenu(o => !o)}
                                style={{ background: menu ? '#f0f3f7' : 'none', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aaab7', transition: 'all 0.12s' }}
                                onMouseOver={e => e.currentTarget.style.background = '#f0f3f7'}
                                onMouseOut={e => { if (!menu) e.currentTarget.style.background = 'none'; }}>
                                <MoreHorizontal size={16} />
                            </button>
                            {menu && (
                                <>
                                    <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setMenu(false)} />
                                    <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', background: 'white', border: '1px solid #e8ecf0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: 155, zIndex: 99, padding: 4 }}>
                                        {isOwner && (
                                            <button className="fp-mi" onClick={() => { setMenu(false); navigate(`/community-qna/${post.id}?edit=true`); }}>
                                                <Pencil size={13} color="#003366" /> Edit post
                                            </button>
                                        )}
                                        {isFounder && (
                                            <button className="fp-mi" onClick={hide}>
                                                {post.is_hidden
                                                    ? <><Eye size={13} color="#057642" /> Unhide</>
                                                    : <><EyeOff size={13} color="#d97706" /> Hide post</>
                                                }
                                            </button>
                                        )}
                                        <div style={{ height: 1, background: '#f0f3f7', margin: '2px 0' }} />
                                        <button className="fp-mi danger" onClick={del} disabled={deleting}>
                                            <Trash2 size={13} /> {deleting ? 'Deleting…' : 'Delete'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div style={{ marginLeft: 50 }}>
                    {compact && post.content.length > 280
                        ? <p style={{ margin: '0 0 8px', fontSize: '0.875rem', color: '#1a1a2e', lineHeight: '1.65', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {post.content.slice(0, 280)}<span style={{ color: '#9aaab7' }}>… </span>
                            <Link to={`/community-qna/${post.id}`} style={{ color: '#003366', fontWeight: '700', fontSize: '0.8rem', textDecoration: 'none' }}>more</Link>
                          </p>
                        : <p style={{ margin: '0 0 8px', fontSize: '0.875rem', color: '#1a1a2e', lineHeight: '1.65', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {post.content}
                          </p>
                    }

                    <MediaStrip media={post.media} onOpen={setViewer} />

                    {/* Poll block — rendered inline for poll posts */}
                    {post.post_type === 'poll' && (
                        <PollBlock post={post} user={user} navigate={navigate} />
                    )}

                    {/* Event register link */}
                    {post.post_type === 'event' && post.event_link && (
                        <a href={post.event_link} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: '0.78rem', fontWeight: '700', color: '#059669', textDecoration: 'none', border: '1px solid #bbf7d0', background: '#f0fdf4', padding: '5px 12px', borderRadius: 7, transition: 'all 0.15s' }}
                            onMouseOver={e => { e.currentTarget.style.background = '#dcfce7'; }}
                            onMouseOut={e => { e.currentTarget.style.background = '#f0fdf4'; }}>
                            <ExternalLink size={12} /> View event page
                        </a>
                    )}

                    {post.tags?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                            {post.tags.map(tag => (
                                <button key={tag} onClick={() => onTagClick?.(tag)}
                                    style={{ display: 'inline-flex', alignItems: 'center', background: '#eef2ff', color: '#003366', border: 'none', borderRadius: 4, fontSize: '0.71rem', fontWeight: '700', padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.12s' }}
                                    onMouseOver={e => e.currentTarget.style.background = '#e0e9ff'}
                                    onMouseOut={e => e.currentTarget.style.background = '#eef2ff'}>
                                    #{tag}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Action bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, marginLeft: -6, flexWrap: 'wrap' }}>

                        {/* ── Type-specific primary actions ── */}
                        {post.post_type === 'ai_product' && (<>
                            <button className={`fp-act${reaction==='org_interest'?' upvoted':''}`} onClick={() => react('org_interest')} disabled={reacting} title="Relevant to Our Organization">
                                <Building2 size={14} fill={reaction==='org_interest'?'#EA580C':'none'} color={reaction==='org_interest'?'#EA580C':'currentColor'} />
                                {(reactionCounts.org_interest||0) > 0 && <span style={{fontVariantNumeric:'tabular-nums'}}>{reactionCounts.org_interest}</span>}
                                <span className="act-label">Org Relevant</span>
                            </button>
                            <button className={`fp-act${reaction==='request_poc'?' poc-active':''}`} onClick={() => react('request_poc')} disabled={reacting} title="Request a Proof of Concept">
                                <FlaskConical size={14} fill={reaction==='request_poc'?'#2563EB':'none'} color={reaction==='request_poc'?'#2563EB':'currentColor'} />
                                {(reactionCounts.request_poc||0) > 0 && <span style={{fontVariantNumeric:'tabular-nums'}}>{reactionCounts.request_poc}</span>}
                                <span className="act-label">Need a POC</span>
                            </button>
                            <button className={`fp-act${reaction==='have_alternative'?' alt-active':''}`} onClick={() => react('have_alternative')} disabled={reacting} title="We Already Have Alternative Products">
                                <ShieldCheck size={14} fill={reaction==='have_alternative'?'#057642':'none'} color={reaction==='have_alternative'?'#057642':'currentColor'} />
                                {(reactionCounts.have_alternative||0) > 0 && <span style={{fontVariantNumeric:'tabular-nums'}}>{reactionCounts.have_alternative}</span>}
                                <span className="act-label">Have Alternative</span>
                            </button>
                        </>)}

                        {post.post_type === 'event' && (
                            <button className={`fp-act${reaction==='attending'?' upvoted':''}`} onClick={() => react('attending')} disabled={reacting} title="Mark yourself as attending">
                                <CalendarCheck size={14} fill={reaction==='attending'?'#EA580C':'none'} color={reaction==='attending'?'#EA580C':'currentColor'} />
                                {(reactionCounts.attending||0) > 0 && <span style={{fontVariantNumeric:'tabular-nums'}}>{reactionCounts.attending}</span>}
                                <span className="act-label">Attending</span>
                            </button>
                        )}

                        {post.post_type === 'troubleshooting' && (<>
                            <button className={`fp-act${reaction==='faced_this'?' upvoted':''}`} onClick={() => react('faced_this')} disabled={reacting} title="We Face This Too">
                                <Users size={14} fill={reaction==='faced_this'?'#EA580C':'none'} color={reaction==='faced_this'?'#EA580C':'currentColor'} />
                                {(reactionCounts.faced_this||0) > 0 && <span style={{fontVariantNumeric:'tabular-nums'}}>{reactionCounts.faced_this}</span>}
                                <span className="act-label">Face This Too</span>
                            </button>
                            <Link to={`/community-qna/${post.id}#comments`} style={{ textDecoration: 'none' }}>
                                <button className="fp-act" title="Share your experience in the discussion">
                                    <MessageSquare size={14} color="currentColor" />
                                    {post.comment_count > 0 && <span style={{ fontVariantNumeric: 'tabular-nums' }}>{post.comment_count}</span>}
                                    <span className="act-label">Share Experience</span>
                                </button>
                            </Link>
                        </>)}

                        {/* General & poll: Helpful (uses existing like system) */}
                        {(!post.post_type || post.post_type === 'general' || post.post_type === 'poll') && (
                            <button className={`fp-act${liked?' upvoted':''}`} onClick={like}>
                                <ThumbsUp size={14} style={{ animation: likeAnim?'upvote-pop 0.5s ease':'none', transition:'all 0.15s' }} fill={liked?'#EA580C':'none'} color={liked?'#EA580C':'currentColor'} />
                                {lc > 0 && <span style={{fontVariantNumeric:'tabular-nums'}}>{lc}</span>}
                                <span className="act-label">{liked ? 'Helpful' : 'Helpful'}</span>
                            </button>
                        )}

                        {/* Discuss — hidden for troubleshooting since "Share Experience" covers it */}
                        {post.post_type !== 'troubleshooting' && (
                            <Link to={`/community-qna/${post.id}#comments`} style={{ textDecoration: 'none' }}>
                                <button className="fp-act">
                                    <MessageSquare size={14} color="currentColor" />
                                    {post.comment_count > 0 && <span style={{ fontVariantNumeric: 'tabular-nums' }}>{post.comment_count}</span>}
                                    <span className="act-label">Discuss</span>
                                </button>
                            </Link>
                        )}

                        {/* Save */}
                        <button className={`fp-act${saved ? ' saved' : ''}`} onClick={save}>
                            {saved
                                ? <BookmarkCheck size={14} color="#7C3AED" fill="#7C3AED" />
                                : <Bookmark size={14} color="currentColor" />
                            }
                            <span className="act-label">{saved ? 'Saved' : 'Save'}</span>
                        </button>

                        {/* Share */}
                        <button className={`fp-act${copied ? ' shared' : ''}`} onClick={share}>
                            {copied
                                ? <><Check size={13} color="#057642" /><span className="act-label" style={{ color: '#057642' }}>Copied!</span></>
                                : <><Share2 size={13} color="currentColor" /><span className="act-label">Share</span></>
                            }
                        </button>

                        {compact && (
                            <Link to={`/community-qna/${post.id}`} style={{ marginLeft: 'auto', textDecoration: 'none' }}>
                                <button className="fp-act" style={{ color: '#003366', fontWeight: '700' }}>Open →</button>
                            </Link>
                        )}
                    </div>
                </div>
            </article>

            {viewer && <MediaViewer item={viewer} onClose={() => setViewer(null)} />}
        </>
    );
};

export default FeedPost;