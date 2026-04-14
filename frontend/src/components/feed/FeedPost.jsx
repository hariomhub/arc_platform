import React, { useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Heart, MessageCircle, Bookmark, BookmarkCheck,
    Share2, MoreHorizontal, Pencil, Trash2, EyeOff, Eye,
    AlertTriangle, ExternalLink, FileText, Check, Copy,
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
    professional:    { label: 'Professional',   color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
};

const Avatar = ({ name, photoUrl, role, size = 44 }) => {
    const meta = ROLE_META[role] || ROLE_META.professional;
    return (
        <div style={{ width:size, height:size, borderRadius:'50%', flexShrink:0, overflow:'hidden',
            background: photoUrl ? 'transparent' : `linear-gradient(135deg,${meta.color}e0,${meta.color}80)`,
            border:`2.5px solid ${meta.border}`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:size*0.38, fontWeight:'800', color:'white',
            boxShadow:`0 0 0 3px ${meta.bg}`,
        }}>
            {photoUrl
                ? <img src={photoUrl} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : (name||'A').charAt(0).toUpperCase()
            }
        </div>
    );
};

const MediaStrip = ({ media, onMediaClick }) => {
    if (!media?.length) return null;
    const images = media.filter(m => m.type === 'image');
    const pdfs   = media.filter(m => m.type === 'pdf');
    const videos = media.filter(m => m.type === 'video_link');

    return (
        <div style={{ marginTop:'1rem', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {images.length === 1 && (
                <div onClick={() => onMediaClick(images[0])}
                    style={{ borderRadius:'14px', overflow:'hidden', background:'#f8fafc', cursor:'pointer', display:'flex', justifyContent:'center', border: '1px solid rgba(0,51,102,0.08)' }}>
                    <img src={images[0].url} alt="" 
                        style={{ maxHeight:'500px', maxWidth:'100%', objectFit:'contain', transition:'transform 0.3s ease' }}
                        onMouseOver={e => e.currentTarget.style.transform='scale(1.02)'}
                        onMouseOut={e => e.currentTarget.style.transform='scale(1)'}
                    />
                </div>
            )}
            {images.length > 1 && (
                <div style={{ display:'grid', gap:'3px', borderRadius:'14px', overflow:'hidden',
                    gridTemplateColumns: images.length === 2 ? '1fr 1fr' : '2fr 1fr',
                }}>
                    {images.slice(0,3).map((m,i) => (
                        <div key={m.id||i} onClick={() => onMediaClick(m)}
                            style={{ position:'relative', paddingBottom: '65%', cursor:'pointer', overflow:'hidden', background:'#f1f5f9', gridRow: images.length===3&&i===0 ? 'span 2' : 'auto', height: images.length===3&&i===0 ? '100%' : 'auto' }}>
                            <img src={m.url} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.3s ease' }}
                                onMouseOver={e => e.currentTarget.style.transform='scale(1.04)'}
                                onMouseOut={e => e.currentTarget.style.transform='scale(1)'}
                            />
                            {i===2 && images.length>3 && (
                                <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                    <span style={{ color:'white', fontSize:'1.4rem', fontWeight:'800', fontFamily:"'Sora',sans-serif" }}>+{images.length-3}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {videos.map((m,i) => (
                <div key={m.id||i} style={{ borderRadius:'14px', overflow:'hidden', background:'#000', position:'relative', paddingBottom:'56.25%', boxShadow:'0 4px 16px rgba(0,0,0,0.15)' }}>
                    <iframe src={m.url} title="Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                        style={{ position:'absolute', inset:0, width:'100%', height:'100%', border:'none' }} />
                </div>
            ))}

            {pdfs.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                    {pdfs.map((m,i) => (
                        <button key={m.id||i} onClick={() => onMediaClick(m)}
                            style={{ display:'flex', alignItems:'center', gap:'12px', background:'linear-gradient(135deg,#faf5ff,#f5f3ff)', border:'1px solid #ddd6fe', borderRadius:'12px', padding:'0.75rem 1rem', cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s', textAlign:'left' }}
                            onMouseOver={e => { e.currentTarget.style.background='linear-gradient(135deg,#f5f3ff,#ede9fe)'; e.currentTarget.style.borderColor='#c4b5fd'; e.currentTarget.style.transform='translateX(2px)'; }}
                            onMouseOut={e => { e.currentTarget.style.background='linear-gradient(135deg,#faf5ff,#f5f3ff)'; e.currentTarget.style.borderColor='#ddd6fe'; e.currentTarget.style.transform='none'; }}>
                            <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#7C3AED', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                <FileText size={17} color="white" />
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                                <p style={{ margin:0, fontSize:'0.84rem', fontWeight:'700', color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.original_name||'Document.pdf'}</p>
                                <p style={{ margin:0, fontSize:'0.7rem', color:'#7C3AED', fontWeight:'600' }}>PDF · Click to view</p>
                            </div>
                            <ExternalLink size={14} color="#7C3AED" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const FeedPost = ({ post, onUpdate, onDelete, onTagClick, compact = false }) => {
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const { showToast } = useToast();

    const [liked,       setLiked]       = useState(!!post.is_liked);
    const [likeCount,   setLikeCount]   = useState(post.like_count || 0);
    const [saved,       setSaved]       = useState(!!post.is_saved);
    const [saveCount,   setSaveCount]   = useState(post.save_count || 0);
    const [menuOpen,    setMenuOpen]    = useState(false);
    const [deleting,    setDeleting]    = useState(false);
    const [mediaViewer, setMediaViewer] = useState(null);
    const [copied,      setCopied]      = useState(false);
    const [likeAnim,    setLikeAnim]    = useState(false);
    const [isHovered,   setIsHovered]   = useState(false);

    const isOwner  = user?.id === post.author_id;
    const isFounder = user?.role === 'founding_member';
    const showMenu = isOwner || isFounder;
    const roleMeta = ROLE_META[post.author_role] || ROLE_META.professional;

    const handleLike = useCallback(async () => {
        if (!user) { navigate('/login'); return; }
        const was = liked;
        setLiked(!was); setLikeCount(c => was ? c-1 : c+1);
        if (!was) { setLikeAnim(true); setTimeout(() => setLikeAnim(false), 700); }
        try { await togglePostLike(post.id); }
        catch { setLiked(was); setLikeCount(c => was ? c+1 : c-1); }
    }, [liked, user, post.id, navigate]);

    const handleSave = useCallback(async () => {
        if (!user) { navigate('/login'); return; }
        if (saved) {
            setSaved(false); setSaveCount(c => c-1);
            try { await unsavePost(post.id); }
            catch { setSaved(true); setSaveCount(c => c+1); }
        } else {
            setSaved(true); setSaveCount(c => c+1);
            try {
                await savePost(post.id);
                showToast('Saved to your profile.', 'success');
            } catch(err) {
                setSaved(false); setSaveCount(c => c-1);
                if (err?.response?.data?.code === 'SAVE_LIMIT_REACHED') {
                    showToast('Save limit reached (10). Remove one from your profile first.', 'error');
                } else {
                    showToast(getErrorMessage(err) || 'Could not save.', 'error');
                }
            }
        }
    }, [saved, user, post.id, navigate, showToast]);

    const handleShare = useCallback(() => {
        const url = `${window.location.origin}/community-qna/${post.id}`;
        navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    }, [post.id]);

    const handleDelete = useCallback(async () => {
        if (!window.confirm('Delete this post? This cannot be undone.')) return;
        setDeleting(true);
        try { await deleteFeedPost(post.id); showToast('Post deleted.', 'success'); if (onDelete) onDelete(post.id); }
        catch(err) { showToast(getErrorMessage(err), 'error'); }
        finally { setDeleting(false); setMenuOpen(false); }
    }, [post.id, onDelete, showToast]);

    const handleHide = useCallback(async () => {
        try {
            await toggleHidePost(post.id);
            showToast(post.is_hidden ? 'Post is now visible.' : 'Post hidden.', 'success');
            if (onUpdate) onUpdate({ ...post, is_hidden: post.is_hidden ? 0 : 1 });
        } catch(err) { showToast(getErrorMessage(err), 'error'); }
        finally { setMenuOpen(false); }
    }, [post, onUpdate, showToast]);

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&display=swap');

                @keyframes fp-heart-pop {
                    0%   { transform: scale(1); }
                    25%  { transform: scale(1.5) rotate(-10deg); }
                    50%  { transform: scale(0.85); }
                    75%  { transform: scale(1.15); }
                    100% { transform: scale(1); }
                }
                @keyframes fp-rise {
                    from { opacity:0; transform:translateY(8px); }
                    to   { opacity:1; transform:translateY(0); }
                }

                .fp-card {
                    background: white;
                    border-radius: 20px;
                    border: 1px solid rgba(0,51,102,0.08);
                    overflow: visible;
                    transition: box-shadow 0.25s ease, transform 0.2s ease, border-color 0.2s;
                    animation: fp-rise 0.35s ease both;
                    position: relative;
                }
                .fp-card:hover {
                    box-shadow: 0 12px 40px rgba(0,51,102,0.1);
                    border-color: rgba(0,51,102,0.15);
                    transform: translateY(-2px);
                }

                .fp-action {
                    display: inline-flex; align-items: center; gap: 6px;
                    background: none; border: none; cursor: pointer;
                    font-family: inherit; font-size: 0.82rem; font-weight: 600;
                    color: #64748b; padding: 7px 12px; border-radius: 10px;
                    transition: all 0.15s; white-space: nowrap;
                }
                .fp-action:hover { background: #f1f5f9; color: #1e293b; }
                .fp-action.fp-liked { color: #e11d48; }
                .fp-action.fp-liked:hover { background: #fff1f2; }
                .fp-action.fp-saved { color: #0369a1; }
                .fp-action.fp-saved:hover { background: #eff6ff; }
                .fp-action.fp-shared { color: #059669; }

                .fp-menu-item {
                    display: flex; align-items: center; gap: 9px;
                    padding: 0.65rem 1rem; font-size: 0.84rem; font-weight: 500;
                    color: #374151; cursor: pointer; background: none; border: none;
                    width: 100%; text-align: left; font-family: inherit;
                    transition: background 0.1s; border-radius: 8px; margin: 1px 0;
                }
                .fp-menu-item:hover { background: #f8fafc; color: #003366; }
                .fp-menu-danger { color: #DC2626 !important; }
                .fp-menu-danger:hover { background: #fff1f2 !important; }

                .fp-tag {
                    display: inline-flex; align-items: center;
                    border-radius: 100px; font-size: 0.71rem; font-weight: 700;
                    padding: 3px 10px; cursor: pointer; transition: all 0.15s;
                    text-transform: lowercase; letter-spacing: 0.01em;
                }
                .fp-tag:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            `}</style>

            <article className="fp-card" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>

                {/* Hidden banner */}
                {post.is_hidden && (
                    <div style={{ background:'linear-gradient(90deg,#fffbeb,#fef3c7)', borderBottom:'1px solid #fde68a', padding:'0.65rem 1.5rem', display:'flex', alignItems:'center', gap:'8px', borderRadius:'20px 20px 0 0' }}>
                        <AlertTriangle size={14} color="#D97706" />
                        <p style={{ margin:0, fontSize:'0.78rem', color:'#92400e', fontWeight:'600' }}>
                            This post has been hidden by an administrator — only visible to you.
                        </p>
                    </div>
                )}

                <div style={{ padding: compact ? '1.25rem 1.5rem' : '1.75rem' }}>

                    {/* Header */}
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'1rem', gap:'0.75rem' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'12px', minWidth:0, flex:1 }}>
                            <AuthorHoverCard authorId={post.author_id} authorName={post.author_name} authorRole={post.author_role} authorPhoto={post.author_photo} authorOrg={post.author_org} authorBio={post.author_bio}>
                                <Avatar name={post.author_name} photoUrl={post.author_photo} role={post.author_role} size={46} />
                            </AuthorHoverCard>

                            <div style={{ minWidth:0 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'7px', flexWrap:'wrap', marginBottom:'3px' }}>
                                    <AuthorHoverCard authorId={post.author_id} authorName={post.author_name} authorRole={post.author_role} authorPhoto={post.author_photo} authorOrg={post.author_org} authorBio={post.author_bio}>
                                        <span style={{ fontFamily:"'Sora',sans-serif", fontSize:'0.92rem', fontWeight:'700', color:'#0f172a', cursor:'pointer', transition:'color 0.12s' }}
                                            onMouseOver={e => e.currentTarget.style.color='#003366'}
                                            onMouseOut={e => e.currentTarget.style.color='#0f172a'}>
                                            {post.author_name}
                                        </span>
                                    </AuthorHoverCard>
                                    <span style={{ fontSize:'0.64rem', fontWeight:'800', padding:'2px 8px', borderRadius:'100px', background:roleMeta.bg, color:roleMeta.color, border:`1px solid ${roleMeta.border}`, textTransform:'uppercase', letterSpacing:'0.06em', flexShrink:0 }}>
                                        {roleMeta.label}
                                    </span>
                                </div>
                                <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                                    {post.author_org && <span style={{ fontSize:'0.74rem', color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'140px' }}>{post.author_org}</span>}
                                    {post.author_org && <span style={{ color:'#cbd5e1', fontSize:'0.7rem' }}>·</span>}
                                    <span style={{ fontSize:'0.74rem', color:'#94a3b8', whiteSpace:'nowrap' }}>{timeAgo(post.created_at)}</span>
                                    {post.is_edited && <span style={{ fontSize:'0.67rem', color:'#cbd5e1', fontStyle:'italic' }}>· edited</span>}
                                </div>
                            </div>
                        </div>

                        {showMenu && (
                            <div style={{ position:'relative', flexShrink:0 }}>
                                <button onClick={() => setMenuOpen(o => !o)}
                                    style={{ background:menuOpen?'#f1f5f9':'none', border:'none', borderRadius:'10px', padding:'6px 7px', cursor:'pointer', display:'flex', color:'#94a3b8', transition:'all 0.12s' }}
                                    onMouseOver={e => e.currentTarget.style.background='#f1f5f9'}
                                    onMouseOut={e => { if(!menuOpen) e.currentTarget.style.background='none'; }}>
                                    <MoreHorizontal size={18} />
                                </button>
                                {menuOpen && (
                                    <>
                                        <div style={{ position:'fixed', inset:0, zIndex:98 }} onClick={() => setMenuOpen(false)} />
                                        <div style={{ position:'absolute', right:0, top:'calc(100% + 6px)', background:'white', border:'1px solid rgba(0,51,102,0.1)', borderRadius:'14px', boxShadow:'0 12px 40px rgba(0,51,102,0.12)', minWidth:'170px', zIndex:99, padding:'5px', overflow:'hidden' }}>
                                            {isOwner && (
                                                <button className="fp-menu-item" onClick={() => { setMenuOpen(false); navigate(`/community-qna/${post.id}?edit=true`); }}>
                                                    <Pencil size={14} color="#003366" /> Edit post
                                                </button>
                                            )}
                                            {isFounder && (
                                                <button className="fp-menu-item" onClick={handleHide}>
                                                    {post.is_hidden ? <><Eye size={14} color="#059669" /> Unhide</> : <><EyeOff size={14} color="#D97706" /> Hide post</>}
                                                </button>
                                            )}
                                            <div style={{ height:'1px', background:'#f1f5f9', margin:'3px 0' }} />
                                            <button className="fp-menu-item fp-menu-danger" onClick={handleDelete} disabled={deleting}>
                                                <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div style={{ marginBottom: post.tags?.length || post.media?.length ? '0' : '0' }}>
                        {compact && post.content.length > 300 ? (
                            <p style={{ margin:0, fontSize:'0.925rem', color:'#1e293b', lineHeight:'1.75', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                                {post.content.slice(0, 300)}
                                <span style={{ color:'#94a3b8' }}>… </span>
                                <Link to={`/community-qna/${post.id}`} style={{ color:'#0369a1', fontWeight:'700', fontSize:'0.84rem', textDecoration:'none' }}>Read more</Link>
                            </p>
                        ) : (
                            <p style={{ margin:0, fontSize:'0.925rem', color:'#1e293b', lineHeight:'1.75', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                                {post.content}
                            </p>
                        )}
                    </div>

                    <MediaStrip media={post.media} onMediaClick={setMediaViewer} />

                    {/* Tags */}
                    {post.tags?.length > 0 && (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginTop:'1rem' }}>
                            {post.tags.map((tag, i) => (
                                <button key={tag} className="fp-tag" onClick={() => onTagClick?.(tag)}
                                    style={{ background: i%3===0?'#eff6ff':i%3===1?'#f0fdf4':'#fffbeb', color: i%3===0?'#1d4ed8':i%3===1?'#059669':'#d97706', border:`1px solid ${i%3===0?'#bfdbfe':i%3===1?'#bbf7d0':'#fde68a'}` }}>
                                    #{tag}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Divider */}
                    <div style={{ height:'1px', background:'linear-gradient(90deg,transparent,rgba(0,51,102,0.08),transparent)', margin:'1rem 0 0.75rem' }} />

                    {/* Action bar */}
                    <div style={{ display:'flex', alignItems:'center', gap:'2px', flexWrap:'wrap' }}>

                        {/* Like */}
                        <button className={`fp-action${liked?' fp-liked':''}`} onClick={handleLike} title={!user?'Sign in to like':''}>
                            <Heart size={16}
                                style={{ animation:likeAnim?'fp-heart-pop 0.7s ease':'none', fill:liked?'#e11d48':'none', transition:'fill 0.15s' }}
                                color={liked?'#e11d48':'#64748b'}
                            />
                            <span>{likeCount > 0 ? likeCount : ''}</span>
                            <span style={{ color:liked?'#e11d48':'#64748b' }}>{liked ? 'Liked' : 'Like'}</span>
                        </button>

                        {/* Comment */}
                        <Link to={`/community-qna/${post.id}#comments`} style={{ textDecoration:'none' }}>
                            <button className="fp-action">
                                <MessageCircle size={16} color="#64748b" />
                                {post.comment_count > 0 && <span>{post.comment_count}</span>}
                                <span>Comment</span>
                            </button>
                        </Link>

                        {/* Save */}
                        <button className={`fp-action${saved?' fp-saved':''}`} onClick={handleSave} title={!user?'Sign in to save':''}>
                            {saved
                                ? <BookmarkCheck size={16} color="#0369a1" fill="#0369a1" />
                                : <Bookmark size={16} color="#64748b" />
                            }
                            <span>{saved ? 'Saved' : 'Save'}</span>
                        </button>

                        {/* Share */}
                        <button className={`fp-action${copied?' fp-shared':''}`} onClick={handleShare}>
                            {copied ? <><Check size={15} color="#059669" /><span style={{ color:'#059669' }}>Copied!</span></> : <><Share2 size={15} /><span>Share</span></>}
                        </button>

                        {compact && (
                            <Link to={`/community-qna/${post.id}`} style={{ marginLeft:'auto', textDecoration:'none' }}>
                                <button className="fp-action" style={{ color:'#0369a1', fontWeight:'700' }}>
                                    View post →
                                </button>
                            </Link>
                        )}
                    </div>
                </div>
            </article>

            {mediaViewer && <MediaViewer item={mediaViewer} onClose={() => setMediaViewer(null)} />}
        </>
    );
};

export default FeedPost;