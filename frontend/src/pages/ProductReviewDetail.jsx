import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import {
    ShieldCheck, Star, ChevronLeft, ChevronRight, ExternalLink, Loader2, AlertCircle,
    FileText, Image as ImageIcon, Video, Download, User, CheckCircle2, FlaskConical,
    X, ZoomIn, Award, BarChart3, MessageSquare, Eye, Building,
} from 'lucide-react';
import { getProductById, submitUserReview, deleteUserReview, getEvidenceDownloadUrl } from '../api/productReviews.js';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import { formatDate } from '../utils/dateFormatter.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Normalizes to exactly one "v" prefix regardless of whether the admin typed
// it themselves (e.g. "v2.4.1") or not (e.g. "2.4.1") — avoids "vv2.4.1".
const formatVersion = (v) => v ? `v${String(v).trim().replace(/^v+/i, '')}` : null;

const StarRating = ({ rating, size = 16 }) => {
    const filled = Math.round(Number(rating) || 0);
    return (
        <span style={{ display: 'inline-flex', gap: '2px' }}>
            {[1,2,3,4,5].map((i) => (
                <Star key={i} size={size} fill={i <= filled ? '#F59E0B' : 'none'} color={i <= filled ? '#F59E0B' : '#CBD5E1'} strokeWidth={1.5} />
            ))}
        </span>
    );
};

const ClickableStars = ({ value, onChange, size = 26 }) => {
    const [hover, setHover] = useState(0);
    const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', gap: '5px', cursor: 'pointer' }}>
                {[1,2,3,4,5].map((i) => (
                    <Star key={i} size={size} fill={(hover||value) >= i ? '#F59E0B' : 'none'} color={(hover||value) >= i ? '#F59E0B' : '#CBD5E1'} strokeWidth={1.5}
                        style={{ cursor: 'pointer', transition: 'transform 0.12s', transform: (hover||value) >= i ? 'scale(1.15)' : 'scale(1)' }}
                        onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} onClick={() => onChange(i)} />
                ))}
            </span>
            {(hover||value) > 0 && <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#D97706', minWidth: '70px' }}>{labels[hover||value]}</span>}
        </div>
    );
};

const EvidenceIcon = ({ fileType }) => {
    if (!fileType)                                                      return <FileText size={20} color="#64748B" />;
    if (fileType.startsWith('image/'))                                  return <ImageIcon size={20} color="#0284C7" />;
    if (fileType.startsWith('video/'))                                  return <Video size={20} color="#7C3AED" />;
    if (fileType === 'application/pdf')                                 return <FileText size={20} color="#DC2626" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileText size={20} color="#16A34A" />;
    if (fileType.includes('word') || fileType.includes('document'))     return <FileText size={20} color="#1D4ED8" />;
    return <FileText size={20} color="#64748B" />;
};

const ScoreBadge = ({ score }) => {
    if (score == null) return <span style={{ color: '#94A3B8', fontSize: '0.82rem' }}>—</span>;
    const n = parseFloat(score);
    const color = n >= 8 ? '#15803D' : n >= 6 ? '#D97706' : '#DC2626';
    const bg    = n >= 8 ? '#F0FDF4' : n >= 6 ? '#FFFBEB' : '#FEF2F2';
    const border= n >= 8 ? '#BBF7D0' : n >= 6 ? '#FDE68A' : '#FECACA';
    const pct   = Math.round((n / 10) * 100);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '60px' }}>
            <span style={{ background: bg, color, border: `1px solid ${border}`, fontWeight: '800', fontSize: '1rem', padding: '4px 10px', borderRadius: '8px', lineHeight: '1' }}>{n}</span>
            <div style={{ width: '50px', height: '4px', background: '#E2E8F0', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '99px', transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ fontSize: '0.62rem', color: '#94A3B8', fontWeight: '600' }}>/ 10</span>
        </div>
    );
};

