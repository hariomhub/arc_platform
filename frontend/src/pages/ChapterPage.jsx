import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, ExternalLink, ArrowLeft, HeartHandshake, Crown } from 'lucide-react';
import { getPublicChapter } from '../api/chapters.js';
import { useAuth } from '../hooks/useAuth.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import { countryName } from '../utils/countries.js';
import { colors, Avatar, Pill, Empty, Card, SectionTitle } from '../components/ui/kit.jsx';
import SeatTiles from '../components/team/SeatTiles.jsx';

const Person = ({ person, lead = false }) => (
    <div className="kit-enter" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'white', border: `1px solid ${lead ? '#BAE6FD' : colors.border}`, borderRadius: 14, padding: '0.95rem 1rem' }}>
        <Avatar name={person.name} photo={person.photo_url} size={lead ? 56 : 46} tone={lead ? '#0369A1' : '#0F766E'} />
        <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: colors.text, fontSize: lead ? '1.05rem' : '0.95rem' }}>{person.name}</div>
            <div style={{ fontSize: '0.76rem', color: colors.muted, marginBottom: 4 }}>
                {person.tier_label}{person.since ? ` · since ${person.since}` : ''}
            </div>
            {person.organisation && <div style={{ fontSize: '0.82rem', color: colors.text }}>{person.organisation}</div>}
            {person.bio && <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: colors.muted, lineHeight: 1.55 }}>{person.bio}</p>}
            {person.linkedin_url && (
                <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer" className="kit-focus" style={{ marginTop: 6, fontSize: '0.78rem', fontWeight: 700, color: colors.primary, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    LinkedIn <ExternalLink size={12} aria-hidden="true" />
                </a>
            )}
        </div>
    </div>
);

