import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Search, Users, ArrowRight } from 'lucide-react';
import { getPublicChapters } from '../api/chapters.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import { countryName } from '../utils/countries.js';
import { colors, Avatar, Pill, Empty } from '../components/ui/kit.jsx';
import { Meter } from '../components/ui/motion.jsx';

/**
 * Public "Chapters" page: every active chapter, who leads it, and how many ambassador seats are free.
 * Filter by country or search by name; each card opens the chapter's own page. Only what people chose to
 * show is public (see publicChapterService on the server): no email addresses, no phone numbers.
 */
const ChapterCard = ({ chapter }) => {
    const total = chapter.seats_left === null ? null : chapter.ambassadors + chapter.seats_left;
    const filled = total ? Math.round((chapter.ambassadors / total) * 100) : 0;
    return (
        <Link
            to={`/chapters/${chapter.slug}`}
            className="kit-lift kit-focus"
            style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'white', border: `1px solid ${colors.border}`, borderRadius: 16, padding: '1.1rem 1.2rem', textDecoration: 'none', color: 'inherit' }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: colors.text }}>{chapter.name}</h2>
                    <div style={{ fontSize: '0.8rem', color: colors.muted, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <MapPin size={12} aria-hidden="true" /> {countryName(chapter.country_code)}
                    </div>
                </div>
                {chapter.seats_left === 0 && <Pill tone="amber">Full</Pill>}
            </div>

            {chapter.lead ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={chapter.lead.name} photo={chapter.lead.photo_url} size={40} tone="#0369A1" />
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: colors.text }}>{chapter.lead.name}</div>
                        <div style={{ fontSize: '0.74rem', color: colors.muted }}>Chapter Lead</div>
                    </div>
                </div>
            ) : (
                <div style={{ fontSize: '0.84rem', color: colors.muted, background: '#F8FAFC', borderRadius: 10, padding: '0.55rem 0.75rem' }}>
                    {chapter.has_lead ? 'Led by a Chapter Lead' : 'Looking for a Chapter Lead'}
                </div>
            )}

            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: colors.muted, marginBottom: 5 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Users size={13} aria-hidden="true" /> {chapter.ambassadors} ambassador{chapter.ambassadors === 1 ? '' : 's'}</span>
                    {chapter.seats_left !== null && <span>{chapter.seats_left} seat{chapter.seats_left === 1 ? '' : 's'} open</span>}
                </div>
                {total !== null && <Meter percent={filled} height={6} color="#0F766E" label={`${chapter.ambassadors} of ${total} ambassador seats filled`} />}
            </div>

            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: colors.primary, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 'auto' }}>
                See the team <ArrowRight size={13} aria-hidden="true" />
            </span>
        </Link>
    );
};

const ChaptersPage = () => {
    const [chapters, setChapters] = useState(null);
    const [error, setError] = useState('');
    const [country, setCountry] = useState('all');
    const [query, setQuery] = useState('');

    useEffect(() => { document.title = 'Chapters | Risk AI Council'; }, []);
    useEffect(() => {
        let alive = true;
        getPublicChapters()
            .then((res) => { if (alive) setChapters(res.data?.data || []); })
            .catch((err) => { if (alive) setError(getErrorMessage(err)); });
        return () => { alive = false; };
    }, []);

    const countries = useMemo(
        () => [...new Set((chapters || []).map((c) => c.country_code))].sort((a, b) => countryName(a).localeCompare(countryName(b))),
        [chapters],
    );
    const shown = useMemo(() => (chapters || []).filter((c) =>
        (country === 'all' || c.country_code === country)
        && (!query.trim() || c.name.toLowerCase().includes(query.trim().toLowerCase()))), [chapters, country, query]);
    const ambassadors = (chapters || []).reduce((n, c) => n + c.ambassadors, 0);

    return (
        <div style={{ background: '#F8FAFC', minHeight: '70vh', fontFamily: 'var(--font-sans)' }}>
            <div style={{ background: '#003366', borderBottom: '3px solid #0A4F99', padding: 'clamp(1.5rem,3vw,2.25rem) clamp(1rem,4vw,3rem)' }}>
                <div style={{ maxWidth: 1180, margin: '0 auto' }}>
                    <h1 style={{ margin: '0 0 0.4rem', color: 'white', fontSize: 'clamp(1.7rem,3.6vw,2.4rem)', fontWeight: 800 }}>Chapters</h1>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.82)', fontSize: '1rem', lineHeight: 1.6, maxWidth: 680 }}>
                        Each chapter is led by a Chapter Lead and supported by volunteer Chapter Ambassadors. Find yours, meet the team, or apply to join it.
                    </p>
                    {chapters && (
                        <p style={{ margin: '0.9rem 0 0', color: 'rgba(255,255,255,0.78)', fontSize: '0.85rem', fontWeight: 700 }}>
                            {chapters.length} chapter{chapters.length === 1 ? '' : 's'} · {ambassadors} ambassador{ambassadors === 1 ? '' : 's'}
                        </p>
                    )}
                </div>
            </div>

            <div style={{ padding: 'clamp(1rem,2.5vw,1.75rem) clamp(1rem,4vw,3rem) 3rem' }}>
            <div style={{ maxWidth: 1180, margin: '0 auto' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.1rem' }}>
                    <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
                        <Search size={15} color={colors.faint} aria-hidden="true" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="search"
                            aria-label="Search chapters"
                            placeholder="Search chapters"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="kit-focus"
                            style={{ width: '100%', padding: '0.6rem 0.8rem 0.6rem 2.1rem', border: '1px solid #CBD5E1', borderRadius: 10, fontSize: '0.88rem', fontFamily: 'var(--font-sans)', background: 'white' }}
                        />
                    </div>
                    <div role="group" aria-label="Filter by country" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['all', ...countries].map((c) => {
                            const on = country === c;
                            return (
                                <button
                                    key={c}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => setCountry(c)}
                                    className="kit-btn kit-focus"
                                    style={{ padding: '0.4rem 0.85rem', borderRadius: 100, border: `1.5px solid ${on ? colors.primary : colors.border}`, background: on ? colors.primary : 'white', color: on ? 'white' : colors.muted, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                                >
                                    {c === 'all' ? 'All countries' : countryName(c)}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {error && <Empty>{error}</Empty>}
                {!chapters && !error && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px,100%), 1fr))', gap: '1rem' }}>
                        {[1, 2, 3].map((i) => <div key={i} className="skel" style={{ height: 190, background: '#E9EEF4', borderRadius: 16 }} />)}
                    </div>
                )}
                {chapters && shown.length === 0 && (
                    <Empty>{chapters.length === 0 ? 'No chapters have opened yet. Check back soon.' : 'No chapter matches that search.'}</Empty>
                )}
                {chapters && shown.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px,100%), 1fr))', gap: '1rem' }}>
                        {shown.map((c) => <ChapterCard key={c.id} chapter={c} />)}
                    </div>
                )}
            </div>
            </div>
        </div>
    );
};

export default ChaptersPage;
