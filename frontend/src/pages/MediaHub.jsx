import React, { useState, useEffect, useCallback } from 'react';
import { Play, X, ChevronLeft, ChevronRight, Search, Film } from 'lucide-react';
import { getRecentVideos, getVideoStreamUrl } from '../api/resources.js';

// ─── Video Card ──────────────────────────────────────────────────────────────
const VideoCard = ({ vid, index, onClick }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <div className="mh-card" style={{ animationDelay: `${Math.min(index * 55, 400)}ms` }}
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            onClick={() => onClick(vid, index)}>
            <div className="mh-media">
                <img src={vid.thumbnail_url || 'https://placehold.co/640x360/0f172a/ffffff?text=Video'}
                    alt={vid.title}
                    style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:hovered?0:1,transition:'opacity 0.4s',zIndex:2 }} />
                {hovered && (
                    <video src={vid.video_url + '#t=0.001'} autoPlay muted loop playsInline
                        style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',zIndex:2 }} />
                )}
                <div style={{ position:'absolute',inset:0,zIndex:3,background:'linear-gradient(180deg,transparent 35%,rgba(0,0,0,0.88) 100%)' }} />
                <div style={{ position:'absolute',inset:0,zIndex:4,display:'flex',alignItems:'center',justifyContent:'center',opacity:hovered?1:0.65,transition:'opacity 0.3s' }}>
                    <div style={{ width:hovered?'50px':'40px',height:hovered?'50px':'40px',borderRadius:'50%',background:'rgba(255,255,255,0.18)',backdropFilter:'blur(10px)',border:'2px solid rgba(255,255,255,0.4)',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
                        <Play size={hovered?18:14} fill="white" color="white" style={{ marginLeft:'2px',transition:'all 0.3s' }} />
                    </div>
                </div>
                <div style={{ position:'absolute',bottom:0,left:0,right:0,zIndex:4,padding:'10px 12px' }}>
                    <p style={{ margin:0,color:'white',fontSize:'0.82rem',fontWeight:'700',lineHeight:1.3,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',textShadow:'0 1px 4px rgba(0,0,0,0.5)' }}>
                        {vid.title}
                    </p>
                </div>
            </div>
        </div>
    );
};

// ─── Modal ───────────────────────────────────────────────────────────────────
const VideoModal = ({ url, title, onClose, onPrev, onNext, hasPrev, hasNext }) => {
    useEffect(() => {
        const fn = e => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft'  && hasPrev) onPrev();
            if (e.key === 'ArrowRight' && hasNext) onNext();
        };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, [onClose, onPrev, onNext, hasPrev, hasNext]);

    return (
        <div style={{ position:'fixed',inset:0,zIndex:999999,background:'rgba(0,0,0,0.97)',backdropFilter:'blur(24px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }} onClick={onClose}>
            <div style={{ position:'absolute',top:0,left:0,right:0,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.875rem 1.25rem',borderBottom:'1px solid rgba(255,255,255,0.06)',zIndex:10 }}>
                <div style={{ display:'flex',alignItems:'center',gap:'8px',minWidth:0 }}>
                    <span style={{ width:'6px',height:'6px',borderRadius:'50%',background:'#4ade80',boxShadow:'0 0 6px #4ade80',flexShrink:0,animation:'mh-dot 1.6s ease-in-out infinite' }} />
                    <span style={{ color:'rgba(255,255,255,0.8)',fontSize:'0.82rem',fontWeight:'600',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{title}</span>
                </div>
                <button onClick={onClose} style={{ width:'38px',height:'38px',borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',outline:'none',flexShrink:0 }}
                    onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.15)'} onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,0.07)'}>
                    <X size={16} />
                </button>
            </div>
            <div style={{ width:'90%',maxWidth:'1080px',aspectRatio:'16/9',borderRadius:'12px',overflow:'hidden',boxShadow:'0 40px 120px rgba(0,0,0,0.8)',border:'1px solid rgba(255,255,255,0.07)',animation:'mh-modal 0.35s cubic-bezier(0.25,0.8,0.25,1)' }} onClick={e=>e.stopPropagation()}>
                <video src={url} controls autoPlay style={{ width:'100%',height:'100%',objectFit:'contain',background:'#000' }} />
            </div>
            {(hasPrev || hasNext) && (
                <div style={{ display:'flex',gap:'8px',marginTop:'14px' }}>
                    {hasPrev && (
                        <button onClick={e=>{e.stopPropagation();onPrev();}}
                            style={{ display:'flex',alignItems:'center',gap:'5px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.75)',padding:'7px 16px',borderRadius:'100px',cursor:'pointer',fontSize:'0.74rem',fontWeight:'600',outline:'none' }}
                            onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.13)'} onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,0.07)'}>
                            <ChevronLeft size={13}/> Previous
                        </button>
                    )}
                    {hasNext && (
                        <button onClick={e=>{e.stopPropagation();onNext();}}
                            style={{ display:'flex',alignItems:'center',gap:'5px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.75)',padding:'7px 16px',borderRadius:'100px',cursor:'pointer',fontSize:'0.74rem',fontWeight:'600',outline:'none' }}
                            onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.13)'} onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,0.07)'}>
                            Next <ChevronRight size={13}/>
                        </button>
                    )}
                </div>
            )}
            <p style={{ marginTop:'8px',fontSize:'0.6rem',color:'rgba(255,255,255,0.18)',letterSpacing:'0.07em' }}>ESC · ← → to navigate</p>
        </div>
    );
};

// ─── Page ────────────────────────────────────────────────────────────────────
const MediaHub = () => {
    const [videos,     setVideos]     = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [search,     setSearch]     = useState('');
    const [modalIdx,   setModalIdx]   = useState(null);
    const [modalUrl,   setModalUrl]   = useState(null);
    const [modalTitle, setModalTitle] = useState('');

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res  = await getRecentVideos();
                const data = res.data?.videos ?? res.data ?? [];
                setVideos(Array.isArray(data) ? data : []);
            } catch { setVideos([]); }
            finally  { setLoading(false); }
        })();
    }, []);

    const filtered = videos.filter(v =>
        !search || (v.title || '').toLowerCase().includes(search.toLowerCase())
    );

    const openModal = useCallback(async (vid, idx) => {
        setModalIdx(idx);
        setModalTitle(vid.title || '');
        try {
            const res = await getVideoStreamUrl(vid.id);
            setModalUrl(res.data.url);
        } catch { setModalUrl(vid.video_url); }
    }, []);

    const closeModal = () => { setModalIdx(null); setModalUrl(null); setModalTitle(''); };
    const prevModal  = () => { if (modalIdx > 0)                   openModal(filtered[modalIdx-1], modalIdx-1); };
    const nextModal  = () => { if (modalIdx < filtered.length - 1) openModal(filtered[modalIdx+1], modalIdx+1); };

    return (
        <>
            <style>{`
                @keyframes mh-dot    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.75)} }
                @keyframes mh-modal  { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
                @keyframes mh-fadein { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
                @keyframes mh-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
                @keyframes mh-shimmer{ 0%{background-position:200% center} 100%{background-position:-200% center} }

                .mh-card {
                    border-radius:12px; overflow:hidden; cursor:pointer;
                    animation:mh-fadein 0.45s ease both;
                    transition:transform 0.32s cubic-bezier(0.25,1,0.5,1), box-shadow 0.32s ease;
                    box-shadow:0 2px 10px rgba(0,0,0,0.08);
                }
                .mh-card:hover {
                    transform:translateY(-5px) scale(1.02);
                    box-shadow:0 18px 40px rgba(0,0,0,0.16), 0 0 0 2px rgba(147,197,253,0.28);
                    z-index:5;
                }
                .mh-media { position:relative; width:100%; aspect-ratio:16/9; background:#0f172a; overflow:hidden; }
                .mh-grid  { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
                @media (max-width:900px) { .mh-grid { grid-template-columns:repeat(2,1fr); } }
                @media (max-width:560px) { .mh-grid { grid-template-columns:1fr; } }
                .mh-sk .mh-media {
                    background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);
                    background-size:200% 100%; animation:mh-shimmer 1.5s ease-in-out infinite;
                }
                .mh-search:focus { border-color:rgba(147,197,253,0.55) !important; outline:none; }
            `}</style>

            {/* ── Compact Hero ── */}
            <div style={{ background:'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)', padding:'clamp(2rem,4vw,3rem) clamp(1rem,4vw,3rem)', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute',top:'-60px',left:'-50px',width:'300px',height:'300px',borderRadius:'50%',background:'radial-gradient(circle,rgba(59,130,246,0.14) 0%,transparent 70%)',animation:'mh-float 9s ease-in-out infinite',pointerEvents:'none' }} />
                <div style={{ position:'absolute',bottom:'-70px',right:'-40px',width:'260px',height:'260px',borderRadius:'50%',background:'radial-gradient(circle,rgba(167,139,250,0.12) 0%,transparent 70%)',animation:'mh-float 11s 2s ease-in-out infinite',pointerEvents:'none' }} />
                <div style={{ maxWidth:'1400px',margin:'0 auto',position:'relative',zIndex:1 }}>
                    <div style={{ display:'inline-flex',alignItems:'center',gap:'7px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.13)',borderRadius:'100px',padding:'4px 12px',marginBottom:'0.85rem' }}>
                        <span style={{ width:'6px',height:'6px',borderRadius:'50%',background:'#4ade80',boxShadow:'0 0 7px #4ade80',animation:'mh-dot 1.8s ease-in-out infinite' }} />
                        <span style={{ fontSize:'0.66rem',fontWeight:'700',color:'rgba(255,255,255,0.65)',textTransform:'uppercase',letterSpacing:'0.12em' }}>Video Library</span>
                    </div>
                    <h1 style={{ color:'white',fontSize:'clamp(1.6rem,4vw,2.8rem)',fontWeight:'800',lineHeight:1.1,letterSpacing:'-0.03em',margin:'0 0 0.6rem',fontFamily:'var(--font-serif)' }}>
                        Media Hub
                    </h1>
                    <p style={{ color:'rgba(255,255,255,0.45)',fontSize:'clamp(0.85rem,1.8vw,0.95rem)',maxWidth:'460px',lineHeight:1.65,margin:'0 0 1.5rem' }}>
                        Browse the full collection of videos from the Risk AI Council (RAC).
                    </p>
                    <div style={{ position:'relative',maxWidth:'380px' }}>
                        <Search size={14} style={{ position:'absolute',left:'13px',top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,0.35)',pointerEvents:'none' }} />
                        <input className="mh-search" type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search videos..."
                            style={{ width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.13)',borderRadius:'100px',padding:'9px 16px 9px 36px',color:'white',fontSize:'0.84rem',fontFamily:'var(--font-sans)',boxSizing:'border-box',transition:'border-color 0.2s' }} />
                    </div>
                </div>
            </div>

            {/* ── Count strip ── */}
            <div style={{ background:'white',borderBottom:'1px solid #e8edf3',padding:'0.6rem clamp(1rem,4vw,3rem)' }}>
                <div style={{ maxWidth:'1400px',margin:'0 auto',display:'flex',alignItems:'center',gap:'8px' }}>
                    <Film size={14} color="#3b82f6" />
                    <span style={{ fontSize:'0.8rem',fontWeight:'700',color:'#1e293b' }}>
                        {loading ? 'Loading…' : `${filtered.length} video${filtered.length!==1?'s':''}`}
                    </span>
                    {search && <span style={{ fontSize:'0.75rem',color:'#94a3b8' }}>for "{search}"</span>}
                </div>
            </div>

            {/* ── Grid ── */}
            <div style={{ background:'#f8fafc',minHeight:'50vh',padding:'clamp(1rem,2.5vw,2rem) clamp(1rem,4vw,3rem)' }}>
                <div style={{ maxWidth:'1400px',margin:'0 auto' }}>
                    {loading ? (
                        <div className="mh-grid">
                            {[...Array(6)].map((_,i)=>(
                                <div key={i} className="mh-sk" style={{ borderRadius:'12px',overflow:'hidden' }}><div className="mh-media" /></div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign:'center',padding:'4rem 1rem' }}>
                            <Film size={44} color="#cbd5e1" style={{ marginBottom:'0.75rem' }} />
                            <p style={{ fontSize:'1rem',fontWeight:'600',color:'#475569',margin:'0 0 0.4rem' }}>No Videos Found</p>
                            <p style={{ fontSize:'0.85rem',color:'#94a3b8' }}>
                                {search ? 'Try a different search term.' : 'Videos uploaded by admin will appear here.'}
                            </p>
                        </div>
                    ) : (
                        <div className="mh-grid">
                            {filtered.map((vid,idx)=>(
                                <VideoCard key={vid.id||idx} vid={vid} index={idx} onClick={openModal} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modal ── */}
            {modalUrl && (
                <VideoModal url={modalUrl} title={modalTitle} onClose={closeModal}
                    onPrev={prevModal} onNext={nextModal}
                    hasPrev={modalIdx>0} hasNext={modalIdx<filtered.length-1} />
            )}
        </>
    );
};

export default MediaHub;