/** One chapter's public page: its Chapter Lead, its ambassadors, and how to join. */
const ChapterPage = () => {
    const { slug } = useParams();
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let alive = true;
        setData(null); setError('');
        getPublicChapter(slug)
            .then((res) => { if (alive) { setData(res.data?.data || null); document.title = `${res.data?.data?.chapter?.name || 'Chapter'} | Risk AI Council`; } })
            .catch((err) => { if (alive) setError(err?.response?.status === 404 ? 'We could not find that chapter.' : getErrorMessage(err)); });
        return () => { alive = false; };
    }, [slug]);

    // Ambassadors who asked not to be shown still hold a seat, so they appear as plain tiles.
    const taken = data && data.seat_cap !== null ? data.seat_cap - data.seats_left : data?.ambassadors.length || 0;
    const seatPeople = data
        ? [...data.ambassadors, ...Array.from({ length: Math.max(0, taken - data.ambassadors.length) }, () => ({ name: 'Ambassador', photo_url: null }))]
        : [];
    const canApply = !user || (user.role === 'professional' && user.status === 'approved');
    const joinHref = data
        ? `/membership?apply=ambassador&chapter=${data.chapter.id}&country=${data.chapter.country_code}`
        : '/membership';

    return (
        <div style={{ background: '#F8FAFC', minHeight: '70vh', fontFamily: 'var(--font-sans)' }}>
            <div style={{ background: '#003366', borderBottom: '3px solid #0A4F99', padding: 'clamp(1.25rem,3vw,2rem) clamp(1rem,4vw,3rem)' }}>
                <div style={{ maxWidth: 1180, margin: '0 auto' }}>
                    <Link to="/chapters" className="kit-focus" style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none', marginBottom: 8 }}>
                        <ArrowLeft size={14} aria-hidden="true" /> All chapters
                    </Link>
                    <h1 style={{ margin: 0, color: 'white', fontSize: 'clamp(1.6rem,3.4vw,2.3rem)', fontWeight: 800 }}>{data ? data.chapter.name : 'Chapter'}</h1>
                    {data && (
                        <p style={{ margin: '0.3rem 0 0', color: 'rgba(255,255,255,0.82)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <MapPin size={14} aria-hidden="true" /> {countryName(data.chapter.country_code)}
                        </p>
                    )}
                </div>
            </div>

            <div style={{ padding: 'clamp(1rem,2.5vw,1.75rem) clamp(1rem,4vw,3rem) 3rem' }}>
            <div style={{ maxWidth: 1180, margin: '0 auto' }}>
                {error && <Empty>{error}</Empty>}
                {!data && !error && <div className="skel" style={{ height: 240, background: '#E9EEF4', borderRadius: 16 }} />}

                {data && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'flex-start' }}>
                        <div style={{ flex: '2 1 480px', minWidth: 0, display: 'grid', gap: '1.25rem' }}>
                            <section aria-labelledby="lead-h">
                                <h2 id="lead-h" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 0.6rem', fontSize: '1rem', fontWeight: 800, color: colors.text }}>
                                    <Crown size={16} color="#0369A1" aria-hidden="true" /> Chapter Lead
                                </h2>
                                {data.lead ? <Person person={data.lead} lead /> : (
                                    <div style={{ background: 'white', border: `1px dashed ${colors.border}`, borderRadius: 14, padding: '1rem', fontSize: '0.88rem', color: colors.muted }}>
                                        {data.has_lead ? 'This chapter is led by a Chapter Lead who has chosen not to be shown here.' : 'This chapter does not have a Chapter Lead yet.'}
                                    </div>
                                )}
                            </section>

                            <section aria-labelledby="amb-h">
                                <h2 id="amb-h" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 0.6rem', fontSize: '1rem', fontWeight: 800, color: colors.text }}>
                                    <HeartHandshake size={16} color="#0F766E" aria-hidden="true" /> Chapter Ambassadors
                                </h2>
                                {data.ambassadors.length === 0 ? (
                                    <div style={{ background: 'white', border: `1px dashed ${colors.border}`, borderRadius: 14, padding: '1rem', fontSize: '0.88rem', color: colors.muted }}>
                                        No ambassadors yet. Be the first to join this chapter.
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px,100%), 1fr))', gap: '0.8rem' }}>
                                        {data.ambassadors.map((p) => <Person key={p.id} person={p} />)}
                                    </div>
                                )}
                            </section>
                        </div>

                        <Card style={{ flex: '1 1 300px', minWidth: 0 }}>
                            <SectionTitle right={data.seats_left === 0 ? <Pill tone="amber">Full</Pill> : null}>Join this chapter</SectionTitle>
                            <SeatTiles people={seatPeople} cap={data.seat_cap} />
                            <p style={{ margin: '0.9rem 0', fontSize: '0.84rem', color: colors.muted, lineHeight: 1.6 }}>
                                Chapter Ambassadors are volunteers who support the chapter's Chapter Lead.
                                {data.has_lead ? ' The Chapter Lead reviews your application.' : ' With no Chapter Lead yet, the administrators review your application.'}
                            </p>
                            {canApply ? (
                                <Link
                                    to={user ? joinHref : '/login'}
                                    state={user ? undefined : { from: { pathname: '/membership', search: joinHref.slice(joinHref.indexOf('?')) } }}
                                    className="kit-btn kit-focus"
                                    style={{ display: 'block', textAlign: 'center', background: colors.primary, color: 'white', padding: '0.7rem 1rem', borderRadius: 10, fontWeight: 800, fontSize: '0.9rem', textDecoration: 'none' }}
                                >
                                    Apply as Chapter Ambassador
                                </Link>
                            ) : (
                                <p style={{ margin: 0, fontSize: '0.82rem', color: colors.muted }}>You are already part of the council. See your <Link to="/user/dashboard" style={{ color: colors.primary, fontWeight: 700 }}>dashboard</Link>.</p>
                            )}
                            <p style={{ margin: '0.8rem 0 0', fontSize: '0.74rem', color: colors.faint, lineHeight: 1.55 }}>
                                People on this page are listed with their name, role and chapter. Anything else shown is their own choice.
                            </p>
                        </Card>
                    </div>
                )}
            </div>
            </div>
        </div>
    );
};

export default ChapterPage;
