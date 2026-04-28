import React, { useState } from 'react';
import { TrendingUp, Clock, MessageCircle, Tag, Search, X } from 'lucide-react';

const SORTS = [
    { key: 'trending',  label: 'Trending',  Icon: TrendingUp },
    { key: 'latest',    label: 'Latest',    Icon: Clock },
    { key: 'discussed', label: 'Discussed', Icon: MessageCircle },
];

const POST_TYPES = [
    { key: '',               label: 'All' },
    { key: 'ai_product',     label: 'AI Product' },
    { key: 'poll',           label: 'Poll' },
    { key: 'event',          label: 'Event' },
    { key: 'troubleshooting',label: 'Troubleshooting' },
    { key: 'general',        label: 'General' },
];

const FeedFilters = ({
    sort, onSortChange,
    search, onSearchChange,
    tagFilter, onTagFilterChange,
    postTypeFilter, onPostTypeFilterChange,
}) => {
    const [searchOpen,    setSearchOpen]    = useState(!!search);
    const [tagInputOpen,  setTagInputOpen]  = useState(false);
    const [tagInputValue, setTagInputValue] = useState('');

    return (
        <>
            <style>{`
                @keyframes ff-slide { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }

                .ff-card {
                    background: white;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                }

                /* ── Row base ── */
                .ff-row {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 0.55rem 0.875rem;
                    overflow-x: auto;
                    scrollbar-width: none;
                }
                .ff-row::-webkit-scrollbar { display: none; }

                /* Sort row sits above a hairline */
                .ff-row-sort {
                    border-bottom: 1px solid #f1f5f9;
                }

                /* ── Divider ── */
                .ff-div {
                    width: 1px; height: 16px;
                    background: #e2e8f0;
                    flex-shrink: 0;
                    margin: 0 2px;
                }

                /* ── Sort pill ── */
                .ff-sort-pill {
                    display: inline-flex; align-items: center; gap: 5px;
                    padding: 0.35rem 0.75rem;
                    border-radius: 6px;
                    border: 1px solid transparent;
                    background: transparent;
                    font-size: 0.78rem; font-weight: 600; color: #475569;
                    cursor: pointer; white-space: nowrap; font-family: inherit;
                    transition: all 0.12s;
                    flex-shrink: 0;
                }
                .ff-sort-pill:hover { background: #f1f5f9; color: #003366; }
                .ff-sort-pill.active {
                    background: #003366;
                    color: white;
                    border-color: #003366;
                }

                /* ── Type pill ── */
                .ff-type-pill {
                    display: inline-flex; align-items: center;
                    padding: 0.3rem 0.7rem;
                    border-radius: 5px;
                    border: 1px solid #e2e8f0;
                    background: transparent;
                    font-size: 0.74rem; font-weight: 600; color: #64748b;
                    cursor: pointer; white-space: nowrap; font-family: inherit;
                    transition: all 0.12s;
                    flex-shrink: 0;
                }
                .ff-type-pill:hover { border-color: #003366; color: #003366; background: #f0f5ff; }
                .ff-type-pill.active {
                    background: #003366;
                    color: white;
                    border-color: #003366;
                }

                /* ── Icon action button ── */
                .ff-icon-btn {
                    display: inline-flex; align-items: center; gap: 5px;
                    padding: 0.35rem 0.7rem;
                    border-radius: 6px;
                    border: 1px solid transparent;
                    background: transparent;
                    font-size: 0.78rem; font-weight: 600; color: #64748b;
                    cursor: pointer; white-space: nowrap; font-family: inherit;
                    transition: all 0.12s;
                    flex-shrink: 0;
                }
                .ff-icon-btn:hover { background: #f1f5f9; color: #003366; }
                .ff-icon-btn.active { color: #003366; }

                /* ── Search row ── */
                .ff-search-wrap {
                    animation: ff-slide 0.15s ease both;
                    border-top: 1px solid #f1f5f9;
                    padding: 0.6rem 0.875rem;
                }
                .ff-search-input {
                    width: 100%;
                    padding: 0.5rem 2.4rem;
                    border: 1px solid #e2e8f0;
                    border-radius: 7px;
                    font-size: 0.84rem;
                    font-family: inherit;
                    outline: none;
                    color: #0f172a;
                    background: #f8fafc;
                    transition: border-color 0.15s, background 0.15s;
                    box-sizing: border-box;
                }
                .ff-search-input:focus {
                    border-color: #003366;
                    background: white;
                    box-shadow: 0 0 0 3px rgba(0,51,102,0.07);
                }

                .ff-type-label {
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    white-space: nowrap;
                    flex-shrink: 0;
                    margin-right: 2px;
                }

                /* ── Responsive ── */
                @media (max-width: 600px) {
                    .ff-row { padding: 0.45rem 0.75rem; gap: 4px; }
                    .ff-sort-pill { padding: 0.28rem 0.55rem; font-size: 0.75rem; }
                    .ff-type-pill { padding: 0.22rem 0.5rem; font-size: 0.7rem; }
                    .ff-icon-btn  { padding: 0.28rem 0.55rem; font-size: 0.75rem; }
                    .ff-search-wrap { padding: 0.5rem 0.75rem; }
                }
                @media (max-width: 400px) {
                    .ff-sort-pill { padding: 0.25rem 0.45rem; font-size: 0.72rem; }
                    .ff-type-pill { padding: 0.2rem 0.42rem; font-size: 0.68rem; }
                    .ff-type-label { display: none; }
                }
            `}</style>

            <div className="ff-card">

                {/* ── Row 1: Sort + Search + Tag ── */}
                <div className="ff-row ff-row-sort">
                    {SORTS.map(({ key, label, Icon }) => (
                        <button
                            key={key}
                            className={`ff-sort-pill${sort === key ? ' active' : ''}`}
                            onClick={() => onSortChange(key)}
                        >
                            <Icon size={12} /> {label}
                        </button>
                    ))}

                    <div className="ff-div" />

                    {/* Search toggle */}
                    <button
                        className={`ff-icon-btn${searchOpen ? ' active' : ''}`}
                        onClick={() => { setSearchOpen(o => !o); if (searchOpen) onSearchChange(''); }}
                    >
                        <Search size={13} /> Search
                    </button>

                    {/* Tag filter */}
                    {tagFilter ? (
                        <button
                            className="ff-icon-btn active"
                            onClick={() => onTagFilterChange('')}
                            style={{ border: '1px solid #003366', color: '#003366' }}
                        >
                            <Tag size={12} /> #{tagFilter} <X size={11} style={{ marginLeft: 2 }} />
                        </button>
                    ) : tagInputOpen ? (
                        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #003366', borderRadius: 6, padding: '0.25rem 0.5rem', gap: 5 }}>
                            <Tag size={12} color="#003366" />
                            <input
                                type="text"
                                autoFocus
                                value={tagInputValue}
                                onChange={e => setTagInputValue(e.target.value.toLowerCase().replace(/[^a-z0-9\-_\s]/g, ''))}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && tagInputValue.trim()) {
                                        onTagFilterChange(tagInputValue.trim());
                                        setTagInputOpen(false);
                                        setTagInputValue('');
                                    } else if (e.key === 'Escape') {
                                        setTagInputOpen(false);
                                    }
                                }}
                                onBlur={() => { if (!tagInputValue) setTagInputOpen(false); }}
                                placeholder="tag name…"
                                style={{ border: 'none', background: 'transparent', outline: 'none', width: 80, fontSize: '0.78rem', color: '#0f172a', fontFamily: 'inherit', padding: 0 }}
                            />
                        <button
                                onMouseDown={e => { e.preventDefault(); setTagInputOpen(false); }}
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                            >
                                <X size={13} color="#94a3b8" />
                            </button>
                        </div>
                    ) : (
                        <button
                            className="ff-icon-btn"
                            onClick={() => setTagInputOpen(true)}
                            style={{ border: '1px dashed #cbd5e1' }}
                        >
                            <Tag size={12} /> Tag
                        </button>
                    )}

                    {(search || tagFilter) && (
                        <button
                            onClick={() => { onSearchChange(''); onTagFilterChange(''); setSearchOpen(false); }}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', padding: '2px 4px', textDecoration: 'underline', whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* ── Row 2: Post Type Filter ── */}
                <div className="ff-row" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
                    <span className="ff-type-label">Filter:</span>
                    {POST_TYPES.map(({ key, label }) => (
                        <button
                            key={key}
                            className={`ff-type-pill${(postTypeFilter || '') === key ? ' active' : ''}`}
                            onClick={() => onPostTypeFilterChange?.(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* ── Expandable search ── */}
                {searchOpen && (
                    <div className="ff-search-wrap">
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                            <input
                                type="text"
                                value={search}
                                onChange={e => onSearchChange(e.target.value)}
                                placeholder="Search posts by keyword…"
                                autoFocus
                                className="ff-search-input"
                            />
                            {search && (
                                <button
                                    onClick={() => onSearchChange('')}
                                    style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 2 }}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default FeedFilters;