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
    const [heroHoverIdx, setHeroHoverIdx] = useState(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res  = await getRecentVideos();
                const data = res.data?.data ?? [];
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
                    box-shadow:0 18px 40px rgba(0,51,102,0.18), 0 0 0 2px rgba(0,51,102,0.25);
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
                .mh-search:focus { border-color:rgba(255,255,255,0.4) !important; outline:none; }

                .mh-hero-inner { display:flex; align-items:center; gap:2rem; }
                .mh-hero-stack { position:relative; flex:0 0 430px; height:220px; margin:0 auto; }
                @media (max-width:1100px) { .mh-hero-stack { display:none; } }
                .mh-hero-tile {
                    position:absolute; width:210px; aspect-ratio:16/9; border-radius:12px; overflow:hidden;
                    border:2px solid rgba(255,255,255,0.22); box-shadow:0 12px 28px rgba(0,17,34,0.35);
                    background:#001830 center/cover no-repeat;
                    transition:transform 0.3s cubic-bezier(0.25,1,0.5,1), box-shadow 0.3s ease, border-color 0.3s ease;
                }
                .mh-hero-tile:hover { border-color:rgba(255,255,255,0.5); }
                .mh-hero-sk {
                    background:linear-gradient(90deg,rgba(255,255,255,0.06) 25%,rgba(255,255,255,0.14) 50%,rgba(255,255,255,0.06) 75%);
                    background-size:200% 100%; animation:mh-shimmer 1.6s ease-in-out infinite;
                }
            `}</style>

            {/* ── Compact Hero ── */}
            <div style={{ background:'linear-gradient(135deg,#002244 0%,#003366 60%,#005599 100%)', padding:'clamp(1.5rem,3vw,2.25rem) clamp(1rem,4vw,3rem)', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute',top:'-60px',left:'-50px',width:'300px',height:'300px',borderRadius:'50%',background:'rgba(255,255,255,0.03)',pointerEvents:'none' }} />
                <div style={{ position:'absolute',bottom:'-70px',right:'-40px',width:'260px',height:'260px',borderRadius:'50%',background:'rgba(255,255,255,0.02)',pointerEvents:'none' }} />
                <div className="mh-hero-inner" style={{ maxWidth:'1400px',margin:'0 auto',position:'relative',zIndex:1 }}>
                    <div style={{ flex:'0 1 480px', minWidth:0 }}>
                        <div style={{ display:'inline-flex',alignItems:'center',gap:'7px',background:'rgba(255,255,255,0.1)',borderRadius:'100px',padding:'4px 12px',marginBottom:'0.75rem' }}>
                            <span style={{ width:'6px',height:'6px',borderRadius:'50%',background:'#4ade80',boxShadow:'0 0 7px #4ade80',animation:'mh-dot 1.8s ease-in-out infinite' }} />
                            <span style={{ fontSize:'0.66rem',fontWeight:'700',color:'#93C5FD',textTransform:'uppercase',letterSpacing:'0.12em' }}>Video Library</span>
                        </div>
                        <h1 style={{ color:'white',fontSize:'clamp(1.5rem,3.4vw,2.4rem)',fontWeight:'800',lineHeight:1.1,letterSpacing:'-0.03em',margin:'0 0 0.5rem',fontFamily:'var(--font-serif)' }}>
                            Media Hub
                        </h1>
                        <p style={{ color:'#CBD5E1',fontSize:'clamp(0.85rem,1.6vw,0.95rem)',maxWidth:'460px',lineHeight:1.6,margin:'0 0 1.1rem' }}>
                            Browse the full collection of videos from the Risk AI Council (RAC).
                        </p>
                        <div style={{ position:'relative',maxWidth:'380px' }}>
                            <Search size={14} style={{ position:'absolute',left:'13px',top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,0.45)',pointerEvents:'none' }} />
                            <input className="mh-search" type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search videos..."
                                style={{ width:'100%',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.18)',borderRadius:'100px',padding:'8px 16px 8px 36px',color:'white',fontSize:'0.84rem',fontFamily:'var(--font-sans)',boxSizing:'border-box',transition:'border-color 0.2s' }} />
                        </div>
                    </div>

                    {/* Preview stack of the latest videos — click to play */}
                    <div className="mh-hero-stack">
                        {(loading ? [0,1,2,3,4] : videos.slice(0,5)).map((v, i) => {
                            const rotations = [-10, -6, 0, 6, 10];
                            const offsets   = [{ top:70, left:0 }, { top:36, left:50 }, { top:13, left:100 }, { top:36, left:150 }, { top:70, left:200 }];
                            const baseZ     = [1, 2, 5, 3, 1];
                            const isHover   = !loading && heroHoverIdx === i;
                            return (
                                <div key={loading ? `sk-${i}` : (v.id ?? i)}
                                    className={`mh-hero-tile${loading ? ' mh-hero-sk' : ''}`}
                                    onMouseEnter={() => !loading && setHeroHoverIdx(i)}
                                    onMouseLeave={() => !loading && setHeroHoverIdx(null)}
                                    onClick={() => {
                                        if (loading) return;
                                        const fi = filtered.findIndex(fv => fv.id === v.id);
                                        openModal(v, fi === -1 ? 0 : fi);
                                    }}
                                    style={{
                                        top: offsets[i].top, left: offsets[i].left,
                                        zIndex: isHover ? 20 : baseZ[i],
                                        transform: `rotate(${isHover ? 0 : rotations[i]}deg) scale(${isHover ? 1.16 : 1})`,
                                        boxShadow: isHover ? '0 20px 40px rgba(0,17,34,0.55)' : undefined,
                                        cursor: loading ? 'default' : 'pointer',
                                        backgroundImage: (!loading && v.thumbnail_url) ? `url(${v.thumbnail_url})` : undefined,
                                    }}>
                                    {!loading && (<>
                                        {!v.thumbnail_url && (
                                            <div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center' }}>
                                                <Play size={24} fill="rgba(255,255,255,0.5)" color="rgba(255,255,255,0.5)" />
                                            </div>
                                        )}
                                        <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,transparent 45%,rgba(0,10,25,0.88) 100%)' }} />
                                        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width: isHover?'44px':'36px', height: isHover?'44px':'36px', borderRadius:'50%', background:'rgba(255,255,255,0.18)', backdropFilter:'blur(6px)', border:'1.5px solid rgba(255,255,255,0.45)', display:'flex', alignItems:'center', justifyContent:'center', opacity: isHover?1:0.85, transition:'all 0.25s' }}>
                                            <Play size={isHover?18:15} fill="white" color="white" style={{ marginLeft:'2px' }} />
                                        </div>
                                        <p style={{ position:'absolute', bottom:'8px', left:'10px', right:'10px', margin:0, color:'white', fontSize:'0.8rem', fontWeight:'700', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                                            {v.title}
                                        </p>
                                    </>)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Count strip ── */}
            <div style={{ background:'white',borderBottom:'1px solid #E2E8F0',padding:'0.6rem clamp(1rem,4vw,3rem)' }}>
                <div style={{ maxWidth:'1400px',margin:'0 auto',display:'flex',alignItems:'center',gap:'8px' }}>
                    <Film size={14} color="#003366" />
                    <span style={{ fontSize:'0.8rem',fontWeight:'700',color:'#1A202C' }}>
                        {loading ? 'Loading…' : `${filtered.length} video${filtered.length!==1?'s':''}`}
                    </span>
                    {search && <span style={{ fontSize:'0.75rem',color:'#64748B' }}>for "{search}"</span>}
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
