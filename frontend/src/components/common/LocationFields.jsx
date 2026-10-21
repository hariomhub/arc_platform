import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { getChapters } from '../../api/chapters.js';
import { COUNTRIES_PINNED, COUNTRIES_REST } from '../../utils/countries.js';

/**
 * Country select + (when that country has chapters) an optional chapter select.
 * Used by sign-up, the LinkedIn profile-completion step, the Chapter Lead
 * application and the admin approval dialog.
 *
 * Controlled: pass `country` / `chapterId` and handle `onChange({ country_code, chapter_id })`.
 * Styling can be overridden with `inputStyle` / `labelStyle` so it blends into any form.
 */
const baseInput = {
    width: '100%', padding: '0.7rem 0.9rem', border: '1.5px solid #E2E8F0', borderRadius: '10px',
    fontSize: '0.875rem', boxSizing: 'border-box', display: 'block', fontFamily: 'var(--font-sans)',
    outline: 'none', background: '#FAFBFC', color: '#0F172A',
};
const baseLabel = { fontSize: '0.8rem', fontWeight: 600, color: '#374151' };

const LocationFields = ({
    country = '',
    chapterId = '',
    onChange,
    disabled = false,
    countryError = '',
    showChapter = true,
    countryLabel = 'Country',
    chapterLabel = 'Chapter',
    chapterHint = 'Optional — pick your local chapter if there is one',
    inputStyle,
    labelStyle,
    idPrefix = 'loc',
}) => {
    const [chapters, setChapters] = useState([]);

    useEffect(() => {
        if (!showChapter || !country) { setChapters([]); return undefined; }
        let cancelled = false;
        getChapters(country)
            .then((res) => { if (!cancelled) setChapters(res.data?.data || []); })
            .catch(() => { if (!cancelled) setChapters([]); });
        return () => { cancelled = true; };
    }, [country, showChapter]);

    const input = { ...baseInput, ...(inputStyle || {}) };
    const label = { ...baseLabel, ...(labelStyle || {}) };
    const errStyle = countryError ? { borderColor: '#FCA5A5', background: '#FFF5F5' } : {};

    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label htmlFor={`${idPrefix}-country`} style={{ ...label, color: countryError ? '#DC2626' : label.color }}>
                    {countryLabel}<span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>
                </label>
                <select
                    id={`${idPrefix}-country`}
                    value={country}
                    disabled={disabled}
                    onChange={(e) => onChange({ country_code: e.target.value, chapter_id: '' })}
                    style={{ ...input, ...errStyle, cursor: disabled ? 'not-allowed' : 'pointer' }}
                >
                    <option value="">Select your country…</option>
                    <optgroup label="Popular">
                        {COUNTRIES_PINNED.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </optgroup>
                    <optgroup label="All countries">
                        {COUNTRIES_REST.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </optgroup>
                </select>
                {countryError && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.74rem', color: '#DC2626' }}>
                        <AlertCircle size={11} />{countryError}
                    </span>
                )}
            </div>

            {showChapter && chapters.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                        <label htmlFor={`${idPrefix}-chapter`} style={label}>{chapterLabel}</label>
                        <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{chapterHint}</span>
                    </div>
                    <select
                        id={`${idPrefix}-chapter`}
                        value={chapterId || ''}
                        disabled={disabled}
                        onChange={(e) => onChange({ country_code: country, chapter_id: e.target.value })}
                        style={{ ...input, cursor: disabled ? 'not-allowed' : 'pointer' }}
                    >
                        <option value="">No chapter / not listed</option>
                        {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            )}
        </>
    );
};

export default LocationFields;