// ─── Lightbox ─────────────────────────────────────────────────────────────────
const Lightbox = ({ media, index, onClose, onNav }) => {
    const item = media[index];
    useEffect(() => {
        const handle = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') onNav(1);
            if (e.key === 'ArrowLeft') onNav(-1);
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [onClose, onNav]);
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', alignItems: 'center' }}>
                {media.length > 1 && (
                    <button onClick={() => onNav(-1)} style={{ position: 'absolute', left: '-48px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
                        <ChevronLeft size={22} />
                    </button>
                )}
                {item?.type === 'video' ? (
                    <video controls autoPlay style={{ maxWidth: '85vw', maxHeight: '80vh', borderRadius: '10px' }}><source src={item.url} /></video>
                ) : (
                    <img src={item?.url} alt={item?.label || ''} style={{ maxWidth: '85vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: '10px', display: 'block' }} />
                )}
                {media.length > 1 && (
                    <button onClick={() => onNav(1)} style={{ position: 'absolute', right: '-48px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
                        <ChevronRight size={22} />
                    </button>
                )}
                <button onClick={onClose} style={{ position: 'absolute', top: '-44px', right: 0, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}><X size={18} /></button>
                {media.length > 1 && <span style={{ position: 'absolute', bottom: '-36px', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontWeight: '600' }}>{index + 1} / {media.length}</span>}
            </div>
        </div>
    );
};

// ─── Evidence viewer modal ──────────────────────────────────────────────────────
// Sized to the content: images/video get a viewport-relative box, PDFs and Office
// docs (via the Google Docs Viewer embed) get a fixed reading panel with a
// blocked-iframe fallback, everything else gets a simple "can't preview" card.
const getEvidenceViewType = (fileType) => {
    if (!fileType) return 'other';
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType === 'application/pdf') return 'pdf';
    if (fileType.includes('word') || fileType.includes('document') || fileType.includes('spreadsheet') || fileType.includes('excel')) return 'office';
    return 'other';
};

const DocPanel = ({ evidence, src, onClose, onDownload }) => {
    const [state, setState] = useState('loading'); // loading → loaded | failed

    useEffect(() => {
        setState('loading');
        const timer = setTimeout(() => setState(prev => prev === 'loading' ? 'failed' : prev), 4000);
        return () => clearTimeout(timer);
    }, [src]);

    return (
        <div style={{ width: 'min(900px, 95vw)', height: '88vh', borderRadius: 10, overflow: 'hidden', background: '#F8FAFC', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <EvidenceIcon fileType={evidence.file_type} />
                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evidence.file_name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <button onClick={onDownload} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#003366', color: 'white', border: 'none', fontSize: '0.79rem', fontWeight: '700', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}><Download size={13} /> Download</button>
                    <div style={{ width: 1, height: 24, background: '#E2E8F0' }} />
                    <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: '#64748B', display: 'flex' }}><X size={20} /></button>
                </div>
            </div>
            <div style={{ flex: 1, position: 'relative', background: '#F1F5F9', overflow: 'hidden' }}>
                {state === 'loading' && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#F8FAFC' }}>
                        <Loader2 size={30} style={{ animation: 'spin 1s linear infinite' }} color="#003366" />
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B', fontWeight: '600' }}>Loading document…</p>
                    </div>
                )}
                {state === 'failed' && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#F8FAFC', padding: '2rem' }}>
                        <AlertCircle size={32} color="#D97706" />
                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#1E293B', textAlign: 'center' }}>Inline preview unavailable</p>
                        <button onClick={onDownload} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#003366', color: 'white', border: 'none', fontSize: '0.875rem', fontWeight: '700', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}><Download size={15} /> Download Instead</button>
                    </div>
                )}
                <iframe src={src} title={evidence.file_name} onLoad={() => setState('loaded')} onError={() => setState('failed')}
                    style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', inset: 0, opacity: state === 'loaded' ? 1 : 0, transition: 'opacity 0.3s ease', pointerEvents: state === 'loaded' ? 'auto' : 'none' }} />
            </div>
        </div>
    );
};

const EvidenceModal = ({ evidence, onClose, onDownload }) => {
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
    }, [onClose]);

    if (!evidence) return null;
    const viewType = getEvidenceViewType(evidence.file_type);

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', maxWidth: '95vw', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
                {(viewType === 'image' || viewType === 'video') && (
                    <button onClick={onClose} style={{ position: 'absolute', top: '-44px', right: 0, width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}><X size={18} /></button>
                )}
                {viewType === 'image' && <img src={evidence.file_url} alt={evidence.file_name} style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }} />}
                {viewType === 'video' && <video src={evidence.file_url} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }} />}
                {viewType === 'pdf' && <DocPanel evidence={evidence} src={`${evidence.file_url}#toolbar=1`} onClose={onClose} onDownload={onDownload} />}
                {viewType === 'office' && <DocPanel evidence={evidence} src={`https://docs.google.com/viewer?url=${encodeURIComponent(evidence.file_url)}&embedded=true`} onClose={onClose} onDownload={onDownload} />}
                {viewType === 'other' && (
                    <div style={{ width: 'min(420px, 90vw)', background: 'white', borderRadius: 14, padding: '2rem', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                        <button onClick={onClose} style={{ position: 'absolute', top: '-44px', right: 0, width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}><X size={18} /></button>
                        <div style={{ width: 56, height: 56, borderRadius: 14, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}><EvidenceIcon fileType={evidence.file_type} /></div>
                        <p style={{ margin: '0 0 0.4rem', fontSize: '0.95rem', fontWeight: '700', color: '#1E293B', wordBreak: 'break-word' }}>{evidence.file_name}</p>
                        <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', color: '#64748B' }}>This file type can't be previewed in the browser.</p>
                        <button onClick={onDownload} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#003366', color: 'white', border: 'none', fontSize: '0.875rem', fontWeight: '700', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}><Download size={15} /> Download</button>
                    </div>
                )}
                {viewType === 'image' && evidence.file_name && (
                    <p style={{ textAlign: 'center', margin: '0.5rem 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>{evidence.file_name}</p>
                )}
            </div>
        </div>,
        document.body
    );
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
    { key: 'about',   label: 'Overview',     icon: Eye },
    { key: 'tests',   label: 'Test Results and Evidences', icon: BarChart3 },
    { key: 'reviews', label: 'Reviews',      icon: MessageSquare },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
const ProductReviewDetail = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const { showToast } = useToast();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('about');
    const [galleryIndex, setGalleryIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [viewingEvidence, setViewingEvidence] = useState(null);
    const [viewingLogo, setViewingLogo] = useState(null);
    const thumbsRef = useRef(null);

    const [reviewRating, setReviewRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [deletingReview, setDeletingReview] = useState(false);

    useEffect(() => { document.title = 'Product Review | AI Risk Council'; }, []);

    const fetchProduct = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await getProductById(id);
            const data = res.data?.data;
            setProduct(data);
            document.title = `${data?.name ?? 'Product'} Review | AI Risk Council`;
            if (user && data?.userReviews) {
                const existing = data.userReviews.find((r) => r.user_id === user.id);
                if (existing) { setReviewRating(existing.rating); setReviewComment(existing.comment || ''); }
            }
        } catch (err) { setError(getErrorMessage(err)); }
        finally { setLoading(false); }
    }, [id, user]);

    useEffect(() => { fetchProduct(); }, [fetchProduct]);

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!reviewRating) { showToast('Please select a rating.', 'error'); return; }
        setSubmittingReview(true);
        try { await submitUserReview(id, { rating: reviewRating, comment: reviewComment }); showToast('Review submitted!', 'success'); fetchProduct(); }
        catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setSubmittingReview(false); }
    };

    const handleDeleteOwnReview = async (reviewId) => {
        setDeletingReview(true);
        try { await deleteUserReview(id, reviewId); showToast('Review deleted.', 'success'); setReviewRating(0); setReviewComment(''); fetchProduct(); }
        catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setDeletingReview(false); }
    };

    const handleDownloadEvidence = async (evidence) => {
        try {
            const res = await getEvidenceDownloadUrl(id, evidence.id);
            window.location.href = res.data?.url;
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
    };

    const navGallery = useCallback((dir) => {
        setGalleryIndex(prev => {
            const media = product?.media || [];
            const next = prev + dir;
            if (next < 0) return media.length - 1;
            if (next >= media.length) return 0;
            return next;
        });
    }, [product]);

    if (loading) return (
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.25rem', color: '#64748B' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg, #003366, #0284C7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={28} color="white" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: '600' }}>Loading product review…</p>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    if (error) return (
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: '#EF4444', padding: '2rem' }}>
            <AlertCircle size={40} style={{ opacity: 0.7 }} />
            <p style={{ margin: 0, fontWeight: '600' }}>{error}</p>
            <Link to="/services/product-reviews" style={{ color: '#003366', fontSize: '0.85rem', fontWeight: '700' }}>← Back to Product Reviews</Link>
        </div>
    );

    if (!product) return null;

    const { media = [], featureTests = [], evidences = [], userReviews = [] } = product;
    const keyFeatures = (Array.isArray(product.key_features) ? product.key_features : (product.key_features ? [product.key_features] : []))
        .map((f) => (typeof f === 'string' ? { name: f, description: '' } : f));
    const userOwnReview = user ? userReviews.find((r) => r.user_id === user.id) : null;
    const otherReviews = userOwnReview ? userReviews.filter((r) => r.id !== userOwnReview.id) : userReviews;
    const avgScore = featureTests.filter(ft => ft.score != null).length > 0
        ? (featureTests.reduce((s, ft) => s + (parseFloat(ft.score) || 0), 0) / featureTests.filter(ft => ft.score != null).length).toFixed(1)
        : null;
    const currentItem = media[galleryIndex];

    return (
        <>
            <style>{`
                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
                .prd-tab-btn:hover { color: #003366 !important; background: rgba(255,255,255,0.95) !important; }
                .prd-tab-btn:hover span { background: #EFF6FF !important; color: #003366 !important; }
                .prd-thumb:hover { border-color: #F59E0B !important; opacity: 1 !important; }
                .prd-logo-btn:hover { transform: scale(1.06); box-shadow: 0 8px 24px rgba(0,0,0,0.4) !important; }
                .prd-review-card:hover { box-shadow: 0 6px 24px rgba(0,51,102,0.09) !important; transform: translateY(-2px) !important; }
                .prd-evidence-card:hover { box-shadow: 0 6px 20px rgba(0,51,102,0.10) !important; transform: translateY(-2px); }
                .prd-feature-row:hover { background: #F8FAFC !important; }
                .prd-gallery-main:hover .prd-zoom-hint { opacity: 1 !important; }
                /* Hide Lightbox nav arrows on very small screens */
                @media (max-width:480px) {
                    .lb-nav { display: none !important; }
                }
            `}</style>

            {/* ── Hero ── */}
            <div style={{ background: 'linear-gradient(135deg, #001830 0%, #002f5c 55%, #004080 100%)', padding: 'clamp(2rem,5vw,3.5rem) clamp(1rem,4vw,2rem) 0', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
                <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
                    <Link to="/services/product-reviews"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#93C5FD', fontSize: '0.82rem', fontWeight: '600', textDecoration: 'none', marginBottom: '2rem', opacity: 0.85 }}
                        onMouseOver={e => e.currentTarget.style.opacity = '1'}
                        onMouseOut={e => e.currentTarget.style.opacity = '0.85'}>
                        <ChevronLeft size={15} /> Back to Product Reviews
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '2.5rem', flexWrap: 'wrap', animation: 'fadeUp 0.45s ease' }}>
                        {/* LEFT — product identity, description, vendor */}
                        <div style={{ flex: '1 1 340px', minWidth: 'min(300px, 100%)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
                                {product.product_logo_url ? (
                                    <button onClick={() => setViewingLogo({ url: product.product_logo_url, label: `${product.name} logo` })} title="Click to view full size"
                                        className="prd-logo-btn"
                                        style={{ width: '76px', height: '76px', borderRadius: '50%', background: 'linear-gradient(155deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05))', border: '1.5px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'zoom-in', boxShadow: '0 8px 22px rgba(0,0,0,0.38)', transition: 'transform 0.15s, box-shadow 0.15s', overflow: 'hidden' }}>
                                        <img src={product.product_logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                    </button>
                                ) : (
                                    <div style={{ width: '76px', height: '76px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backdropFilter: 'blur(6px)' }}>
                                        <ShieldCheck size={34} color="white" />
                                    </div>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap', rowGap: '0.5rem' }}>
                                    <h1 style={{ margin: 0, color: 'white', fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: '800', lineHeight: '1.15', letterSpacing: '-0.02em' }}>{product.name}</h1>
                                    {product.category && <span style={{ background: 'rgba(255,255,255,0.14)', color: 'white', fontSize: '0.85rem', fontWeight: '700', padding: '6px 14px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{product.category}</span>}
                                    {product.version_tested && <span style={{ background: 'rgba(245,158,11,0.22)', color: '#FCD34D', fontSize: '0.85rem', fontWeight: '700', padding: '6px 14px', borderRadius: '100px', border: '1px solid rgba(245,158,11,0.35)' }}>{formatVersion(product.version_tested)}</span>}
                                </div>
                            </div>

                            {product.short_description && (
                                <p style={{ margin: '0 0 1.25rem', color: '#CBD5E1', fontSize: '0.9rem', lineHeight: '1.65', maxWidth: '480px' }}>{product.short_description}</p>
                            )}

                            {/* Vendor */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {product.company_logo_url ? (
                                    <button onClick={() => setViewingLogo({ url: product.company_logo_url, label: `${product.vendor} logo` })} title="Click to view full size"
                                        className="prd-logo-btn"
                                        style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'linear-gradient(155deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05))', border: '1.5px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'zoom-in', boxShadow: '0 4px 14px rgba(0,0,0,0.35)', transition: 'transform 0.15s, box-shadow 0.15s', overflow: 'hidden' }}>
                                        <img src={product.company_logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                    </button>
                                ) : (
                                    <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Building size={20} color="white" />
                                    </div>
                                )}
                                <div>
                                    <p style={{ margin: '0 0 2px', fontSize: '0.68rem', fontWeight: '700', color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Vendor</p>
                                    <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'white', letterSpacing: '-0.01em', lineHeight: '1.2' }}>{product.vendor}</p>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT — rating, score & CTA */}
                        <div style={{ flex: '0 1 280px', minWidth: 'min(250px, 100%)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '16px', padding: '1.25rem 1.4rem', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                            <div>
                                <p style={{ margin: '0 0 6px', fontSize: '0.68rem', fontWeight: '700', color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Rating</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                                    <StarRating rating={product.avg_rating} size={19} />
                                    <span style={{ color: 'white', fontWeight: '800', fontSize: '1.3rem' }}>{Number(product.avg_rating).toFixed(1)}</span>
                                    <span style={{ color: '#93C5FD', fontSize: '0.82rem' }}>({product.review_count} review{product.review_count !== 1 ? 's' : ''})</span>
                                </div>
                            </div>
                            {avgScore && (
                                <div>
                                    <p style={{ margin: '0 0 6px', fontSize: '0.68rem', fontWeight: '700', color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Avg Test Score</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                        <Award size={19} color="#FCD34D" />
                                        <span style={{ color: '#FCD34D', fontWeight: '800', fontSize: '1.3rem' }}>{avgScore}<span style={{ fontSize: '0.85rem', fontWeight: '600' }}>/10</span></span>
                                    </div>
                                </div>
                            )}
                            {product.portal_url && (
                                <>
                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)' }} />
                                    <a href={product.portal_url} target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#F59E0B', color: '#001830', padding: '0.8rem 1.5rem', borderRadius: '10px', fontWeight: '800', fontSize: '0.9rem', textDecoration: 'none', boxShadow: '0 4px 14px rgba(245,158,11,0.35)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                                        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(245,158,11,0.45)'; }}
                                        onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(245,158,11,0.35)'; }}>
                                        Visit Portal <ExternalLink size={15} />
                                    </a>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Tabs — scroll on mobile */}
                    <div style={{ display: 'flex', marginTop: '1.5rem', gap: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
                        {TABS.map(({ key, label, icon: Icon }) => {
                            const active = activeTab === key;
                            const count = key === 'reviews' ? product.review_count : key === 'tests' ? featureTests.length : null;
                            return (
                                <button key={key} className="prd-tab-btn" onClick={() => setActiveTab(key)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '0.85rem clamp(0.85rem,2vw,1.3rem)', background: active ? 'white' : 'transparent', border: 'none', borderRadius: '10px 10px 0 0', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.84rem', fontWeight: '700', color: active ? '#003366' : 'rgb(249, 249, 249)', whiteSpace: 'nowrap', transition: 'color 0.15s, background 0.15s', marginRight: '3px', flexShrink: 0 }}>
                                    <Icon size={14} />
                                    {label}
                                    {count != null && count > 0 && (
                                        <span style={{ background: active ? '#EFF6FF' : 'rgba(255,255,255,0.2)', color: active ? '#003366' : 'rgba(255,255,255,0.9)', fontSize: '0.66rem', fontWeight: '800', padding: '1px 7px', borderRadius: '100px' }}>{count}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Tab Content ── */}
            <div style={{ background: '#F1F5F9', padding: 'clamp(1.25rem,2vw,2rem) clamp(1rem,3vw,2rem) 3rem', minHeight: '55vh' }}>
                <div style={{ maxWidth: '1140px', margin: '0 auto', animation: 'fadeUp 0.35s ease' }}>

                    {/* ══ OVERVIEW ══ */}
                    {activeTab === 'about' && (
                        <div style={{ display: 'grid', gridTemplateColumns: media.length ? 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))' : '1fr', gap: '1.75rem', alignItems: 'start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {media.length > 0 && (
                                    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                                        <div className="prd-gallery-main" style={{ position: 'relative', background: '#0F172A', cursor: 'zoom-in', overflow: 'hidden' }} onClick={() => setLightboxOpen(true)}>
                                            {currentItem?.type === 'video' ? (
                                                <video key={currentItem.url} controls style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }} onClick={e => e.stopPropagation()}>
                                                    <source src={currentItem.url} />
                                                </video>
                                            ) : (
                                                <img src={currentItem?.url} alt={currentItem?.label || product.name} style={{ width: '100%', height: 'clamp(200px, 35vw, 360px)', objectFit: 'contain', display: 'block' }} />
                                            )}
                                            <div className="prd-zoom-hint" style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.55)', color: 'white', borderRadius: '8px', padding: '5px 10px', fontSize: '0.72rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px', opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none' }}>
                                                <ZoomIn size={12} /> Click to enlarge
                                            </div>
                                            {media.length > 1 && (<>
                                                <button className="lb-nav" onClick={e => { e.stopPropagation(); navGallery(-1); }} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0.45)'}><ChevronLeft size={18} /></button>
                                                <button className="lb-nav" onClick={e => { e.stopPropagation(); navGallery(1); }} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0.45)'}><ChevronRight size={18} /></button>
                                            </>)}
                                        </div>
                                        {media.length > 1 && (
                                            <div ref={thumbsRef} style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', overflowX: 'auto', background: '#0F172A' }}>
                                                {media.map((item, idx) => (
                                                    <button key={item.id} className="prd-thumb" onClick={() => setGalleryIndex(idx)}
                                                        style={{ flexShrink: 0, width: '76px', height: '54px', borderRadius: '7px', border: `2px solid ${idx === galleryIndex ? '#F59E0B' : 'rgba(255,255,255,0.15)'}`, background: '#1E293B', cursor: 'pointer', overflow: 'hidden', padding: 0, opacity: idx === galleryIndex ? 1 : 0.6, transition: 'border-color 0.15s, opacity 0.15s' }}>
                                                        {item.type === 'video' ? (
                                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#334155' }}><Video size={18} color="#94A3B8" /></div>
                                                        ) : (
                                                            <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: 'clamp(1.25rem,3vw,2rem)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                    <h2 style={{ margin: '0 0 1rem', fontSize: '1.05rem', fontWeight: '800', color: '#003366', display: 'flex', alignItems: 'center', gap: '8px' }}><ShieldCheck size={17} color="#003366" /> Overview</h2>
                                    <p style={{ margin: 0, color: '#475569', lineHeight: '1.85', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{product.overview || product.short_description || 'No overview available.'}</p>
                                    {keyFeatures.length > 0 && (
                                        <>
                                            <h3 style={{ margin: '1.75rem 0 0.85rem', fontSize: '0.93rem', fontWeight: '800', color: '#1E293B' }}>Key Features</h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px,100%), 1fr))', gap: '0.6rem' }}>
                                                {keyFeatures.map((f, i) => (
                                                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.65rem 0.85rem' }}>
                                                        <CheckCircle2 size={14} color="#003366" style={{ flexShrink: 0, marginTop: '2px' }} />
                                                        <span style={{ fontSize: '0.855rem', color: '#334155', lineHeight: '1.5' }}>
                                                            <span style={{ fontWeight: '700' }}>{f.name}</span>
                                                            {f.description && <><br /><span style={{ fontSize: '0.8rem', color: '#64748B' }}>{f.description}</span></>}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            {/* Sidebar */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: 'clamp(1rem,2.5vw,1.5rem)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                    <h3 style={{ margin: '0 0 1.1rem', fontSize: '0.82rem', fontWeight: '800', color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Product Details</h3>
                                    {[
                                        { label: 'Vendor',         value: product.vendor },
                                        { label: 'Category',       value: product.category },
                                        { label: 'Version Tested', value: formatVersion(product.version_tested) },
                                        { label: 'Total Reviews',  value: `${product.review_count} review${product.review_count !== 1 ? 's' : ''}` },
                                        { label: 'Avg Rating',     value: `${Number(product.avg_rating).toFixed(1)} / 5.0` },
                                        { label: 'Added',          value: formatDate(product.created_at) },
                                    ].filter(d => d.value).map(({ label, value }) => (
                                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', padding: '0.65rem 0', borderBottom: '1px solid #F1F5F9' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{label}</span>
                                            <span style={{ fontSize: '0.83rem', color: '#1E293B', fontWeight: '600', textAlign: 'right' }}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                                {featureTests.length > 0 && avgScore && (
                                    <div style={{ background: 'linear-gradient(135deg, #003366, #0055a4)', borderRadius: '16px', padding: 'clamp(1rem,2.5vw,1.5rem)', color: 'white' }}>
                                        <p style={{ margin: '0 0 0.25rem', fontSize: '0.72rem', fontWeight: '700', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Assessment Score</p>
                                        <p style={{ margin: '0 0 0.75rem', fontSize: '2.2rem', fontWeight: '900', lineHeight: '1', color:'white'}}>{avgScore}<span style={{ fontSize: '1rem', fontWeight: '600', color:'white' }}>/10</span></p>
                                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)' }}>Based on {featureTests.filter(ft => ft.score != null).length} tested feature{featureTests.length !== 1 ? 's' : ''}</p>
                                        <button onClick={() => setActiveTab('tests')} style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px', padding: '7px 14px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}><BarChart3 size={13} /> View All Tests</button>
                                    </div>
                                )}
                                {product.portal_url && (
                                    <a href={product.portal_url} target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#003366', color: 'white', padding: '0.9rem 1.5rem', borderRadius: '10px', fontWeight: '700', fontSize: '0.88rem', textDecoration: 'none', boxShadow: '0 4px 12px rgba(0,51,102,0.2)', transition: 'opacity 0.15s, transform 0.15s' }}
                                        onMouseOver={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                        onMouseOut={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                                        Visit Product Portal <ExternalLink size={14} />
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ══ FEATURE TESTS + EVIDENCE (unified) ══ */}
                    {activeTab === 'tests' && (() => {
                        const evidencesByTest = {}; const unassignedEvidence = [];
                        evidences.forEach(ev => {
                            if (ev.feature_test_id) { if (!evidencesByTest[ev.feature_test_id]) evidencesByTest[ev.feature_test_id] = []; evidencesByTest[ev.feature_test_id].push(ev); }
                            else unassignedEvidence.push(ev);
                        });
                        const EvidenceTile = ({ ev }) => {
                            const isImage = ev.file_type?.startsWith('image/');
                            return (
                                <div className="prd-evidence-card" style={{ flex: '1 1 120px', maxWidth: '150px', border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s, transform 0.15s' }}>
                                    <button onClick={() => setViewingEvidence(ev)} title="View" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '90px', border: 'none', padding: 0, cursor: 'pointer', background: '#F1F5F9' }}>
                                        {isImage ? <img src={ev.file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <EvidenceIcon fileType={ev.file_type} />}
                                    </button>
                                    <div style={{ padding: '0.5rem 0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span title={ev.file_name} style={{ flex: 1, minWidth: 0, fontSize: '0.72rem', fontWeight: '600', color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.file_name || 'Evidence'}</span>
                                        <button onClick={() => handleDownloadEvidence(ev)} title="Download" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', padding: 0, flexShrink: 0 }}><Download size={13} /></button>
                                    </div>
                                </div>
                            );
                        };
                        return (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#1E293B' }}>Feature Test Results</h2>
                                {avgScore && (
                                    <div style={{ background: 'linear-gradient(135deg, #003366, #0055a4)', color: 'white', borderRadius: '10px', padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <Award size={16} /><span style={{ fontWeight: '800', fontSize: '0.9rem' }}>Overall: {avgScore} / 10</span>
                                    </div>
                                )}
                            </div>
                            {featureTests.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '6rem 1rem', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', color: '#94A3B8' }}>
                                    <FlaskConical size={44} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.25 }} />
                                    <p style={{ margin: 0, fontWeight: '700' }}>No feature test results recorded yet.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                    {featureTests.map((ft, i) => (
                                        <div key={ft.id} className="prd-feature-row" style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', padding: 'clamp(0.85rem,2vw,1.25rem) clamp(1rem,2.5vw,1.5rem)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'background 0.15s' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.5rem', alignItems: 'center' }}>
                                                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '4px' }}>
                                                        <span style={{ width: '22px', height: '22px', background: '#EBF0F7', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '800', color: '#003366', flexShrink: 0 }}>{i + 1}</span>
                                                        <p style={{ margin: 0, fontWeight: '800', fontSize: '0.92rem', color: '#1E293B', overflowWrap: 'break-word' }}>{ft.feature_name}</p>
                                                    </div>
                                                    {ft.comments && <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B', lineHeight: '1.6', paddingLeft: '32px', overflowWrap: 'break-word' }}>{ft.comments}</p>}
                                                </div>
                                                <div style={{ flex: '0 1 130px', minWidth: '100px' }}>
                                                    <p style={{ margin: '0 0 2px', fontSize: '0.68rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Test Method</p>
                                                    <p style={{ margin: 0, fontSize: '0.83rem', color: '#334155', fontWeight: '600' }}>{ft.test_method || '—'}</p>
                                                </div>
                                                <div style={{ flex: '0 1 110px', minWidth: '90px' }}>
                                                    <p style={{ margin: '0 0 2px', fontSize: '0.68rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Result</p>
                                                    {ft.result ? (
                                                        <span style={{ display: 'inline-block', background: ft.result.toLowerCase().includes('pass') ? '#F0FDF4' : ft.result.toLowerCase().includes('fail') ? '#FEF2F2' : '#F8FAFC', color: ft.result.toLowerCase().includes('pass') ? '#15803D' : ft.result.toLowerCase().includes('fail') ? '#DC2626' : '#475569', padding: '2px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '0.8rem' }}>
                                                            {ft.result}
                                                        </span>
                                                    ) : <p style={{ margin: 0, fontSize: '0.83rem', color: '#94A3B8' }}>—</p>}
                                                </div>
                                                <div style={{ flex: '0 0 auto' }}>
                                                    <ScoreBadge score={ft.score} />
                                                </div>
                                            </div>
                                            {evidencesByTest[ft.id]?.length > 0 && (
                                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9' }}>
                                                    <p style={{ margin: '0 0 0.6rem', fontSize: '0.68rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evidence ({evidencesByTest[ft.id].length})</p>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                                                        {evidencesByTest[ft.id].map(ev => <EvidenceTile key={ev.id} ev={ev} />)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {unassignedEvidence.length > 0 && (
                                <div style={{ marginTop: '2rem' }}>
                                    <h3 style={{ margin: '0 0 0.85rem', fontSize: '0.97rem', fontWeight: '800', color: '#1E293B' }}>General Evidence</h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                                        {unassignedEvidence.map(ev => <EvidenceTile key={ev.id} ev={ev} />)}
                                    </div>
                                </div>
                            )}
                        </div>
                        );
                    })()}

                    {/* ══ REVIEWS ══ */}
                    {activeTab === 'reviews' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px,100%), 1fr))', gap: '2rem', alignItems: 'start' }}>
                            {/* Reviews list */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#1E293B' }}>User Reviews</h2>
                                    {product.review_count > 0 && (
                                        <span style={{ background: '#EFF6FF', color: '#003366', fontWeight: '800', fontSize: '0.78rem', padding: '3px 10px', borderRadius: '99px', border: '1px solid #BFDBFE' }}>{product.review_count} total</span>
                                    )}
                                </div>
                                {userOwnReview && (
                                    <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #F0F9FF)', borderRadius: '14px', border: '1px solid #BFDBFE', padding: 'clamp(1rem,2.5vw,1.25rem)', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(0,51,102,0.07)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <div>
                                                <span style={{ fontSize: '0.73rem', fontWeight: '800', color: '#1D4ED8', background: '#DBEAFE', padding: '2px 10px', borderRadius: '100px', letterSpacing: '0.03em' }}>✦ YOUR REVIEW</span>
                                                <div style={{ marginTop: '7px' }}><StarRating rating={userOwnReview.rating} size={15} /></div>
                                            </div>
                                            <button onClick={() => handleDeleteOwnReview(userOwnReview.id)} disabled={deletingReview}
                                                style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', opacity: deletingReview ? 0.5 : 1, fontFamily: 'inherit', borderRadius: '7px', padding: '4px 10px', flexShrink: 0 }}
                                                onMouseOver={e => e.currentTarget.style.background = '#FEE2E2'}
                                                onMouseOut={e => e.currentTarget.style.background = '#FEF2F2'}>
                                                {deletingReview ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : 'Delete'}
                                            </button>
                                        </div>
                                        {userOwnReview.comment && <p style={{ margin: '0 0 0.4rem', fontSize: '0.875rem', color: '#1E3A5F', lineHeight: '1.75', fontStyle: 'italic' }}>"{userOwnReview.comment}"</p>}
                                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748B', fontWeight: '600' }}>{formatDate(userOwnReview.created_at)}</p>
                                    </div>
                                )}
                                {otherReviews.length === 0 && !userOwnReview && (
                                    <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', color: '#94A3B8' }}>
                                        <MessageSquare size={38} style={{ display: 'block', margin: '0 auto 0.75rem', opacity: 0.25 }} />
                                        <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem' }}>No reviews yet. Be the first!</p>
                                    </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {otherReviews.map((r) => (
                                        <div key={r.id} className="prd-review-card" style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', padding: 'clamp(1rem,2.5vw,1.25rem) clamp(1rem,2.5vw,1.4rem)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'box-shadow 0.2s, transform 0.15s' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #003366, #0284C7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8rem', fontWeight: '800', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,51,102,0.25)' }}>
                                                    {r.user_name?.charAt(0)?.toUpperCase() || 'U'}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#1E293B' }}>{r.user_name || 'Member'}</p>
                                                    <StarRating rating={r.rating} size={12} />
                                                </div>
                                                <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: '600' }}>{formatDate(r.created_at)}</span>
                                            </div>
                                            {r.comment && <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569', lineHeight: '1.75' }}>{r.comment}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Review form */}
                            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: 'clamp(1.25rem,3vw,2rem)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                                {!user ? (
                                    <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                                        <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#EBF0F7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                            <User size={24} color="#003366" />
                                        </div>
                                        <p style={{ margin: '0 0 1.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: '600', lineHeight: '1.6' }}>Sign in to leave a review for this product</p>
                                        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#003366', color: 'white', padding: '0.75rem 1.75rem', borderRadius: '9px', fontWeight: '700', fontSize: '0.875rem', textDecoration: 'none', boxShadow: '0 4px 12px rgba(0,51,102,0.2)' }}>
                                            Log In to Review
                                        </Link>
                                    </div>
                                ) : (
                                    <>
                                        <h3 style={{ margin: '0 0 1.4rem', fontSize: '1rem', fontWeight: '800', color: '#1E293B' }}>
                                            {userOwnReview ? '✏️ Update Your Review' : '✍️ Write a Review'}
                                        </h3>
                                        <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Your Rating *</label>
                                                <ClickableStars value={reviewRating} onChange={setReviewRating} />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Comments <span style={{ fontWeight: '400', textTransform: 'none' }}>(optional)</span></label>
                                                <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={4} placeholder="Share your experience with this product…"
                                                    style={{ width: '100%', padding: '0.7rem 0.85rem', border: '1px solid #CBD5E1', borderRadius: '9px', fontSize: '0.875rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: '1.65', color: '#1E293B', transition: 'border-color 0.15s' }}
                                                    onFocus={e => e.currentTarget.style.borderColor = '#003366'}
                                                    onBlur={e => e.currentTarget.style.borderColor = '#CBD5E1'} />
                                            </div>
                                            <button type="submit" disabled={submittingReview || !reviewRating}
                                                style={{ background: reviewRating ? '#003366' : '#94A3B8', color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '9px', fontWeight: '700', fontSize: '0.9rem', cursor: reviewRating ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', opacity: submittingReview ? 0.7 : 1, transition: 'background 0.15s, transform 0.12s', boxShadow: reviewRating ? '0 4px 12px rgba(0,51,102,0.2)' : 'none' }}
                                                onMouseOver={e => { if (reviewRating && !submittingReview) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                                {submittingReview ? (<><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</>) : (userOwnReview ? 'Update Review' : 'Submit Review')}
                                            </button>
                                        </form>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {lightboxOpen && <Lightbox media={media} index={galleryIndex} onClose={() => setLightboxOpen(false)} onNav={(dir) => navGallery(dir)} />}
            {viewingEvidence && <EvidenceModal evidence={viewingEvidence} onClose={() => setViewingEvidence(null)} onDownload={() => handleDownloadEvidence(viewingEvidence)} />}
            {viewingLogo && <Lightbox media={[{ type: 'image', url: viewingLogo.url, label: viewingLogo.label }]} index={0} onClose={() => setViewingLogo(null)} onNav={() => {}} />}
        </>
    );
};

export default ProductReviewDetail;