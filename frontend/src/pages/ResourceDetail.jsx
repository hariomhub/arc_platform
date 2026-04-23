import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ArrowLeft, Download, Lock, Globe, FileText,
    BookOpen, Video, ExternalLink, AlertCircle, Loader2, RefreshCw,
    Calendar, User, Play, Eye, EyeOff, Image as ImageIcon,
    ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { getResourceById, downloadResource, getVideoStreamUrl } from '../api/resources.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import { formatDate } from '../utils/dateFormatter.js';
import StarRating from '../components/resources/StarRating.jsx';
import ReviewSection from '../components/resources/ReviewSection.jsx';

const TYPE_COLORS = {
    article: '#3B82F6', whitepaper: '#8B5CF6', video: '#EC4899',
    tool: '#10B981', news: '#F59E0B', product: '#0EA5E9',
    framework: '#003366', 'lab result': '#6366F1', 'homepage video': '#EF4444',
};
const TYPE_ICONS = {
    article: FileText, whitepaper: BookOpen, video: Video,
    tool: Globe, news: FileText, product: Globe,
    framework: FileText, 'lab result': FileText, 'homepage video': Video,
};

const DOWNLOAD_ROLES = ['founding_member', 'council_member'];
const VIEW_ROLES     = ['founding_member', 'council_member', 'professional'];
const VIDEO_TYPES    = ['video', 'homepage video'];
// working_professional sub-type also gets download access
const canDownloadResources = (u) =>
    u && (
        DOWNLOAD_ROLES.includes(u.role) ||
        (u.role === 'professional' && u.professional_sub_type === 'working_professional')
    );

// Detect file type from URL extension
const getFileType = (url) => {
    if (!url) return null;
    const ext = url.split('?')[0].split('.').pop().toLowerCase();
    if (['pdf'].includes(ext))                               return 'pdf';
    if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return 'image';
    if (['mp4','webm','ogg','mov','avi'].includes(ext))       return 'video';
    if (['doc','docx','xls','xlsx','ppt','pptx'].includes(ext)) return 'office';
    return 'other';
};

