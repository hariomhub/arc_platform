import React, { useState, useRef, useCallback } from 'react';
import { Image, FileText, Youtube, Tag, X, Send, Loader2, AlertCircle, Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { createFeedPost } from '../../api/feed.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';

const MAX_CHARS = 5000;
const MAX_MEDIA = 5;
const MAX_TAGS  = 5;

const ROLE_META = {
    founding_member: { color:'#7C3AED', label:'Founding Member' },
    council_member:  { color:'#003366', label:'Council Member'  },
    professional:    { color:'#059669', label:'Professional'    },
};

const FilePreview = ({ file, onRemove }) => {
    const isImage = file.type.startsWith('image/');
    const [src] = useState(() => isImage ? URL.createObjectURL(file) : null);
    return (
        <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{ width:'68px', height:'68px', borderRadius:'12px', overflow:'hidden', border:'1.5px solid #e2e8f0', background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'4px' }}>
                {isImage
                    ? <img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : <><FileText size={22} color="#7C3AED" /><span style={{ fontSize:'0.6rem', color:'#7C3AED', fontWeight:'800' }}>PDF</span></>
                }
            </div>
            <button onClick={() => onRemove(file)}
                style={{ position:'absolute', top:'-6px', right:'-6px', width:'19px', height:'19px', borderRadius:'50%', background:'#1e293b', border:'2px solid white', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, transition:'background 0.12s' }}
                onMouseOver={e => e.currentTarget.style.background='#DC2626'}
                onMouseOut={e => e.currentTarget.style.background='#1e293b'}>
                <X size={10} color="white" />
            </button>
        </div>
    );
};

