import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Plus, Check, Loader2 } from 'lucide-react';

/**
 * Searchable single-select dropdown for product categories.
 * Pass `onCreate` to let the user add a new category inline (admin use only) —
 * omit it for a read-only picker (e.g. the public filter).
 *
 * @param {{
 *   categories: {id:number, name:string, description?:string}[],
 *   value: number|string|null,
 *   onChange: (id:number|null, name:string|null) => void,
 *   onCreate?: (name:string) => Promise<{id:number, name:string}>,
 *   placeholder?: string,
 *   clearLabel?: string,
 * }} props
 */
const CategoryCombobox = ({ categories, value, onChange, onCreate, placeholder = 'Select a category…', clearLabel = 'All Categories' }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [creating, setCreating] = useState(false);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    const selected = categories.find((c) => String(c.id) === String(value));

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false); setQuery('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

    const filtered = categories.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));
    const exactMatch = categories.some((c) => c.name.toLowerCase() === query.trim().toLowerCase());

    const select = (cat) => { onChange(cat?.id ?? null, cat?.name ?? null); setOpen(false); setQuery(''); };

    const handleCreate = async () => {
        const name = query.trim();
        if (!name || creating) return;
        setCreating(true);
        try {
            const cat = await onCreate(name);
            select(cat);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            <button type="button" onClick={() => setOpen((o) => !o)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.875rem', fontFamily: 'inherit', background: 'white', cursor: 'pointer', color: selected ? '#1E293B' : '#94A3B8', textAlign: 'left' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected ? selected.name : (value ? placeholder : clearLabel)}</span>
                <ChevronDown size={14} style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>

            {open && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20, background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                    <div style={{ position: 'relative', padding: '8px', borderBottom: '1px solid #F1F5F9' }}>
                        <Search size={13} color="#94A3B8" style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search categories…"
                            style={{ width: '100%', padding: '0.45rem 0.6rem 0.45rem 1.9rem', border: '1px solid #E2E8F0', borderRadius: '5px', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                        <button type="button" onClick={() => select(null)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0.5rem 0.75rem', border: 'none', background: !value ? '#EBF0F7' : 'transparent', color: !value ? '#003366' : '#475569', fontSize: '0.84rem', fontWeight: !value ? '700' : '500', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                            {clearLabel}{!value && <Check size={13} />}
                        </button>
                        {filtered.map((c) => (
                            <button key={c.id} type="button" onClick={() => select(c)}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0.5rem 0.75rem', border: 'none', background: String(c.id) === String(value) ? '#EBF0F7' : 'transparent', color: String(c.id) === String(value) ? '#003366' : '#1E293B', fontSize: '0.84rem', fontWeight: String(c.id) === String(value) ? '700' : '500', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                                onMouseOver={(e) => { if (String(c.id) !== String(value)) e.currentTarget.style.background = '#F8FAFC'; }}
                                onMouseOut={(e) => { if (String(c.id) !== String(value)) e.currentTarget.style.background = 'transparent'; }}>
                                {c.name}{String(c.id) === String(value) && <Check size={13} />}
                            </button>
                        ))}
                        {filtered.length === 0 && !onCreate && (
                            <p style={{ margin: 0, padding: '0.75rem', fontSize: '0.8rem', color: '#94A3B8' }}>No categories match.</p>
                        )}
                        {onCreate && query.trim() && !exactMatch && (
                            <button type="button" onClick={handleCreate} disabled={creating}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', padding: '0.55rem 0.75rem', border: 'none', borderTop: '1px solid #F1F5F9', background: '#F8FAFC', color: '#003366', fontSize: '0.84rem', fontWeight: '700', cursor: creating ? 'not-allowed' : 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                                {creating ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
                                Add new category "{query.trim()}"
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryCombobox;
