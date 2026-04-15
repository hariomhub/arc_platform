import React, { useState } from 'react';
import { TrendingUp, Clock, MessageCircle, Tag, Search, X, Flame, Sparkles } from 'lucide-react';

const SORTS = [
    { key:'trending',  label:'Trending',  icon:TrendingUp,   desc:'Top by engagement' },
    { key:'latest',    label:'Latest',    icon:Clock,        desc:'Most recent first' },
    { key:'discussed', label:'Discussed', icon:MessageCircle,desc:'Most comments' },
];

const FeedFilters = ({ sort, onSortChange, search, onSearchChange, tagFilter, onTagFilterChange }) => {
    const [searchOpen, setSearchOpen] = useState(!!search);
    const [tagInputOpen, setTagInputOpen] = useState(false);
    const [tagInputValue, setTagInputValue] = useState('');

    return (
        <>
            <style>{`
                @keyframes ff-slide { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }

                .ff-wrap {
                    background: white;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    padding: 0.75rem 1rem;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                }

                .ff-sort-row {
                    display: flex; align-items: center; gap: 8px;
                    overflow-x: auto; scrollbar-width: none;
                }
                .ff-sort-row::-webkit-scrollbar { display: none; }

                .ff-pill {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 0.4rem 0.8rem; border-radius: 6px;
                    border: 1px solid transparent; background: transparent;
                    font-size: 0.78rem; font-weight: 600; color: #475569;
                    cursor: pointer; white-space: nowrap; font-family: inherit;
                    transition: all 0.1s ease;
                }
                .ff-pill:hover { background: #f1f5f9; color: #003366; }
                .ff-pill.active {
                    background: #003366;
                    color: white; border-color: #003366;
                }

                .ff-pill-tag.active {
                    background: #2563eb;
                    color: white; border-color: #2563eb;
                }

                .ff-search-wrap { animation: ff-slide 0.15s ease both; margin-top: 0.75rem; border-top: 1px solid #f1f5f9; padding-top: 0.75rem; }

                .ff-search-input {
                    width: 100%; padding: 0.55rem 2.5rem;
                    border: 1px solid #e2e8f0; border-radius: 6px;
                    font-size: 0.85rem; font-family: inherit; outline: none;
                    color: #0f172a; background: white;
                    transition: border-color 0.15s, box-shadow 0.15s; box-sizing: border-box;
                }
                .ff-search-input:focus { border-color: #003366; box-shadow: 0 0 0 3px rgba(0,51,102,0.08); }
            `}</style>

            <div className="ff-wrap">
                <div className="ff-sort-row">
                    {SORTS.map(({ key, label, icon:Icon }) => (
                        <button key={key} className={`ff-pill${sort===key?' active':''}`} onClick={() => onSortChange(key)}>
                            <Icon size={13} /> {label}
                        </button>
                    ))}

                    <div style={{ width:'1px', height:'18px', background:'#e2e8f0', flexShrink:0, margin:'0 2px' }} />

                    <button className={`ff-pill${searchOpen?' active':''}`}
                        onClick={() => { setSearchOpen(o=>!o); if(searchOpen) onSearchChange(''); }}>
                        <Search size={13} /> Search
                    </button>

                    {tagFilter ? (
                        <button className="ff-pill ff-pill-tag active" onClick={() => onTagFilterChange('')}>
                            <Tag size={12} /> #{tagFilter} <X size={11} />
                        </button>
                    ) : tagInputOpen ? (
                        <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #003366', borderRadius: '6px', padding: '0.2rem 0.5rem', gap: '6px' }}>
                            <Tag size={12} color="#003366" />
                            <input 
                                type="text"
                                autoFocus
                                value={tagInputValue}
                                onChange={(e) => setTagInputValue(e.target.value.toLowerCase().replace(/[^a-z0-9\-_\s]/g, ''))}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && tagInputValue.trim()) {
                                        onTagFilterChange(tagInputValue.trim());
                                        setTagInputOpen(false);
                                        setTagInputValue('');
                                    } else if (e.key === 'Escape') {
                                        setTagInputOpen(false);
                                    }
                                }}
                                onBlur={() => { if(!tagInputValue) setTagInputOpen(false); }}
                                placeholder="enter tag..."
                                style={{ border: 'none', background: 'transparent', outline: 'none', width: '90px', fontSize: '0.78rem', color: '#0f172a', fontFamily: 'inherit', padding: 0 }}
                            />
                            <button onMouseDown={(e) => { e.preventDefault(); setTagInputOpen(false); }} style={{ background: 'none', border: 'none', padding: '0', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={13} color="#64748b" /></button>
                        </div>
                    ) : (
                        <button className="ff-pill" onClick={() => setTagInputOpen(true)} style={{ color:'#64748b', border:'1px dashed #cbd5e1' }}>
                            <Tag size={12} /> Filter by tag
                        </button>
                    )}

                    {(search || tagFilter) && (
                        <button onClick={() => { onSearchChange(''); onTagFilterChange(''); setSearchOpen(false); }}
                            style={{ background:'none', border:'none', color:'#94a3b8', fontSize:'0.75rem', fontWeight:'600', cursor:'pointer', fontFamily:'inherit', padding:'2px 4px', textDecoration:'underline', whiteSpace:'nowrap', flexShrink:0 }}>
                            Clear all
                        </button>
                    )}
                </div>

                {searchOpen && (
                    <div className="ff-search-wrap">
                        <div style={{ position:'relative' }}>
                            <Search size={15} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }} />
                            <input type="text" value={search} onChange={e => onSearchChange(e.target.value)}
                                placeholder="Search posts by keyword…" autoFocus className="ff-search-input" />
                            {search && (
                                <button onClick={() => onSearchChange('')}
                                    style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex', padding:'2px' }}>
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