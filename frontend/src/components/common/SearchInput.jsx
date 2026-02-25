import React, { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce.js';

/**
 * Debounced search input with clear button.
 * @param {{ value: string, onChange: (v:string)=>void, placeholder?: string, debounceMs?: number }} props
 */
const SearchInput = ({
    value,
    onChange,
    placeholder = 'Search…',
    debounceMs = 300,
}) => {
    const [localValue, setLocalValue] = useState(value ?? '');
    const debouncedValue = useDebounce(localValue, debounceMs);

    // Fire onChange with debounced value
    React.useEffect(() => {
        onChange(debouncedValue);
    }, [debouncedValue, onChange]);

    const handleClear = useCallback(() => {
        setLocalValue('');
        onChange('');
    }, [onChange]);

    return (
        <div
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
            }}
        >
            <Search
                size={16}
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    left: '0.75rem',
                    color: 'var(--text-light)',
                    pointerEvents: 'none',
                    flexShrink: 0,
                }}
            />
            <input
                type="search"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                style={{
                    width: '100%',
                    padding: '0.55rem 2.5rem 0.55rem 2.25rem',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    fontFamily: 'var(--font-sans)',
                    color: 'var(--text-main)',
                    backgroundColor: 'white',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border-light)'; }}
            />
            {localValue && (
                <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Clear search"
                    style={{
                        position: 'absolute',
                        right: '0.6rem',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        color: 'var(--text-light)',
                        padding: '2px',
                    }}
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
};

export default React.memo(SearchInput);
