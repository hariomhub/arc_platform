import React, { useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ThumbsUp, MessageSquare, Bookmark, BookmarkCheck,
    Share2, MoreHorizontal, Pencil, Trash2, EyeOff, Eye,
    AlertTriangle, ExternalLink, FileText, Check,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { togglePostLike, savePost, unsavePost, deleteFeedPost, toggleHidePost } from '../../api/feed.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';
import { timeAgo } from '../../utils/dateFormatter.js';
import AuthorHoverCard from './AuthorHoverCard.jsx';
import MediaViewer from './MediaViewer.jsx';

const ROLE_META = {
    founding_member: { label: 'Founder',        color: '#7C3AED', bg: '#f5f3ff', border: '#ddd6fe' },
    council_member:  { label: 'Council Member', color: '#0369a1', bg: '#eff6ff', border: '#bfdbfe' },
    professional:    { label: 'Professional',   color: '#057642', bg: '#f0fdf4', border: '#bbf7d0' },
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
                    .fp-act span.act-label { display: none; }
                    .fp-act { padding: 5px 8px; }
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

                        {/* Upvote */}
                        <button className={`fp-act${liked ? ' upvoted' : ''}`} onClick={like}>
                            <ThumbsUp
                                size={14}
                                style={{ animation: likeAnim ? 'upvote-pop 0.5s ease' : 'none', transition: 'all 0.15s' }}
                                fill={liked ? '#EA580C' : 'none'}
                                color={liked ? '#EA580C' : 'currentColor'}
                            />
                            {lc > 0 && <span style={{ fontVariantNumeric: 'tabular-nums' }}>{lc}</span>}
                            <span className="act-label">{liked ? 'Upvoted' : 'Upvote'}</span>
                        </button>

                        {/* Discuss */}
                        <Link to={`/community-qna/${post.id}#comments`} style={{ textDecoration: 'none' }}>
                            <button className="fp-act">
                                <MessageSquare size={14} color="currentColor" />
                                {post.comment_count > 0 && <span style={{ fontVariantNumeric: 'tabular-nums' }}>{post.comment_count}</span>}
                                <span className="act-label">Discuss</span>
                            </button>
                        </Link>

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