// ── Video player ──────────────────────────────────────────────────────────────
const VideoPlayer = ({ resourceId, title }) => {
    const [url,     setUrl]     = useState('');
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true); setError('');
        getVideoStreamUrl(resourceId)
            .then(r => { if (!cancelled) setUrl(r.data?.url || ''); })
            .catch(() => { if (!cancelled) setError('Could not load video.'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [resourceId]);

    if (loading) return (
        <div style={{ background:'#0f172a', borderRadius:12, aspectRatio:'16/9', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Loader2 size={28} color="rgba(255,255,255,0.35)" style={{ animation:'spin 1s linear infinite' }} />
        </div>
    );
    if (error || !url) return (
        <div style={{ background:'#0f172a', borderRadius:12, aspectRatio:'16/9', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
            <Play size={32} color="rgba(255,255,255,0.2)" />
            <p style={{ margin:0, fontSize:'0.82rem', color:'rgba(255,255,255,0.4)' }}>{error || 'Video unavailable'}</p>
        </div>
    );
    return (
        <video controls controlsList="nodownload"
            style={{ width:'100%', borderRadius:12, background:'#0f172a', display:'block', maxHeight:480 }}
            title={title}>
            <source src={url} />
        </video>
    );
};

// ── PDF / Image / Office inline viewer (for council+founding) ─────────────────
const FileViewer = ({ resourceId, fileType, title }) => {
    const [url,       setUrl]       = useState('');
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState('');
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true); setError('');
        // Reuse /stream endpoint — returns SAS URL for any file type
        getVideoStreamUrl(resourceId)
            .then(r => { if (!cancelled) setUrl(r.data?.url || ''); })
            .catch(() => { if (!cancelled) setError('Could not load file.'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [resourceId]);

    if (loading) return (
        <div style={{ background:'#f8fafc', border:'1px solid #e8ecf0', borderRadius:12, padding:'2rem', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
            <Loader2 size={20} color="#003366" style={{ animation:'spin 1s linear infinite' }} />
            <span style={{ fontSize:'0.84rem', color:'#5e6e82' }}>Loading preview…</span>
        </div>
    );

    if (error || !url) return (
        <div style={{ background:'#f8fafc', border:'1px solid #e8ecf0', borderRadius:12, padding:'2rem', textAlign:'center' }}>
            <FileText size={28} color="#c4cdd6" style={{ margin:'0 auto 8px', display:'block' }} />
            <p style={{ margin:0, fontSize:'0.82rem', color:'#9aaab7' }}>Preview not available</p>
        </div>
    );

    return (
        <div style={{ border:'1px solid #e8ecf0', borderRadius:12, overflow:'hidden', background:'white' }}>
            {/* Viewer header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'#1e293b', gap:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                    <FileText size={14} color="rgba(255,255,255,0.6)" />
                    <span style={{ fontSize:'0.8rem', fontWeight:'600', color:'rgba(255,255,255,0.85)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {title}
                    </span>
                </div>
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>

                    <button onClick={() => setCollapsed(c => !c)}
                        style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:6, padding:'5px 10px', fontSize:'0.75rem', fontWeight:'600', cursor:'pointer', fontFamily:'inherit' }}>
                        {collapsed ? <><ChevronDown size={12} /> Show</> : <><ChevronUp size={12} /> Hide</>}
                    </button>
                </div>
            </div>

            {!collapsed && (
                <>
                    {fileType === 'pdf' && (
                        <div style={{ position:'relative', height:'600px', overflow:'hidden', background:'#1e293b' }}>
                            <iframe
                                src={`${url}#toolbar=0&navpanes=0&statusbar=0&scrollbar=0&view=FitH`}
                                title={title}
                                style={{ width:'100%', height:'100%', border:'none', display:'block' }}
                            />
                            {/* Transparent overlay blocks the browser PDF toolbar download/print buttons. */}
                            <div style={{ position:'absolute', top:0, left:0, right:0, height:'44px', zIndex:10, background:'transparent' }} />
                            {/* Bottom padding strip */}
                            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'16px', background:'#1e293b', zIndex:10 }} />
                        </div>
                    )}
                    {fileType === 'image' && (
                        <div style={{ padding:'16px', background:'#f8fafc', display:'flex', justifyContent:'center' }}>
                            <img src={url} alt={title}
                                style={{ maxWidth:'100%', maxHeight:'500px', objectFit:'contain', borderRadius:8, boxShadow:'0 2px 16px rgba(0,0,0,0.1)' }} />
                        </div>
                    )}
                    {fileType === 'office' && (
                        // Microsoft Office Online viewer — works with public URLs
                        <iframe
                            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
                            title={title}
                            style={{ width:'100%', height:'600px', border:'none', display:'block' }} />
                    )}
                    {fileType === 'other' && (
                        <div style={{ padding:'2rem', textAlign:'center', background:'#f8fafc' }}>
                            <FileText size={28} color="#c4cdd6" style={{ margin:'0 auto 10px', display:'block' }} />
                            <p style={{ margin:'0 0 4px', fontSize:'0.875rem', fontWeight:'700', color:'#1a1a2e' }}>
                                Preview not available
                            </p>
                            <p style={{ margin:0, fontSize:'0.8rem', color:'#9aaab7', lineHeight:'1.5' }}>
                                This file type cannot be previewed in the browser.
                                {canDownload ? ' Download it using the button above.' : ' Council Members can download it.'}
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// ── View gate — shown to professional members instead of viewer ───────────────
const ViewGate = ({ type }) => (
    <div style={{ background:'#f8fafc', border:'1.5px dashed #e2e8f0', borderRadius:12, padding:'2rem', textAlign:'center' }}>
        <Lock size={28} color="#c4cdd6" style={{ margin:'0 auto 10px', display:'block' }} />
        <p style={{ margin:'0 0 4px', fontSize:'0.9rem', fontWeight:'700', color:'#1a1a2e' }}>
            Sign in to preview
        </p>
        <p style={{ margin:'0 0 14px', fontSize:'0.8rem', color:'#9aaab7', lineHeight:'1.5' }}>
            All members can preview {type === 'pdf' ? 'PDFs' : type === 'image' ? 'images' : 'files'} on the portal.
            Council Members can also download.
        </p>
        <Link to="/login"
            style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#003366', color:'white', padding:'8px 18px', borderRadius:8, fontWeight:'700', fontSize:'0.82rem', textDecoration:'none' }}>
            Sign In
        </Link>
    </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const ResourceDetail = () => {
    const { id }        = useParams();
    const { user }      = useAuth();
    const { showToast } = useToast();

    const [resource,    setResource]    = useState(null);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState('');
    const [notFound,    setNotFound]    = useState(false);
    const [downloading, setDownloading] = useState(false);

    const fetchResource = useCallback(async () => {
        setLoading(true); setError(''); setNotFound(false);
        try {
            const res = await getResourceById(id);
            setResource(res.data?.data || res.data);
            document.title = `${res.data?.data?.title || 'Resource'} | AI Risk Council`;
        } catch (err) {
            if (err?.response?.status === 404) setNotFound(true);
            else setError(getErrorMessage(err));
        } finally { setLoading(false); }
    }, [id]);

    useEffect(() => { fetchResource(); }, [fetchResource]);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const res = await downloadResource(id);
            window.open(res.data.url, '_blank', 'noopener,noreferrer');
            showToast('Download started!', 'success');
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setDownloading(false); }
    };

    const canDownload = canDownloadResources(user);
    const canView     = VIEW_ROLES.includes(user?.role);
    const canViewFile = VIEW_ROLES.includes(user?.role); // all logged-in members can preview
    const isVideo     = resource && VIDEO_TYPES.includes(resource.type);
    const accent      = resource ? (TYPE_COLORS[resource.type] || '#003366') : '#003366';
    const TypeIcon    = resource ? (TYPE_ICONS[resource.type] || FileText) : FileText;

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) return (
        <div style={{ background:'#f8fafc', minHeight:'100vh', padding:'clamp(1.5rem,4vw,2.5rem) clamp(0.875rem,3vw,1.5rem)' }}>
            <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
            <div style={{ maxWidth:860, margin:'0 auto' }}>
                <div style={{ height:14, width:80, background:'#e2e8f0', borderRadius:6, marginBottom:24, animation:'sk 1.4s ease infinite' }} />
                <div style={{ background:'white', borderRadius:14, border:'1px solid #e8ecf0', padding:24 }}>
                    {[100,80,65,50].map((w,i) => (
                        <div key={i} style={{ height: i===0?20:13, width:`${w}%`, background:'#f0f3f7', borderRadius:5, marginBottom:12, animation:'sk 1.4s ease infinite' }} />
                    ))}
                </div>
            </div>
        </div>
    );

    if (notFound) return (
        <div style={{ background:'#f8fafc', minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'4rem 2rem', textAlign:'center' }}>
            <FileText size={40} color="#cbd5e1" style={{ marginBottom:12 }} />
            <h2 style={{ margin:'0 0 8px', color:'#1e293b', fontSize:'1.2rem', fontWeight:'800' }}>Resource Not Found</h2>
            <p style={{ margin:'0 0 20px', color:'#64748b', fontSize:'0.9rem' }}>This resource may have been removed.</p>
            <Link to="/resources" style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#003366', color:'white', padding:'9px 20px', borderRadius:9, fontWeight:'700', textDecoration:'none', fontSize:'0.875rem' }}>
                <ArrowLeft size={14} /> Back to Resources
            </Link>
        </div>
    );

    if (error) return (
        <div style={{ background:'#f8fafc', minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'4rem 2rem', textAlign:'center' }}>
            <AlertCircle size={36} color="#DC2626" style={{ margin:'0 auto 12px', opacity:0.7 }} />
            <p style={{ margin:'0 0 16px', color:'#64748b' }}>{error}</p>
            <button onClick={fetchResource}
                style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#003366', color:'white', border:'none', padding:'9px 20px', borderRadius:9, cursor:'pointer', fontWeight:'700', fontSize:'0.875rem', fontFamily:'inherit' }}>
                <RefreshCw size={14} /> Try Again
            </button>
        </div>
    );

    // Determine inline viewer type from resource.type field
    // (file_url is stripped server-side so we use type instead)
    const fileType = (() => {
        const t = resource.type?.toLowerCase() || '';
        if (['video','homepage video'].includes(t))          return 'video';
        if (['whitepaper','framework','lab result','article','news'].includes(t)) return 'pdf';
        if (['product','tool'].includes(t))                  return 'other';
        return 'pdf'; // safe default
    })();

    return (
        <div style={{ background:'#f0f4f8', minHeight:'100vh', fontFamily:'var(--font-sans)' }}>
            <style>{`
                @keyframes spin   { from{transform:rotate(0)} to{transform:rotate(360deg)} }
                @keyframes fadeup { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
            `}</style>

            <div style={{ height:3, background:accent }} />

            <div style={{ maxWidth:860, margin:'0 auto', padding:'clamp(1.25rem,3vw,2rem) clamp(0.875rem,3vw,1.5rem) 4rem' }}>

                {/* Back */}
                <Link to="/resources"
                    style={{ display:'inline-flex', alignItems:'center', gap:6, color:'#5e6e82', fontWeight:'600', fontSize:'0.83rem', textDecoration:'none', marginBottom:16, transition:'color 0.12s' }}
                    onMouseOver={e => e.currentTarget.style.color='#003366'}
                    onMouseOut={e => e.currentTarget.style.color='#5e6e82'}>
                    <ArrowLeft size={14} /> Back to Resources
                </Link>

                {/* ── Video player ── */}
                {isVideo && user && (
                    <div style={{ marginBottom:14, animation:'fadeup 0.3s ease' }}>
                        <VideoPlayer resourceId={parseInt(id,10)} title={resource.title} />
                    </div>
                )}

                {/* Not logged in + video */}
                {isVideo && !user && (
                    <div style={{ marginBottom:14, background:'#0f172a', borderRadius:12, aspectRatio:'16/9', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, animation:'fadeup 0.3s ease' }}>
                        <Play size={40} color="rgba(255,255,255,0.15)" />
                        <p style={{ margin:0, fontSize:'0.84rem', color:'rgba(255,255,255,0.45)' }}>Sign in to watch this video</p>
                        <Link to="/login" style={{ display:'inline-flex', alignItems:'center', gap:5, background:'white', color:'#003366', padding:'7px 16px', borderRadius:8, fontWeight:'700', fontSize:'0.82rem', textDecoration:'none' }}>
                            Sign In
                        </Link>
                    </div>
                )}

                {/* ── Main info card ── */}
                <div style={{ background:'white', borderRadius:16, border:'1px solid rgba(0,51,102,0.08)', boxShadow:'0 2px 16px rgba(0,51,102,0.06)', overflow:'hidden', marginBottom:14, animation:'fadeup 0.3s ease' }}>

                    <div style={{ padding:'clamp(1.25rem,3vw,1.75rem)', borderBottom:'1px solid #f0f3f7' }}>
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                            <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:'0.7rem', fontWeight:'700', color:accent, background:`${accent}14`, padding:'3px 10px', borderRadius:100, marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                                    <TypeIcon size={12} /> {resource.type}
                                </div>
                                <h1 style={{ margin:'0 0 10px', fontSize:'clamp(1.1rem,2.5vw,1.5rem)', fontWeight:'800', color:'#1a1a2e', lineHeight:1.25 }}>
                                    {resource.title}
                                </h1>
                                <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', fontSize:'0.76rem', color:'#9aaab7' }}>
                                    {resource.uploader_name && (
                                        <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                                            <User size={12} /> {resource.uploader_name}
                                        </span>
                                    )}
                                    <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                                        <Calendar size={12} /> {formatDate(resource.created_at)}
                                    </span>
                                    {resource.avg_rating > 0 && (
                                        <StarRating value={parseFloat(resource.avg_rating)} size={13} color="#f59e0b" showLabel count={resource.review_count} />
                                    )}
                                </div>
                            </div>

                            {/* ── Action buttons ── */}
                            <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0, alignItems:'flex-end' }}>

                                {/* Download — council + founding only */}
                                {!user ? (
                                    <Link to="/login"
                                        style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', background:'#5e6e82', color:'white', borderRadius:9, fontWeight:'700', fontSize:'0.84rem', textDecoration:'none' }}>
                                        <Lock size={14} /> Sign in
                                    </Link>
                                ) : canDownload ? (
                                    <button onClick={handleDownload} disabled={downloading}
                                        style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', background:downloading?'#94a3b8':'#003366', color:'white', border:'none', borderRadius:9, fontWeight:'700', fontSize:'0.84rem', cursor:downloading?'not-allowed':'pointer', fontFamily:'inherit', transition:'background 0.15s' }}
                                        onMouseOver={e => { if(!downloading) e.currentTarget.style.background='#002244'; }}
                                        onMouseOut={e => { if(!downloading) e.currentTarget.style.background='#003366'; }}>
                                        {downloading
                                            ? <><Loader2 size={14} style={{ animation:'spin 1s linear infinite' }} /> Preparing…</>
                                            : <><Download size={14} /> Download</>
                                        }
                                    </button>
                                ) : (
                                    <div style={{ textAlign:'right' }}>
                                        <Link to="/membership"
                                            style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', background:'#0f766e', color:'white', borderRadius:9, fontWeight:'700', fontSize:'0.84rem', textDecoration:'none' }}>
                                            <Lock size={14} /> Upgrade to Download
                                        </Link>
                                        <p style={{ margin:'4px 0 0', fontSize:'0.7rem', color:'#9aaab7' }}>Council Members only</p>
                                    </div>
                                )}

                                {/* View access label */}
                                {user && !isVideo && (
                                    <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:'0.72rem', color: canViewFile ? '#057642' : '#9aaab7', fontWeight:'600' }}>
                                        {canViewFile
                                            ? <><Eye size={12} /> Preview available below</>
                                            : <><Lock size={12} /> Sign in to preview</>
                                        }
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Description / Abstract */}
                    <div style={{ padding:'clamp(1rem,3vw,1.5rem)' }}>
                        {resource.description && (
                            <p style={{ margin:`0 0 ${resource.abstract?'16px':'0'}`, fontSize:'0.9rem', color:'#374151', lineHeight:'1.7' }}>
                                {resource.description}
                            </p>
                        )}
                        {resource.abstract && (
                            <div style={{ background:'#f8fafc', border:'1px solid #e8ecf0', borderRadius:10, padding:'12px 14px' }}>
                                <p style={{ margin:'0 0 6px', fontSize:'0.7rem', fontWeight:'800', color:'#9aaab7', textTransform:'uppercase', letterSpacing:'0.08em' }}>Abstract</p>
                                <p style={{ margin:0, fontSize:'0.875rem', color:'#374151', lineHeight:'1.7' }}>{resource.abstract}</p>
                            </div>
                        )}
                        {resource.demo_url && (
                            <div style={{ marginTop:14 }}>
                                <a href={resource.demo_url} target="_blank" rel="noopener noreferrer"
                                    style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:'0.82rem', color:'#003366', fontWeight:'700', textDecoration:'none' }}
                                    onMouseOver={e => e.currentTarget.style.textDecoration='underline'}
                                    onMouseOut={e => e.currentTarget.style.textDecoration='none'}>
                                    <ExternalLink size={13} /> View live / source
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Inline file viewer (non-video) ── */}
                {!isVideo && user && (
                    <div style={{ marginBottom:14, animation:'fadeup 0.35s ease 0.05s both' }}>
                        {canViewFile ? (
                            <FileViewer
                                resourceId={parseInt(id,10)}
                                fileType={fileType || 'pdf'}
                                title={resource.title}
                            />
                        ) : (
                            <ViewGate type={fileType || 'pdf'} />
                        )}
                    </div>
                )}

                {/* Not logged in + non-video */}
                {!isVideo && !user && (
                    <div style={{ marginBottom:14, background:'white', border:'1.5px dashed #e2e8f0', borderRadius:12, padding:'2rem', textAlign:'center', animation:'fadeup 0.35s ease 0.05s both' }}>
                        <Lock size={28} color="#c4cdd6" style={{ margin:'0 auto 10px', display:'block' }} />
                        <p style={{ margin:'0 0 4px', fontSize:'0.9rem', fontWeight:'700', color:'#1a1a2e' }}>Sign in to view this resource</p>
                        <p style={{ margin:'0 0 14px', fontSize:'0.8rem', color:'#9aaab7' }}>Council Members can also download it.</p>
                        <Link to="/login"
                            style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#003366', color:'white', padding:'8px 18px', borderRadius:8, fontWeight:'700', fontSize:'0.82rem', textDecoration:'none' }}>
                            Sign In
                        </Link>
                    </div>
                )}

                {/* ── Reviews ── */}
                <div style={{ background:'white', borderRadius:16, border:'1px solid rgba(0,51,102,0.08)', boxShadow:'0 2px 16px rgba(0,51,102,0.06)', padding:'clamp(1rem,3vw,1.5rem)', animation:'fadeup 0.4s ease 0.1s both' }}>
                    <ReviewSection resourceId={parseInt(id,10)} />
                </div>
            </div>
        </div>
    );
};

export default ResourceDetail;