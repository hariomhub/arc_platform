import React, { useState, useRef, useCallback } from 'react';
import {
    Image, FileText, Youtube, Tag, X, Send, Loader2, AlertCircle, Plus,
    Bot, BarChart2, CalendarDays, Wrench, MessageSquare, ChevronLeft,
    ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { createFeedPost } from '../../api/feed.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';

const MAX_CHARS = 5000;
const MAX_MEDIA = 5;
const MAX_TAGS  = 5;

const ROLE_META = {
    founding_member: { color:'#7C3AED', label:'Founding Member' },
    council_member:  { color:'#003366', label:'Chapter Lead'  },
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

const POST_TYPES = [
    { key: 'ai_product',      label: 'AI Product Showcase', desc: 'Share a product you built or discovered', Icon: Bot,          color: '#7C3AED' },
    { key: 'poll',            label: 'Community Poll',      desc: 'Ask the community a question with options', Icon: BarChart2,    color: '#2563EB' },
    { key: 'event',           label: 'Event Announcement',  desc: 'Spread the word about an upcoming event', Icon: CalendarDays, color: '#059669' },
    { key: 'troubleshooting', label: 'Troubleshooting',     desc: 'Post a problem or share a technical fix',  Icon: Wrench,       color: '#D97706' },
    { key: 'general',         label: 'General Discussion',  desc: 'Tech, AI, or anything on your mind',       Icon: MessageSquare,color: '#003366' },
    { key: 'tech_meme',       label: 'Tech Meme',           desc: 'Share a funny or insightful tech image',   Icon: Image,        color: '#DB2777' },
];

const POST_TYPE_LABELS = { ai_product: 'AI Product', poll: 'Poll', event: 'Event', troubleshooting: 'Troubleshooting', general: 'General', tech_meme: 'Tech Meme' };

const CreatePost = ({ onPostCreated }) => {
    const { user }      = useAuth();
    const { showToast } = useToast();
    const [typeStep,   setTypeStep]   = useState(false);   // show type selector
    const [postType,   setPostType]   = useState('general');
    const [expanded,   setExpanded]   = useState(false);
    const [content,    setContent]    = useState('');
    const [files,      setFiles]      = useState([]);
    const [videoUrl,   setVideoUrl]   = useState('');
    const [showVideo,  setShowVideo]  = useState(false);
    const [tagInput,   setTagInput]   = useState('');
    const [tags,       setTags]       = useState([]);
    const [showTags,   setShowTags]   = useState(false);
    // Poll-specific
    const [pollOptions,  setPollOptions]  = useState(['', '']);
    const [pollDuration, setPollDuration] = useState('');
    // Event-specific
    const [eventLink, setEventLink] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error,      setError]      = useState('');
    const fileRef  = useRef(null);
    const textRef  = useRef(null);
    const roleMeta = ROLE_META[user?.role] || ROLE_META.professional;
    const mediaCount = files.length + (videoUrl ? 1 : 0);
    const charsLeft  = MAX_CHARS - content.length;
    const pollValid  = postType !== 'poll' || pollOptions.filter(o => o.trim()).length >= 2;
    const isTechMeme = postType === 'tech_meme';
    const hasOnlyImages = files.length > 0 && files.every(f => f.type.startsWith('image/'));
    const isAutoMeme = !isTechMeme && hasOnlyImages && content.trim().length === 0 && !videoUrl;
    const techMemeValid = isTechMeme && files.some(f => f.type.startsWith('image/')) && content.trim().length === 0;
    const canSubmit  = (isTechMeme ? techMemeValid : (content.trim().length > 0 || isAutoMeme)) && !submitting && pollValid;

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

    const resetForm = () => {
        setContent(''); setFiles([]); setVideoUrl(''); setTags([]);
        setTagInput(''); setShowVideo(false); setShowTags(false);
        setExpanded(false); setTypeStep(false); setPostType('general');
        setPollOptions(['', '']); setPollDuration(''); setEventLink(''); setError('');
    };

    const handleSubmit = async e => {
        e.preventDefault();
        if (!canSubmit) return;
        setError(''); setSubmitting(true);
        try {
            const fd = new FormData();
            // Auto-reclassify: if no text, no PDF, no video, only images → tech_meme
            const hasOnlyImages = files.length > 0 && files.every(f => f.type.startsWith('image/'));
            const noText = !content.trim();
            const noVideo = !videoUrl.trim();
            const effectivePostType = (!isTechMeme && noText && hasOnlyImages && noVideo) ? 'tech_meme' : postType;
            const finalContent = effectivePostType === 'tech_meme' ? '' : content.trim();
            fd.append('content', finalContent);
            fd.append('post_type', effectivePostType);
            if (tags.length)     fd.append('tags', JSON.stringify(tags));
            if (videoUrl.trim()) fd.append('video_url', videoUrl.trim());
            files.forEach(f => fd.append('media', f));
            if (postType === 'poll') {
                const cleanOpts = pollOptions.map(o => o.trim()).filter(Boolean);
                fd.append('poll_options', JSON.stringify(cleanOpts));
                if (pollDuration) fd.append('poll_duration', pollDuration);
            }
            if (postType === 'event' && eventLink.trim()) {
                fd.append('event_link', eventLink.trim());
            }
            const res = await createFeedPost(fd);
            resetForm();
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

                /* ── Responsive ── */
                .cp-type-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                }
                @media (max-width: 600px) {
                    .cp-type-grid { grid-template-columns: repeat(2, 1fr); gap: 6px; }
                }
                @media (max-width: 380px) {
                    .cp-type-grid { grid-template-columns: 1fr; gap: 5px; }
                }

                .cp-form-pad    { padding: 1rem 1.5rem; }
                .cp-form-pad-sm { padding: 0.75rem 1rem; }
                @media (max-width: 480px) {
                    .cp-form-pad    { padding: 0.75rem 0.875rem; }
                    .cp-form-pad-sm { padding: 0.5rem 0.875rem; }
                    .cp-toolbar-btn span { display: none; }
                    .cp-toolbar-btn { padding: 5px 7px; }
                    .cp-submit-btn  { padding: 0.55rem 1rem; font-size: 0.8rem; }
                }

                .cp-author-avatar-lg { width: 44px; height: 44px; font-size: 1rem; }
                .cp-author-avatar-sm { width: 36px; height: 36px; font-size: 0.85rem; }
                @media (max-width: 480px) {
                    .cp-author-avatar-lg { width: 36px; height: 36px; font-size: 0.875rem; }
                    .cp-author-avatar-sm { width: 30px; height: 30px; font-size: 0.75rem; }
                }
            `}</style>

            <div className="cp-wrap">
                {/* ── Collapsed trigger ── */}
                {!expanded && !typeStep && (
                    <div className="cp-trigger" onClick={() => setTypeStep(true)}>
                        <div className="cp-author-avatar-lg" style={{ borderRadius:'50%', flexShrink:0, background: roleMeta.color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', color:'white', border:`2px solid ${roleMeta.color}` }}>
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="cp-input-pill">Share your knowledge with the community…</div>
                        <button className="cp-post-btn-collapsed" onClick={e => { e.stopPropagation(); setTypeStep(true); }}>
                            <Plus size={14} /> <span className="btn-text">New Post</span>
                        </button>
                    </div>
                )}

                {/* ── Type selector step ── */}
                {typeStep && !expanded && (
                    <div className="cp-expanded" style={{ padding: '0' }}>
                        {/* Solid accent bar */}
                        <div style={{ height: '3px', background: roleMeta.color }} />
                        <div className="cp-form-pad">
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'1.1rem' }}>
                                <p style={{ margin:0, fontSize:'0.875rem', fontWeight:'700', color:'#1e293b' }}>Select post type</p>
                                <button
                                    type="button"
                                    onClick={() => setTypeStep(false)}
                                    style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:5, padding:'3px', width:24, height:24, flexShrink:0, transition:'background 0.12s, color 0.12s' }}
                                    onMouseOver={e=>{ e.currentTarget.style.background='#f1f5f9'; e.currentTarget.style.color='#475569'; }}
                                    onMouseOut={e=>{ e.currentTarget.style.background='none'; e.currentTarget.style.color='#94a3b8'; }}
                                >
                                    <X size={15}/>
                                </button>
                            </div>
                            <div className="cp-type-grid">
                                {POST_TYPES.map(({ key, label, desc, Icon, color }) => (
                                    <button key={key} type="button"
                                        onClick={() => { setPostType(key); setTypeStep(false); setExpanded(true); if (key === 'tech_meme') { setContent(''); } else { setTimeout(() => textRef.current?.focus(), 60); } }}
                                        style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', gap:8, padding:'0.875rem', border:'1.5px solid #e2e8f0', borderRadius:10, background:'white', cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all 0.15s' }}
                                        onMouseOver={e=>{ e.currentTarget.style.borderColor=color; e.currentTarget.style.background=`${color}08`; }}
                                        onMouseOut={e=>{ e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.background='white'; }}>
                                        <div style={{ width:34, height:34, borderRadius:8, background:`${color}12`, border:`1px solid ${color}25`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                            <Icon size={17} color={color} />
                                        </div>
                                        <div>
                                            <p style={{ margin:'0 0 3px', fontSize:'0.79rem', fontWeight:'700', color:'#1e293b', lineHeight:1.2 }}>{label}</p>
                                            <p style={{ margin:0, fontSize:'0.69rem', color:'#64748b', lineHeight:1.4 }}>{desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Expanded form ── */}
                {expanded && (
                    <form className="cp-expanded" onSubmit={handleSubmit}>
                        {/* Solid accent left-border instead of gradient bar */}
                        <div style={{ height:'3px', background: roleMeta.color }} />

                        {/* Author row */}
                        <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'1rem 1.5rem', borderBottom:'1px solid #f1f5f9' }}>
                            <div className="cp-author-avatar-sm" style={{ borderRadius:'50%', flexShrink:0, background: roleMeta.color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', color:'white' }}>
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p style={{ margin:0, fontFamily:"'Sora',sans-serif", fontSize:'0.875rem', fontWeight:'600', color:'#0f172a' }}>{user?.name}</p>
                                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:1 }}>
                                    <span style={{ fontSize:'0.65rem', fontWeight:'700', color:'#64748b' }}>{roleMeta.label}</span>
                                    <span style={{ fontSize:'0.6rem', color:'#94a3b8' }}>·</span>
                                    <span style={{ fontSize:'0.65rem', fontWeight:'700', color: POST_TYPES.find(t=>t.key===postType)?.color || '#64748b' }}>{POST_TYPE_LABELS[postType]}</span>
                                </div>
                            </div>
                            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4 }}>
                                <button type="button" title="Change post type" onClick={() => { setExpanded(false); setTypeStep(true); }}
                                    style={{ background:'none', border:'1px solid #e2e8f0', cursor:'pointer', color:'#64748b', padding:'4px 8px', borderRadius:6, display:'flex', alignItems:'center', gap:4, fontSize:'0.72rem', fontWeight:600, fontFamily:'inherit', transition:'all 0.12s' }}
                                    onMouseOver={e=>{ e.currentTarget.style.background='#f1f5f9'; }} onMouseOut={e=>{ e.currentTarget.style.background='none'; }}>
                                    <ChevronLeft size={13}/> Change type
                                </button>
                                <button type="button" onClick={resetForm}
                                    style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', width:28, height:28, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.12s' }}
                                    onMouseOver={e => { e.currentTarget.style.background='#f1f5f9'; e.currentTarget.style.color='#475569'; }}
                                    onMouseOut={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='#94a3b8'; }}>
                                    <X size={15} />
                                </button>
                            </div>
                        </div>

                        {/* Textarea */}
                        <div className="cp-form-pad" style={{ paddingBottom: '0.25rem' }}>
                            {isTechMeme ? (
                                <div style={{ padding: '0.5rem 0', marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1rem', background: '#FDF2F8', border: '1px solid #FBCFE8', borderRadius: '10px', fontSize: '0.85rem', color: '#9D174D', fontWeight: '600' }}>
                                        <Image size={15} />
                                        <span>Tech Memes: Only images are allowed. No text, captions, PDFs, or video links.</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <textarea
                                        ref={textRef}
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                        placeholder="What insights, research, or perspectives do you want to share with the AI risk community?"
                                        maxLength={MAX_CHARS}
                                        rows={5}
                                        disabled={submitting}
                                        style={{ width:'100%', border:'none', outline:'none', resize:'vertical', fontSize:'0.94rem', fontFamily:'inherit', lineHeight:'1.75', color:'#1e293b', background:'transparent', minHeight: '110px', boxSizing:'border-box' }}
                                    />
                                    <div style={{ display:'flex', justifyContent:'flex-end', paddingBottom:'4px' }}>
                                        <span style={{ fontSize:'0.68rem', fontWeight: charsLeft<300?'700':'400', color:charsLeft<100?'#DC2626':charsLeft<300?'#D97706':'#cbd5e1', transition:'color 0.15s' }}>
                                            {charsLeft.toLocaleString()} chars remaining
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Poll options — only for poll type */}
                        {postType === 'poll' && (
                            <div style={{ padding:'0 1.5rem 0.75rem' }}>
                                <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'0.875rem' }}>
                                    <p style={{ margin:'0 0 0.625rem', fontSize:'0.78rem', fontWeight:'700', color:'#1e293b' }}>Poll options <span style={{ color:'#94a3b8', fontWeight:400 }}>(min 2, max 5)</span></p>
                                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                                        {pollOptions.map((opt, i) => (
                                            <div key={i} style={{ display:'flex', gap:6, alignItems:'center' }}>
                                                <span style={{ fontSize:'0.72rem', color:'#94a3b8', fontWeight:700, minWidth:16, textAlign:'right' }}>{i+1}.</span>
                                                <input value={opt} onChange={e => { const n=[...pollOptions]; n[i]=e.target.value; setPollOptions(n); }}
                                                    placeholder={`Option ${i+1}`} maxLength={100}
                                                    style={{ flex:1, padding:'0.45rem 0.75rem', border:'1px solid #e2e8f0', borderRadius:7, fontSize:'0.83rem', fontFamily:'inherit', outline:'none', color:'#1e293b', background:'white', transition:'border-color 0.15s' }}
                                                    onFocus={e=>e.target.style.borderColor='#003366'} onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
                                                {pollOptions.length > 2 && (
                                                    <button type="button" onClick={() => setPollOptions(p=>p.filter((_,j)=>j!==i))} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex', padding:2, borderRadius:4 }} onMouseOver={e=>e.currentTarget.style.color='#dc2626'} onMouseOut={e=>e.currentTarget.style.color='#94a3b8'}><X size={13}/></button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {pollOptions.length < 5 && (
                                        <button type="button" onClick={() => setPollOptions(p=>[...p,''])}
                                            style={{ marginTop:8, background:'none', border:'1px dashed #cbd5e1', borderRadius:7, padding:'5px 12px', fontSize:'0.76rem', fontWeight:600, color:'#64748b', cursor:'pointer', fontFamily:'inherit', width:'100%', transition:'all 0.12s' }}
                                            onMouseOver={e=>{ e.currentTarget.style.borderColor='#003366'; e.currentTarget.style.color='#003366'; }}
                                            onMouseOut={e=>{ e.currentTarget.style.borderColor='#cbd5e1'; e.currentTarget.style.color='#64748b'; }}>
                                            + Add option
                                        </button>
                                    )}
                                    <div style={{ marginTop:10, display:'flex', gap:6, alignItems:'center' }}>
                                        <span style={{ fontSize:'0.73rem', color:'#64748b', fontWeight:600 }}>Duration:</span>
                                        {['24h','3d','7d'].map(d => (
                                            <button key={d} type="button" onClick={() => setPollDuration(v=>v===d?'':d)}
                                                style={{ padding:'3px 10px', border:`1px solid ${pollDuration===d?'#003366':'#e2e8f0'}`, background: pollDuration===d?'#003366':'white', color: pollDuration===d?'white':'#64748b', borderRadius:6, fontSize:'0.72rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.12s' }}>
                                                {d==='24h'?'24 hours':d==='3d'?'3 days':'7 days'}
                                            </button>
                                        ))}
                                        {pollDuration && <span style={{ fontSize:'0.68rem', color:'#94a3b8' }}>· click again to clear</span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Event link — only for event type */}
                        {postType === 'event' && (
                            <div style={{ padding:'0 1.5rem 0.75rem' }}>
                                <div style={{ display:'flex', gap:8, alignItems:'center', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:'0.6rem 0.875rem' }}>
                                    <ExternalLink size={15} color="#059669" style={{ flexShrink:0 }} />
                                    <input type="url" value={eventLink} onChange={e => setEventLink(e.target.value)}
                                        placeholder="Link to event page (optional)…"
                                        style={{ flex:1, border:'none', outline:'none', fontSize:'0.84rem', fontFamily:'inherit', background:'transparent', color:'#1e293b' }} />
                                    {eventLink && <button type="button" onClick={() => setEventLink('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex', alignItems:'center', justifyContent:'center', width:20, height:20, flexShrink:0 }}><X size={13}/></button>}
                                </div>
                            </div>
                        )}

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
                                        style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex', alignItems:'center', justifyContent:'center', width:22, height:22, flexShrink:0 }}>
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Tags input */}
                        {showTags && (
                            <div style={{ padding:'0 1.5rem 0.75rem' }}>
                                <div
                                    style={{ display:'flex', flexWrap:'wrap', gap:'6px', padding:'0.5rem 0.75rem', border:'1.5px solid #e2e8f0', borderRadius:'8px', alignItems:'center', cursor:'text', minHeight:'38px', background:'white', transition:'border-color 0.15s' }}
                                    onClick={() => document.getElementById('cp-tag-inp')?.focus()}
                                >
                                    {tags.map(tag => (
                                        <span key={tag} style={{ display:'inline-flex', alignItems:'center', gap:'3px', background:'#f1f5f9', color:'#0f172a', border:'1px solid #e2e8f0', borderRadius:'100px', fontSize:'0.73rem', fontWeight:'600', padding:'3px 5px 3px 9px', lineHeight:1 }}>
                                            #{tag}
                                            <button
                                                type="button"
                                                onClick={() => setTags(p => p.filter(t => t !== tag))}
                                                style={{ background:'none', border:'none', cursor:'pointer', padding:0, color:'#94a3b8', display:'flex', alignItems:'center', justifyContent:'center', width:14, height:14, flexShrink:0, borderRadius:'50%', transition:'background 0.1s, color 0.1s' }}
                                                onMouseOver={e => { e.currentTarget.style.background='#e2e8f0'; e.currentTarget.style.color='#475569'; }}
                                                onMouseOut={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='#94a3b8'; }}
                                            >
                                                <X size={9} />
                                            </button>
                                        </span>
                                    ))}
                                    {tags.length < MAX_TAGS && (
                                        <input id="cp-tag-inp" value={tagInput} onChange={e => setTagInput(e.target.value)}
                                            onKeyDown={e => { if(e.key==='Enter'||e.key===','){e.preventDefault();addTag();} if(e.key==='Backspace'&&!tagInput&&tags.length) setTags(p=>p.slice(0,-1)); }}
                                            placeholder={tags.length ? '' : 'Add tags…'}
                                            style={{ border:'none', outline:'none', fontSize:'0.78rem', fontFamily:'inherit', background:'transparent', color:'#1e293b', minWidth:'80px', flex:1, padding:'1px 0' }} />
                                    )}
                                </div>
                                <p style={{ margin:'3px 0 0', fontSize:'0.67rem', color:'#94a3b8' }}>{tags.length}/{MAX_TAGS} · Enter or comma to add</p>
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
                            {!isTechMeme && (
                                <button type="button" className={`cp-toolbar-btn${files.some(f=>f.type==='application/pdf')?' active':''}`}
                                    onClick={() => fileInputRef_click(fileRef, 'application/pdf')} disabled={mediaCount>=MAX_MEDIA}>
                                    <FileText size={14} /> PDF
                                </button>
                            )}
                            {!isTechMeme && (
                                <button type="button" className={`cp-toolbar-btn${showVideo?' active':''}`}
                                    onClick={() => setShowVideo(v=>!v)} disabled={mediaCount>=MAX_MEDIA&&!showVideo}>
                                    <Youtube size={14} /> YouTube
                                </button>
                            )}
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

                        <input ref={fileRef} type="file" accept={isTechMeme ? 'image/*' : 'image/*,application/pdf'} multiple onChange={handleFiles} style={{ display:'none' }} />
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