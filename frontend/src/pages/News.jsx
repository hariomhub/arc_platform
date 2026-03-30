import { useState, useEffect } from 'react';
import { Globe, Search, Filter, Calendar, ExternalLink, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, X, TrendingUp, Sparkles, Newspaper, Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { createNews, updateNews, deleteNews, togglePublishNews } from '../api/news';

export default function News() {
    const { isAdmin, isExecutive } = useAuth();
    const canManageNews = isAdmin?.() || isExecutive?.();

    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSource, setSelectedSource] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [animateIn, setAnimateIn] = useState(false);
    const itemsPerPage = 12;

    // Admin modal state
    const [newsModal, setNewsModal] = useState(null); // null=closed, {}=create, {id,...}=edit
    const [newsForm, setNewsForm] = useState({ title: '', summary: '', link: '', image_url: '', is_published: true });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    const openCreate = () => { setNewsForm({ title: '', summary: '', link: '', image_url: '', is_published: true }); setSaveError(''); setNewsModal({}); };
    const openEdit = (article) => { setNewsForm({ title: article.title || '', summary: article.summary || '', link: article.link || article.article_url || '', image_url: article.image_url || '', is_published: !!article.is_published }); setSaveError(''); setNewsModal(article); };
    const closeModal = () => { setNewsModal(null); setSaveError(''); };

    const handleSave = async () => {
        if (!newsForm.title.trim()) { setSaveError('Title is required.'); return; }
        setSaving(true); setSaveError('');
        try {
            if (newsModal?.id) {
                await updateNews(newsModal.id, newsForm);
            } else {
                await createNews(newsForm);
            }
            closeModal();
            fetchNews();
        } catch (e) {
            setSaveError(e.response?.data?.message || 'Save failed. Please try again.');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this news article? This cannot be undone.')) return;
        try { await deleteNews(id); fetchNews(); } catch { alert('Delete failed.'); }
    };

    const handleTogglePublish = async (article) => {
        try { await togglePublishNews(article.id); fetchNews(); } catch { alert('Failed to update publish status.'); }
    };

    // Fetch news articles
    useEffect(() => {
        fetchNews();
    }, [currentPage]);

    const fetchNews = async () => {
        setLoading(true);
        setError(null);
        setAnimateIn(false);
        try {
            const response = await axios.get('/news', {
                params: {
                    limit: 100, // Fetch more for client-side filtering
                }
            });
            setNews(response.data?.data || []);
            // Trigger animation after data loads
            setTimeout(() => setAnimateIn(true), 50);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load news articles');
        } finally {
            setLoading(false);
        }
    };

    // Filter and search news
    const filteredNews = news.filter(article => {
        const matchesSearch = !searchQuery || 
            article.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.summary?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesSource = selectedSource === 'all' || article.source === selectedSource;
        
        return matchesSearch && matchesSource;
    });

    // Pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedNews = filteredNews.slice(startIndex, endIndex);
    const calculatedTotalPages = Math.ceil(filteredNews.length / itemsPerPage);

    useEffect(() => {
        setTotalPages(calculatedTotalPages);
        if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
            setCurrentPage(1);
        }
    }, [filteredNews.length, calculatedTotalPages, currentPage]);

    // Get unique sources for filter
    const sources = ['all', ...new Set(news.map(article => article.source).filter(Boolean))];

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #F8FAFC 0%, #EFF6FF 100%)' }}>
            {/* Header */}
            <div style={{ 
                background: 'linear-gradient(135deg, #003366 0%, #004488 50%, #0055AA 100%)',
                color: 'white',
                padding: '5rem 2rem 4rem',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Animated background pattern */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    opacity: 0.1,
                    background: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.05) 35px, rgba(255,255,255,.05) 70px)',
                }} />
                
                <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    <div style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '16px', 
                        marginBottom: '1.5rem',
                        animation: 'fadeInDown 0.6s ease-out',
                    }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            padding: '12px',
                            borderRadius: '16px',
                            backdropFilter: 'blur(10px)',
                        }}>
                            <Newspaper size={40} strokeWidth={2} />
                        </div>
                        <h1 style={{ fontSize: '3rem', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>
                            Latest AI News & Updates
                        </h1>
                    </div>
                    <p style={{ 
                        fontSize: '1.2rem', 
                        opacity: 0.95, 
                        maxWidth: '700px', 
                        margin: '0 auto 2rem',
                        lineHeight: '1.6',
                        animation: 'fadeInUp 0.6s ease-out 0.2s backwards',
                    }}>
                        Stay informed with cutting-edge developments in AI governance, regulation, and risk management from trusted global sources
                    </p>
                    
                    {/* Stats badges */}
                    <div style={{ 
                        display: 'flex', 
                        gap: '1.5rem', 
                        justifyContent: 'center', 
                        flexWrap: 'wrap',
                        animation: 'fadeInUp 0.6s ease-out 0.4s backwards',
                    }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            backdropFilter: 'blur(10px)',
                            padding: '12px 24px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <TrendingUp size={20} />
                            <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>{news.length}</span>
                            <span style={{ opacity: 0.9 }}>Articles</span>
                        </div>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            backdropFilter: 'blur(10px)',
                            padding: '12px 24px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <Globe size={20} />
                            <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>{sources.length - 1}</span>
                            <span style={{ opacity: 0.9 }}>Sources</span>
                        </div>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            backdropFilter: 'blur(10px)',
                            padding: '12px 24px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <Sparkles size={20} />
                            <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>Live Updates</span>
                        </div>
                        {canManageNews && (
                            <button
                                onClick={openCreate}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    padding: '12px 24px', background: 'rgba(255,255,255,0.2)',
                                    border: '2px solid rgba(255,255,255,0.5)', color: 'white',
                                    borderRadius: '12px', fontWeight: '700', fontSize: '0.9rem',
                                    cursor: 'pointer', backdropFilter: 'blur(10px)',
                                    transition: 'all 0.2s',
                                }}
                                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.35)'; }}
                                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                            >
                                <Plus size={18} /> Add News Article
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Admin News Modal ─────────────────────────────────────── */}
            {newsModal !== null && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                    onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
                    <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
                        {/* Modal header */}
                        <div style={{ padding: '1.5rem 1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#1E293B' }}>
                                {newsModal?.id ? 'Edit News Article' : 'Add News Article'}
                            </h2>
                            <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px' }}><X size={20} /></button>
                        </div>
                        {/* Form */}
                        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {saveError && (
                                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 14px', color: '#DC2626', fontSize: '0.82rem', fontWeight: '600' }}>
                                    {saveError}
                                </div>
                            )}
                            {[
                                { key: 'title', label: 'Title *', placeholder: 'Article title' },
                                { key: 'summary', label: 'Summary', placeholder: 'Short summary or excerpt' },
                                { key: 'link', label: 'Article URL', placeholder: 'https://...' },
                                { key: 'image_url', label: 'Image URL', placeholder: 'https://...' },
                            ].map(({ key, label, placeholder }) => (
                                <div key={key}>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                                    {key === 'summary' ? (
                                        <textarea
                                            rows={3}
                                            value={newsForm[key]}
                                            onChange={e => setNewsForm(f => ({ ...f, [key]: e.target.value }))}
                                            placeholder={placeholder}
                                            style={{ width: '100%', padding: '10px 12px', border: '2px solid #E2E8F0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            value={newsForm[key]}
                                            onChange={e => setNewsForm(f => ({ ...f, [key]: e.target.value }))}
                                            placeholder={placeholder}
                                            style={{ width: '100%', padding: '10px 12px', border: '2px solid #E2E8F0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                    )}
                                </div>
                            ))}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                                <input type="checkbox" checked={newsForm.is_published} onChange={e => setNewsForm(f => ({ ...f, is_published: e.target.checked }))} />
                                Publish immediately
                            </label>
                        </div>
                        {/* Footer */}
                        <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button onClick={closeModal} style={{ padding: '0.65rem 1.25rem', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving} style={{ padding: '0.65rem 1.5rem', background: '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.875rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
                                {saving ? 'Saving…' : newsModal?.id ? 'Save Changes' : 'Publish Article'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Search and Filters */}
            <div style={{ 
                background: 'white', 
                borderBottom: '2px solid #E2E8F0', 
                padding: '1.75rem 2rem', 
                position: 'sticky', 
                top: 0, 
                zIndex: 10,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            }}>
                <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Search */}
                        <div style={{ flex: '1 1 350px', position: 'relative' }}>
                            <Search 
                                size={20} 
                                style={{ 
                                    position: 'absolute', 
                                    left: '16px', 
                                    top: '50%', 
                                    transform: 'translateY(-50%)', 
                                    color: '#94A3B8', 
                                    pointerEvents: 'none',
                                    transition: 'color 0.2s',
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Search news by title or keywords..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 3rem 0.875rem 3rem',
                                    border: '2px solid #E2E8F0',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'all 0.3s ease',
                                    background: '#F8FAFC',
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#003366';
                                    e.target.style.background = 'white';
                                    e.target.style.boxShadow = '0 0 0 4px rgba(0, 51, 102, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#E2E8F0';
                                    e.target.style.background = '#F8FAFC';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={{
                                        position: 'absolute',
                                        right: '16px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: '#E2E8F0',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '24px',
                                        height: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = '#CBD5E1';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = '#E2E8F0';
                                    }}
                                >
                                    <X size={14} color="#64748B" />
                                </button>
                            )}
                        </div>

                        {/* Source Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                background: '#EFF6FF',
                                padding: '10px',
                                borderRadius: '10px',
                            }}>
                                <Filter size={20} color="#003366" />
                            </div>
                            <select
                                value={selectedSource}
                                onChange={(e) => {
                                    setSelectedSource(e.target.value);
                                    setCurrentPage(1);
                                }}
                                style={{
                                    padding: '0.875rem 1.25rem',
                                    border: '2px solid #E2E8F0',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    background: '#F8FAFC',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    fontWeight: '600',
                                    color: '#1E293B',
                                    transition: 'all 0.2s',
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#003366';
                                    e.target.style.background = 'white';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#E2E8F0';
                                    e.target.style.background = '#F8FAFC';
                                }}
                            >
                                <option value="all">All Sources</option>
                                {sources.filter(s => s !== 'all').map(source => (
                                    <option key={source} value={source}>{source}</option>
                                ))}
                            </select>
                        </div>

                        {/* Results count */}
                        <div style={{ 
                            color: '#64748B', 
                            fontSize: '1rem', 
                            marginLeft: 'auto',
                            fontWeight: '600',
                            background: '#F1F5F9',
                            padding: '0.75rem 1.25rem',
                            borderRadius: '12px',
                        }}>
                            <span style={{ color: '#003366', fontWeight: '700' }}>{filteredNews.length}</span> article{filteredNews.length !== 1 ? 's' : ''} found
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
                {/* Loading */}
                {loading && (
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
                        gap: '2rem',
                    }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} style={{ 
                                background: 'white', 
                                borderRadius: '16px', 
                                overflow: 'hidden',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                                animation: 'fadeIn 0.5s ease-out',
                            }}>
                                <div style={{ 
                                    width: '100%', 
                                    height: '200px', 
                                    background: 'linear-gradient(90deg, #E2E8F0 0%, #F1F5F9 50%, #E2E8F0 100%)', 
                                    backgroundSize: '200% 100%',
                                    animation: 'shimmer 2s infinite',
                                }} />
                                <div style={{ padding: '1.5rem' }}>
                                    <div style={{ 
                                        width: '50%', 
                                        height: '24px', 
                                        background: 'linear-gradient(90deg, #E2E8F0 0%, #F1F5F9 50%, #E2E8F0 100%)', 
                                        backgroundSize: '200% 100%',
                                        borderRadius: '6px', 
                                        marginBottom: '1rem',
                                        animation: 'shimmer 2s infinite',
                                    }} />
                                    <div style={{ 
                                        width: '100%', 
                                        height: '20px', 
                                        background: 'linear-gradient(90deg, #E2E8F0 0%, #F1F5F9 50%, #E2E8F0 100%)', 
                                        backgroundSize: '200% 100%',
                                        borderRadius: '4px', 
                                        marginBottom: '0.5rem',
                                        animation: 'shimmer 2s infinite',
                                        animationDelay: '0.1s',
                                    }} />
                                    <div style={{ 
                                        width: '85%', 
                                        height: '20px', 
                                        background: 'linear-gradient(90deg, #E2E8F0 0%, #F1F5F9 50%, #E2E8F0 100%)', 
                                        backgroundSize: '200% 100%',
                                        borderRadius: '4px',
                                        animation: 'shimmer 2s infinite',
                                        animationDelay: '0.2s',
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Error */}
                {error && !loading && (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '4rem 2rem', 
                        background: 'white', 
                        borderRadius: '20px', 
                        border: '2px solid #FEE2E2',
                        boxShadow: '0 8px 24px rgba(239, 68, 68, 0.1)',
                        animation: 'fadeIn 0.5s ease-out',
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #FEE2E2, #FEF2F2)',
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem',
                        }}>
                            <AlertCircle size={40} color="#EF4444" />
                        </div>
                        <h3 style={{ color: '#DC2626', marginBottom: '0.75rem', fontSize: '1.5rem', fontWeight: '700' }}>
                            Oops! Something went wrong
                        </h3>
                        <p style={{ color: '#64748B', marginBottom: '2rem', fontSize: '1.05rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
                            {error}
                        </p>
                        <button
                            onClick={fetchNews}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '1rem 2rem',
                                background: 'linear-gradient(135deg, #003366, #004488)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: '700',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 12px rgba(0, 51, 102, 0.3)',
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 51, 102, 0.4)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 51, 102, 0.3)';
                            }}
                        >
                            <RefreshCw size={18} /> Try Again
                        </button>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && filteredNews.length === 0 && (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '5rem 2rem', 
                        background: 'white', 
                        borderRadius: '20px', 
                        border: '2px solid #E2E8F0',
                        animation: 'fadeIn 0.5s ease-out',
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #EFF6FF, #F8FAFC)',
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 2rem',
                        }}>
                            <Search size={48} color="#94A3B8" />
                        </div>
                        <h3 style={{ color: '#1E293B', marginBottom: '0.75rem', fontSize: '1.75rem', fontWeight: '700' }}>
                            No Articles Found
                        </h3>
                        <p style={{ color: '#64748B', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto 1.5rem', lineHeight: '1.6' }}>
                            We couldn't find any articles matching your search criteria. Try adjusting your filters or search terms.
                        </p>
                        {(searchQuery || selectedSource !== 'all') && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedSource('all');
                                    setCurrentPage(1);
                                }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '0.875rem 1.75rem',
                                    background: '#F1F5F9',
                                    color: '#003366',
                                    border: '2px solid #E2E8F0',
                                    borderRadius: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#E2E8F0';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = '#F1F5F9';
                                }}
                            >
                                <X size={16} /> Clear Filters
                            </button>
                        )}
                    </div>
                )}

                {/* News Grid */}
                {!loading && !error && paginatedNews.length > 0 && (
                    <>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
                            gap: '2rem',
                            marginBottom: '3rem',
                        }}>
                            {paginatedNews.map((article, index) => (
                                <article 
                                    key={article.id}
                                    style={{
                                        background: 'white',
                                        borderRadius: '20px',
                                        overflow: 'hidden',
                                        border: '2px solid #E2E8F0',
                                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        opacity: animateIn ? 1 : 0,
                                        transform: animateIn ? 'translateY(0)' : 'translateY(20px)',
                                        animation: `fadeInUp 0.6s ease-out ${index * 0.1}s forwards`,
                                        position: 'relative',
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 51, 102, 0.15)';
                                        e.currentTarget.style.transform = 'translateY(-8px)';
                                        e.currentTarget.style.borderColor = '#003366';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.borderColor = '#E2E8F0';
                                    }}
                                    onClick={() => {
                                        if (article.article_url || article.link) {
                                            window.open(article.article_url || article.link, '_blank', 'noopener,noreferrer');
                                        }
                                    }}
                                >
                                    {/* Featured badge for trending articles */}
                                    {!!article.is_trending && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '16px',
                                            right: '16px',
                                            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                                            color: '#1A202C',
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.7rem',
                                            fontWeight: '800',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            zIndex: 1,
                                            boxShadow: '0 4px 12px rgba(255, 215, 0, 0.4)',
                                        }}>
                                            <Sparkles size={12} />
                                            TRENDING
                                        </div>
                                    )}

                                    {/* Image */}
                                    {article.image_url ? (
                                        <div style={{ 
                                            width: '100%', 
                                            height: '220px', 
                                            overflow: 'hidden', 
                                            background: 'linear-gradient(135deg, #F1F5F9, #E2E8F0)',
                                            position: 'relative',
                                        }}>
                                            <img 
                                                src={article.image_url} 
                                                alt={article.title}
                                                style={{ 
                                                    width: '100%', 
                                                    height: '100%', 
                                                    objectFit: 'cover',
                                                    transition: 'transform 0.4s ease',
                                                }}
                                                onError={(e) => { 
                                                    e.target.parentElement.style.display = 'flex';
                                                    e.target.parentElement.style.alignItems = 'center';
                                                    e.target.parentElement.style.justifyContent = 'center';
                                                    e.target.style.display = 'none';
                                                    const placeholder = document.createElement('div');
                                                    placeholder.innerHTML = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`;
                                                    e.target.parentElement.appendChild(placeholder);
                                                }}
                                                onMouseOver={(e) => {
                                                    e.target.style.transform = 'scale(1.1)';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.target.style.transform = 'scale(1)';
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div style={{ 
                                            width: '100%', 
                                            height: '220px', 
                                            background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <Newspaper size={48} color="#94A3B8" strokeWidth={1.5} />
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div style={{ padding: '1.75rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        {/* Meta */}
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center', 
                                            marginBottom: '1rem', 
                                            gap: '0.75rem', 
                                            flexWrap: 'wrap',
                                        }}>
                                            <span style={{ 
                                                background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', 
                                                color: '#003366', 
                                                padding: '6px 16px', 
                                                borderRadius: '16px', 
                                                fontSize: '0.8rem', 
                                                fontWeight: '800',
                                                letterSpacing: '0.02em',
                                            }}>
                                                {article.source || 'News'}
                                            </span>
                                            <span style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '6px', 
                                                fontSize: '0.8rem', 
                                                color: '#64748B',
                                                fontWeight: '600',
                                            }}>
                                                <Calendar size={14} />
                                                {formatDate(article.published_at || article.created_at)}
                                            </span>
                                        </div>

                                        {/* Title */}
                                        <h3 style={{
                                            fontSize: '1.25rem',
                                            fontWeight: '800',
                                            color: '#1A202C',
                                            marginBottom: '1rem',
                                            lineHeight: '1.4',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            minHeight: '3.5rem',
                                        }}>
                                            {article.title}
                                        </h3>

                                        {/* Summary */}
                                        <p style={{
                                            fontSize: '0.95rem',
                                            color: '#64748B',
                                            lineHeight: '1.7',
                                            marginBottom: '1.25rem',
                                            flex: 1,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                        }}>
                                            {article.summary || 'No summary available. Click to read the full article.'}
                                        </p>

                                        {/* Read More Link */}
                                        {(article.article_url || article.link) && (
                                            <div style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '8px', 
                                                color: '#003366', 
                                                fontSize: '0.95rem', 
                                                fontWeight: '700',
                                                paddingTop: '1rem',
                                                borderTop: '2px solid #F1F5F9',
                                                transition: 'gap 0.3s ease',
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.gap = '12px';
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.gap = '8px';
                                            }}
                                            >
                                                Read Full Article
                                                <ExternalLink size={16} />
                                            </div>
                                        )}

                                        {/* Admin controls */}
                                        {canManageNews && (
                                            <div style={{ display: 'flex', gap: '6px', paddingTop: '0.75rem', borderTop: '1px dashed #E2E8F0', marginTop: '0.5rem' }}
                                                onClick={e => e.stopPropagation()}>
                                                <button onClick={() => openEdit(article)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: '#EFF6FF', color: '#003366', border: 'none', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                                                    <Edit2 size={11} /> Edit
                                                </button>
                                                <button onClick={() => handleTogglePublish(article)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: article.is_published ? '#FFFBEB' : '#F0FDF4', color: article.is_published ? '#D97706' : '#16A34A', border: 'none', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                                                    {article.is_published ? <><EyeOff size={11} /> Unpublish</> : <><Eye size={11} /> Publish</>}
                                                </button>
                                                <button onClick={() => handleDelete(article.id)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                                                    <Trash2 size={11} /> Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center', 
                                gap: '1.5rem',
                                padding: '3rem 0 2rem',
                            }}>
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '1rem 1.5rem',
                                        background: currentPage === 1 ? '#F1F5F9' : 'linear-gradient(135deg, #003366, #004488)',
                                        color: currentPage === 1 ? '#94A3B8' : 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontWeight: '700',
                                        fontSize: '0.95rem',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: currentPage === 1 ? 'none' : '0 4px 12px rgba(0, 51, 102, 0.2)',
                                    }}
                                    onMouseOver={(e) => {
                                        if (currentPage !== 1) {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 51, 102, 0.3)';
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = currentPage === 1 ? 'none' : '0 4px 12px rgba(0, 51, 102, 0.2)';
                                    }}
                                >
                                    <ChevronLeft size={20} />
                                    Previous
                                </button>

                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                style={{
                                                    width: '48px',
                                                    height: '48px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: currentPage === pageNum 
                                                        ? 'linear-gradient(135deg, #003366, #004488)' 
                                                        : 'white',
                                                    color: currentPage === pageNum ? 'white' : '#64748B',
                                                    border: currentPage === pageNum ? 'none' : '2px solid #E2E8F0',
                                                    borderRadius: '12px',
                                                    fontWeight: '700',
                                                    fontSize: '1rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s ease',
                                                    boxShadow: currentPage === pageNum 
                                                        ? '0 4px 12px rgba(0, 51, 102, 0.3)' 
                                                        : 'none',
                                                }}
                                                onMouseOver={(e) => {
                                                    if (currentPage !== pageNum) {
                                                        e.currentTarget.style.background = '#F8FAFC';
                                                        e.currentTarget.style.borderColor = '#003366';
                                                        e.currentTarget.style.transform = 'scale(1.05)';
                                                    }
                                                }}
                                                onMouseOut={(e) => {
                                                    if (currentPage !== pageNum) {
                                                        e.currentTarget.style.background = 'white';
                                                        e.currentTarget.style.borderColor = '#E2E8F0';
                                                        e.currentTarget.style.transform = 'scale(1)';
                                                    }
                                                }}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '1rem 1.5rem',
                                        background: currentPage === totalPages ? '#F1F5F9' : 'linear-gradient(135deg, #003366, #004488)',
                                        color: currentPage === totalPages ? '#94A3B8' : 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontWeight: '700',
                                        fontSize: '0.95rem',
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: currentPage === totalPages ? 'none' : '0 4px 12px rgba(0, 51, 102, 0.2)',
                                    }}
                                    onMouseOver={(e) => {
                                        if (currentPage !== totalPages) {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 51, 102, 0.3)';
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = currentPage === totalPages ? 'none' : '0 4px 12px rgba(0, 51, 102, 0.2)';
                                    }}
                                >
                                    Next
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { 
                        opacity: 0; 
                    }
                    to { 
                        opacity: 1; 
                    }
                }

                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes fadeInDown {
                    from {
                        opacity: 0;
                        transform: translateY(-30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes shimmer {
                    0% { 
                        background-position: 200% 0; 
                    }
                    100% { 
                        background-position: -200% 0; 
                    }
                }

                @keyframes pulse {
                    0%, 100% { 
                        opacity: 1; 
                    }
                    50% { 
                        opacity: 0.5; 
                    }
                }

                /* Smooth scrolling */
                html {
                    scroll-behavior: smooth;
                }

                /* Custom scrollbar */
                ::-webkit-scrollbar {
                    width: 12px;
                }

                ::-webkit-scrollbar-track {
                    background: #F1F5F9;
                }

                ::-webkit-scrollbar-thumb {
                    background: linear-gradient(135deg, #003366, #004488);
                    border-radius: 6px;
                }

                ::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(135deg, #004488, #0055AA);
                }

                /* Selection color */
                ::selection {
                    background: #DBEAFE;
                    color: #003366;
                }
            `}</style>
        </div>
    );
}