const CreatePost = ({ onPostCreated }) => {
    const { user }      = useAuth();
    const { showToast } = useToast();
    const [expanded,   setExpanded]   = useState(false);
    const [content,    setContent]    = useState('');
    const [files,      setFiles]      = useState([]);
    const [videoUrl,   setVideoUrl]   = useState('');
    const [showVideo,  setShowVideo]  = useState(false);
    const [tagInput,   setTagInput]   = useState('');
    const [tags,       setTags]       = useState([]);
    const [showTags,   setShowTags]   = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error,      setError]      = useState('');
    const fileRef  = useRef(null);
    const textRef  = useRef(null);
    const roleMeta = ROLE_META[user?.role] || ROLE_META.professional;
    const mediaCount = files.length + (videoUrl ? 1 : 0);
    const charsLeft  = MAX_CHARS - content.length;
    const canSubmit  = content.trim().length > 0 && !submitting;

    const handleFiles = useCallback(e => {
        const allowed = ['image/jpeg','image/png','image/gif','image/webp','application/pdf'];
        const valid   = Array.from(e.target.files||[]).filter(f => allowed.includes(f.type));
        const slots   = MAX_MEDIA - mediaCount;
        setFiles(prev => [...prev, ...valid.slice(0, slots)]);
        e.target.value = '';
    }, [mediaCount]);

    const addTag = useCallback(() => {
        const clean = tagInput.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-_]/g,'').slice(0,30);
        if (!clean || tags.includes(clean) || tags.length >= MAX_TAGS) return;
        setTags(prev => [...prev, clean]);
        setTagInput('');
    }, [tagInput, tags]);

    const handleSubmit = async e => {
        e.preventDefault();
        if (!canSubmit) return;
        setError(''); setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('content', content.trim());
            if (tags.length)    fd.append('tags', JSON.stringify(tags));
            if (videoUrl.trim()) fd.append('video_url', videoUrl.trim());
            files.forEach(f => fd.append('media', f));
            const res = await createFeedPost(fd);
            setContent(''); setFiles([]); setVideoUrl(''); setTags([]);
            setTagInput(''); setShowVideo(false); setShowTags(false); setExpanded(false);
            showToast('Post published!', 'success');
            if (onPostCreated) onPostCreated(res.data?.data);
        } catch(err) {
            setError(getErrorMessage(err) || 'Failed to publish. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&display=swap');
                @keyframes cp-expand { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

                .cp-wrap {
                    background: white;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                    transition: box-shadow 0.15s, border-color 0.15s;
                }
                .cp-wrap:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.04); border-color: #cbd5e1; }

                .cp-trigger {
                    display: flex; align-items: center; gap: 12px;
                    padding: 0.875rem 1rem; cursor: pointer;
                    transition: background 0.15s;
                }
                .cp-trigger:hover { background: #f8fafc; }

                .cp-input-pill {
                    flex: 1;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 68px;
                    padding: 0.6rem 1rem;
                    font-size: 0.85rem;
                    color: #64748b;
                    user-select: none;
                    transition: all 0.15s;
                    font-family: inherit;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .cp-trigger:hover .cp-input-pill {
                    background: white;
                    border-color: #cbd5e1;
                    color: #475569;
                }

                @media (max-width: 480px) {
                    .cp-input-pill { padding: 0.5rem 0.75rem; font-size: 0.75rem; }
                    .cp-trigger { gap: 8px; padding: 0.75rem 0.8rem; }
                    .cp-post-btn-collapsed span.btn-text { display: none; }
                }

                .cp-post-btn-collapsed {
                    display: inline-flex; align-items: center; gap: 6px;
                    background: #003366;
                    color: white; border: none; border-radius: 6px;
                    padding: 0.5rem 0.875rem; font-weight: 600; font-size: 0.8rem;
                    cursor: pointer; font-family: inherit; flex-shrink: 0;
                    transition: background 0.15s;
                }
                .cp-post-btn-collapsed:hover {
                    background: #002244;
                }

                .cp-expanded { animation: cp-expand 0.2s ease; }

                .cp-toolbar-btn {
                    display: inline-flex; align-items: center; gap: 5px;
                    border: 1px solid transparent; border-radius: 6px;
                    padding: 5px 10px; background: transparent;
                    font-size: 0.78rem; font-weight: 600; color: #475569;
                    cursor: pointer; font-family: inherit; transition: background 0.1s;
                    white-space: nowrap;
                }
                .cp-toolbar-btn:hover { background: #f1f5f9; color: #003366; }
                .cp-toolbar-btn.active { background: #eff6ff; color: #1d4ed8; }
                .cp-toolbar-btn:disabled { opacity: 0.5; cursor: not-allowed; }

                .cp-submit-btn {
                    display: inline-flex; align-items: center; gap: 6px;
                    background: #003366;
                    color: white; border: none; border-radius: 6px;
                    padding: 0.6rem 1.25rem; font-weight: 600; font-size: 0.85rem;
                    cursor: pointer; font-family: inherit;
                    transition: background 0.15s;
                }
                .cp-submit-btn:hover:not(:disabled) {
                    background: #002244;
                }
                .cp-submit-btn:disabled { background: #94a3b8; cursor: not-allowed; }
            `}</style>

            <div className="cp-wrap">
                {!expanded ? (
                    <div className="cp-trigger" onClick={() => { setExpanded(true); setTimeout(() => textRef.current?.focus(), 60); }}>
                        {/* Avatar */}
                        <div style={{ width:'44px', height:'44px', borderRadius:'50%', flexShrink:0, background:`linear-gradient(135deg,${roleMeta.color}e0,${roleMeta.color}80)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', fontWeight:'800', color:'white', border:`2px solid ${roleMeta.color}30`, boxShadow:`0 0 0 3px ${roleMeta.color}12` }}>
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        {/* Pill */}
                        <div className="cp-input-pill">
                            Share your knowledge with the community…
                        </div>
                        {/* Post button */}
                        <button className="cp-post-btn-collapsed" onClick={e => { e.stopPropagation(); setExpanded(true); setTimeout(() => textRef.current?.focus(), 60); }}>
                            <Plus size={14} /> <span className="btn-text">New Post</span>
                        </button>
                    </div>
                ) : (
                    <form className="cp-expanded" onSubmit={handleSubmit}>

                        {/* Top bar with accent */}
                        <div style={{ height:'3px', background:`linear-gradient(90deg,${roleMeta.color},${roleMeta.color}60,transparent)` }} />

                        {/* Author row */}
                        <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'1rem 1.5rem', borderBottom:'1px solid #f1f5f9' }}>
                            <div style={{ width:'36px', height:'36px', borderRadius:'50%', flexShrink:0, background:`linear-gradient(135deg,${roleMeta.color}dd,${roleMeta.color}80)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.85rem', fontWeight:'800', color:'white' }}>
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p style={{ margin:0, fontFamily:"'Sora',sans-serif", fontSize:'0.875rem', fontWeight:'600', color:'#0f172a' }}>{user?.name}</p>
                                <span style={{ fontSize:'0.65rem', fontWeight:'700', color:'#64748b' }}>
                                    {roleMeta.label}
                                </span>
                            </div>
                            <button type="button" onClick={() => { setExpanded(false); setContent(''); setFiles([]); setVideoUrl(''); setTags([]); setError(''); }}
                                style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:'5px', borderRadius:'8px', display:'flex', transition:'all 0.12s' }}
                                onMouseOver={e => { e.currentTarget.style.background='#f1f5f9'; e.currentTarget.style.color='#1e293b'; }}
                                onMouseOut={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='#94a3b8'; }}>
                                <X size={17} />
                            </button>
                        </div>

                        {/* Textarea */}
                        <div style={{ padding:'1rem 1.5rem 0.25rem' }}>
                            <textarea
                                ref={textRef}
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="What insights, research, or perspectives do you want to share with the AI risk community?"
                                maxLength={MAX_CHARS}
                                rows={5}
                                disabled={submitting}
                                style={{ width:'100%', border:'none', outline:'none', resize:'vertical', fontSize:'0.94rem', fontFamily:'inherit', lineHeight:'1.75', color:'#1e293b', background:'transparent', minHeight:'110px', boxSizing:'border-box' }}
                            />
                            <div style={{ display:'flex', justifyContent:'flex-end', paddingBottom:'4px' }}>
                                <span style={{ fontSize:'0.68rem', fontWeight: charsLeft<300?'700':'400', color:charsLeft<100?'#DC2626':charsLeft<300?'#D97706':'#cbd5e1', transition:'color 0.15s' }}>
                                    {charsLeft.toLocaleString()} chars remaining
                                </span>
                            </div>
                        </div>

                        {/* File previews */}
                        {files.length > 0 && (
                            <div style={{ padding:'0 1.5rem 0.75rem', display:'flex', gap:'8px', flexWrap:'wrap' }}>
                                {files.map((f,i) => <FilePreview key={i} file={f} onRemove={file => setFiles(p => p.filter(x => x !== file))} />)}
                            </div>
                        )}

                        {/* YouTube input */}
                        {showVideo && (
                            <div style={{ padding:'0 1.5rem 0.75rem' }}>
                                <div style={{ display:'flex', gap:'8px', alignItems:'center', background:'#fff7f7', border:'1.5px solid #fecaca', borderRadius:'12px', padding:'0.6rem 0.875rem' }}>
                                    <Youtube size={16} color="#DC2626" style={{ flexShrink:0 }} />
                                    <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                                        placeholder="Paste YouTube link here…" autoFocus
                                        style={{ flex:1, border:'none', outline:'none', fontSize:'0.84rem', fontFamily:'inherit', background:'transparent', color:'#1e293b' }} />
                                    <button type="button" onClick={() => { setVideoUrl(''); setShowVideo(false); }}
                                        style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex' }}>
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Tags input */}
                        {showTags && (
                            <div style={{ padding:'0 1.5rem 0.75rem' }}>
                                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', padding:'0.6rem 0.875rem', border:'1.5px solid #e2e8f0', borderRadius:'12px', alignItems:'center', cursor:'text', minHeight:'44px' }}
                                    onClick={() => document.getElementById('cp-tag-inp')?.focus()}>
                                    {tags.map(tag => (
                                        <span key={tag} style={{ display:'inline-flex', alignItems:'center', gap:'4px', background:'#eff6ff', color:'#1D4ED8', border:'1px solid #bfdbfe', borderRadius:'100px', fontSize:'0.72rem', fontWeight:'700', padding:'3px 9px' }}>
                                            #{tag}
                                            <button type="button" onClick={() => setTags(p => p.filter(t => t !== tag))} style={{ background:'none', border:'none', cursor:'pointer', padding:'0 1px', color:'#1D4ED8', display:'flex' }}><X size={10} /></button>
                                        </span>
                                    ))}
                                    {tags.length < MAX_TAGS && (
                                        <input id="cp-tag-inp" value={tagInput} onChange={e => setTagInput(e.target.value)}
                                            onKeyDown={e => { if(e.key==='Enter'||e.key===','){e.preventDefault();addTag();} if(e.key==='Backspace'&&!tagInput&&tags.length) setTags(p=>p.slice(0,-1)); }}
                                            placeholder={tags.length?'':'Add tags (press Enter)…'}
                                            style={{ border:'none', outline:'none', fontSize:'0.83rem', fontFamily:'inherit', background:'transparent', color:'#1e293b', minWidth:'110px', flex:1 }} />
                                    )}
                                </div>
                                <p style={{ margin:'4px 0 0', fontSize:'0.68rem', color:'#94a3b8' }}>{tags.length}/{MAX_TAGS} tags · press Enter or comma</p>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div style={{ margin:'0 1.5rem 0.75rem', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:'10px', padding:'0.65rem 0.875rem', display:'flex', alignItems:'center', gap:'7px', fontSize:'0.83rem', color:'#DC2626' }}>
                                <AlertCircle size={14} /> {error}
                            </div>
                        )}

                        {/* Footer toolbar */}
                        <div style={{ display:'flex', alignItems:'center', gap:'4px', padding:'0.75rem 1.5rem', borderTop:'1px solid #f1f5f9', flexWrap:'wrap', background:'#f8fafc' }}>
                            <button type="button" className={`cp-toolbar-btn${files.some(f=>f.type.startsWith('image/'))?' active':''}`}
                                onClick={() => fileInputRef_click(fileRef, 'image/*')} disabled={mediaCount>=MAX_MEDIA}>
                                <Image size={15} /> Photo
                            </button>
                            <button type="button" className={`cp-toolbar-btn${files.some(f=>f.type==='application/pdf')?' active':''}`}
                                onClick={() => fileInputRef_click(fileRef, 'application/pdf')} disabled={mediaCount>=MAX_MEDIA}>
                                <FileText size={14} /> PDF
                            </button>
                            <button type="button" className={`cp-toolbar-btn${showVideo?' active':''}`}
                                onClick={() => setShowVideo(v=>!v)} disabled={mediaCount>=MAX_MEDIA&&!showVideo}>
                                <Youtube size={14} /> YouTube
                            </button>
                            <button type="button" className={`cp-toolbar-btn${showTags?' active':''}`}
                                onClick={() => setShowTags(v=>!v)}>
                                <Tag size={14} /> Tags{tags.length>0&&` (${tags.length})`}
                            </button>
                            {mediaCount > 0 && (
                                <span style={{ fontSize:'0.7rem', color:'#94a3b8', marginLeft:'2px' }}>{mediaCount}/{MAX_MEDIA}</span>
                            )}
                            <button type="submit" disabled={!canSubmit} className="cp-submit-btn" style={{ marginLeft:'auto' }}>
                                {submitting
                                    ? <><span style={{ width:'14px', height:'14px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }} /> Publishing…</>
                                    : <><Send size={14} /> Publish Post</>
                                }
                            </button>
                        </div>

                        <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple onChange={handleFiles} style={{ display:'none' }} />
                    </form>
                )}
            </div>
        </>
    );
};

// Helper to click file input with specific accept
function fileInputRef_click(ref, accept) {
    if (!ref.current) return;
    ref.current.accept = accept;
    ref.current.click();
    setTimeout(() => { if (ref.current) ref.current.accept = 'image/*,application/pdf'; }, 200);
}

export default CreatePost;