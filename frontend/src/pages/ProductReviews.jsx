import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Star, Search, ChevronLeft, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { getProducts } from '../api/productReviews.js';
import { getErrorMessage } from '../utils/apiHelpers.js';

// ─── Star display helper ──────────────────────────────────────────────────────
const StarRating = ({ rating, size = 14 }) => {
    const filled = Math.round(Number(rating) || 0);
    return (
        <span style={{ display: 'inline-flex', gap: '2px' }}>
            {[1, 2, 3, 4, 5].map((i) => (
                <Star
                    key={i}
                    size={size}
                    fill={i <= filled ? '#F59E0B' : 'none'}
                    color={i <= filled ? '#F59E0B' : '#CBD5E1'}
                    strokeWidth={1.5}
                />
            ))}
        </span>
    );
};

// ─── Product Card ─────────────────────────────────────────────────────────────
const ProductCard = ({ product, onClick }) => (
    <div
        onClick={onClick}
        style={{
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'box-shadow 0.2s, transform 0.2s',
            display: 'flex',
            flexDirection: 'column',
        }}
        onMouseOver={(e) => {
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,51,102,0.13)';
            e.currentTarget.style.transform = 'translateY(-4px)';
        }}
        onMouseOut={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
            e.currentTarget.style.transform = 'translateY(0)';
        }}
    >
        {/* Top accent */}
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #003366, #0055A4)' }} />

        <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Icon + title */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{
                    width: '42px', height: '42px', borderRadius: '10px',
                    background: '#EFF6FF', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                }}>
                    <ShieldCheck size={22} color="#003366" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#1E293B', lineHeight: '1.3' }}>
                        {product.name}
                    </h3>
                    <span style={{
                        display: 'inline-block', marginTop: '4px',
                        fontSize: '0.72rem', fontWeight: '700', color: '#0055A4',
                        background: '#EFF6FF', padding: '2px 8px', borderRadius: '100px',
                    }}>
                        {product.vendor}
                    </span>
                </div>
            </div>

            {/* Category */}
            {product.category && (
                <span style={{
                    alignSelf: 'flex-start',
                    fontSize: '0.71rem', fontWeight: '700', textTransform: 'uppercase',
                    letterSpacing: '0.05em', color: '#64748B',
                    background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px',
                }}>
                    {product.category}
                </span>
            )}

            {/* Description */}
            <p style={{
                margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: '1.65',
                display: '-webkit-box', WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1,
            }}>
                {product.short_description || 'No description available.'}
            </p>

            {/* Rating row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.25rem' }}>
                <StarRating rating={product.avg_rating} />
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1E293B' }}>
                    {Number(product.avg_rating).toFixed(1)}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                    ({product.review_count} review{product.review_count !== 1 ? 's' : ''})
                </span>
            </div>
        </div>

        {/* CTA footer */}
        <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #F1F5F9',
            display: 'flex', justifyContent: 'flex-end',
        }}>
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                fontSize: '0.82rem', fontWeight: '700', color: '#003366',
            }}>
                View Review <ArrowRight size={14} />
            </span>
        </div>
    </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const ProductReviews = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    useEffect(() => { document.title = 'Product Reviews | AI Risk Council'; }, []);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await getProducts({ page, limit: 12, search: search || undefined });
            const payload = res.data;
            setProducts(Array.isArray(payload.data) ? payload.data : []);
            setTotalPages(payload.totalPages ?? 1);
            setTotal(payload.total ?? 0);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSearch(searchInput.trim());
        setPage(1);
    };

    const clearSearch = () => {
        setSearchInput('');
        setSearch('');
        setPage(1);
    };

    return (
        <>
            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <div style={{
                background: 'linear-gradient(135deg, #002244 0%, #003366 60%, #005599 100%)',
                padding: '4.5rem 2rem 3.5rem',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
                <div style={{ maxWidth: '720px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    {/* Back link */}
                    <Link
                        to="/services"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            color: '#93C5FD', fontSize: '0.82rem', fontWeight: '600',
                            textDecoration: 'none', marginBottom: '1.5rem',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.color = 'white')}
                        onMouseOut={(e) => (e.currentTarget.style.color = '#93C5FD')}
                    >
                        <ChevronLeft size={15} /> Back to Services
                    </Link>

                    <h1 style={{
                        color: 'white', fontSize: '2.5rem', fontWeight: '800',
                        marginBottom: '1rem', lineHeight: '1.15',
                        fontFamily: 'var(--font-serif)',
                    }}>
                        Product Reviews
                    </h1>
                    <p style={{ fontSize: '1.05rem', color: '#CBD5E1', lineHeight: '1.7', marginBottom: '2rem' }}>
                        Independent security assessments from our expert council members. Each product has been reviewed by paid members, executives, and product companies for real-world effectiveness.
                    </p>

                    {/* Search bar */}
                    <form onSubmit={handleSearch} style={{ display: 'flex', maxWidth: '480px', margin: '0 auto', gap: '8px' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                            <input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search products or vendors…"
                                style={{
                                    width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.2rem',
                                    borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
                                    background: 'rgba(255,255,255,0.1)', color: 'white',
                                    fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
                                    fontFamily: 'var(--font-sans)',
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            style={{
                                background: '#F59E0B', color: '#002244', border: 'none',
                                padding: '0.65rem 1.25rem', borderRadius: '8px',
                                fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer',
                                fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
                            }}
                        >
                            Search
                        </button>
                    </form>
                </div>
            </div>

            {/* ── Content ─────────────────────────────────────────────────── */}
            <div style={{ background: '#F8FAFC', padding: '3.5rem 2rem 5rem', minHeight: '60vh' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

                    {/* Result count / active search */}
                    {!loading && !error && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748B', fontWeight: '600' }}>
                                {search
                                    ? <>{total} result{total !== 1 ? 's' : ''} for "<strong style={{ color: '#1E293B' }}>{search}</strong>"</>
                                    : <>{total} product review{total !== 1 ? 's' : ''} available</>
                                }
                            </p>
                            {search && (
                                <button
                                    onClick={clearSearch}
                                    style={{
                                        background: 'none', border: '1px solid #CBD5E1',
                                        padding: '4px 12px', borderRadius: '6px',
                                        fontSize: '0.8rem', fontWeight: '600', color: '#64748B',
                                        cursor: 'pointer', fontFamily: 'var(--font-sans)',
                                    }}
                                >
                                    Clear search
                                </button>
                            )}
                        </div>
                    )}

                    {/* Loading state */}
                    {loading && (
                        <div style={{ textAlign: 'center', padding: '6rem 1rem', color: '#64748B' }}>
                            <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 1rem', opacity: 0.5 }} />
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>Loading products…</p>
                        </div>
                    )}

                    {/* Error state */}
                    {!loading && error && (
                        <div style={{ textAlign: 'center', padding: '5rem 1rem', color: '#EF4444' }}>
                            <AlertCircle size={36} style={{ display: 'block', margin: '0 auto 0.75rem', opacity: 0.7 }} />
                            <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>{error}</p>
                            <button
                                onClick={fetchProducts}
                                style={{
                                    background: '#003366', color: 'white', border: 'none',
                                    padding: '0.6rem 1.5rem', borderRadius: '8px',
                                    fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
                                    fontFamily: 'var(--font-sans)',
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Empty state */}
                    {!loading && !error && products.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '6rem 1rem', color: '#94A3B8' }}>
                            <ShieldCheck size={48} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.25 }} />
                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>No product reviews found.</p>
                            {search && <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>Try a different search term.</p>}
                        </div>
                    )}

                    {/* Product grid */}
                    {!loading && !error && products.length > 0 && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '1.5rem',
                        }}>
                            {products.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    onClick={() => navigate(`/services/product-reviews/${product.id}`)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '3rem', flexWrap: 'wrap' }}>
                            <button
                                disabled={page === 1}
                                onClick={() => setPage((p) => p - 1)}
                                style={{
                                    padding: '0.5rem 1rem', borderRadius: '8px',
                                    border: '1px solid #E2E8F0', background: 'white',
                                    fontSize: '0.82rem', fontWeight: '700', cursor: page === 1 ? 'not-allowed' : 'pointer',
                                    opacity: page === 1 ? 0.4 : 1, fontFamily: 'var(--font-sans)',
                                }}
                            >
                                ← Prev
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    style={{
                                        padding: '0.5rem 0.9rem', borderRadius: '8px',
                                        border: `1px solid ${p === page ? '#003366' : '#E2E8F0'}`,
                                        background: p === page ? '#003366' : 'white',
                                        color: p === page ? 'white' : '#475569',
                                        fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer',
                                        fontFamily: 'var(--font-sans)',
                                    }}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                style={{
                                    padding: '0.5rem 1rem', borderRadius: '8px',
                                    border: '1px solid #E2E8F0', background: 'white',
                                    fontSize: '0.82rem', fontWeight: '700', cursor: page === totalPages ? 'not-allowed' : 'pointer',
                                    opacity: page === totalPages ? 0.4 : 1, fontFamily: 'var(--font-sans)',
                                }}
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
        </>
    );
};

export default ProductReviews;
