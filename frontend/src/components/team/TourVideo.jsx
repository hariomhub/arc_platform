import React, { useState } from 'react';
import { Play, Check, Video } from 'lucide-react';
import { colors } from '../ui/kit.jsx';
import { useLocalFlag } from '../../utils/localFlags.js';

/** The flag the "Get started" checklist reads. A new video (a new `version`) starts unwatched again. */
export const tourFlag = (profileId, tour) => `tour:${profileId}:${tour?.version ?? 'x'}`;

const youtubeId = (src) => /\/embed\/([\w-]{11})/.exec(src || '')?.[1] || null;
const withAutoplay = (src) => `${src}${src.includes('?') ? '&' : '?'}autoplay=1`;

const frame = { position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#0F172A', borderRadius: 12, overflow: 'hidden' };

/** An embedded video loads only when asked to: nothing from YouTube or Vimeo is fetched until Play. */
const Player = ({ tour, onPlay }) => {
    const [started, setStarted] = useState(false);

    if (tour.kind === 'file') {
        return (
            <div style={frame}>
                <video controls preload="metadata" playsInline onPlay={onPlay} style={{ width: '100%', height: '100%', display: 'block', background: '#0F172A' }} title={tour.title}>
                    <source src={tour.src} />
                    Your browser cannot play this video.
                </video>
            </div>
        );
    }

    if (started) {
        return (
            <div style={frame}>
                <iframe
                    src={withAutoplay(tour.src)}
                    title={tour.title}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                />
            </div>
        );
    }

    const thumb = tour.provider === 'youtube' && youtubeId(tour.src) ? `https://i.ytimg.com/vi/${youtubeId(tour.src)}/hqdefault.jpg` : null;
    return (
        <button
            type="button"
            onClick={() => { setStarted(true); onPlay(); }}
            className="kit-focus tour-play"
            aria-label={`Play: ${tour.title}`}
            style={{ ...frame, border: 'none', padding: 0, cursor: 'pointer', display: 'block', backgroundImage: thumb ? `linear-gradient(rgba(15,23,42,0.35), rgba(15,23,42,0.35)), url(${thumb})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="tour-play-icon" style={{ width: 62, height: 62, borderRadius: '50%', background: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 18px rgba(0,0,0,0.35)' }}>
                    <Play size={26} color={colors.primary} fill={colors.primary} style={{ marginLeft: 3 }} aria-hidden="true" />
                </span>
            </span>
        </button>
    );
};

/**
 * The tour video an administrator sets, with a way to say "I watched it" so the checklist can tick it off.
 * Without a video it says one is coming rather than leaving a hole.
 */
const TourVideo = ({ tour, profileId, preview = false }) => {
    const [watched, setWatched] = useLocalFlag(tourFlag(profileId, tour));

    if (!tour) {
        return (
            <section id="team-tour" aria-label="Tour video" style={{ background: 'white', border: `1.5px dashed ${colors.border}`, borderRadius: 16, padding: 'clamp(1.1rem,2.5vw,1.5rem)', textAlign: 'center' }}>
                <Video size={30} color={colors.faint} aria-hidden="true" />
                <div style={{ fontWeight: 800, color: colors.text, marginTop: 8 }}>A short tour is on its way</div>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: colors.muted, lineHeight: 1.6 }}>Your administrators are adding a walk-through of this dashboard. It will appear here.</p>
            </section>
        );
    }

    return (
        <section id="team-tour" aria-label="Tour video" style={{ background: 'white', border: `1px solid ${colors.border}`, borderRadius: 16, padding: 'clamp(0.9rem,2vw,1.15rem)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: colors.blue, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Start here</div>
            <Player tour={tour} onPlay={() => !preview && setWatched(true)} />
            <h2 style={{ margin: '0.8rem 0 0', fontSize: '1rem', fontWeight: 800, color: colors.text }}>{tour.title}</h2>
            {tour.description && <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: colors.muted, lineHeight: 1.6 }}>{tour.description}</p>}
            {!preview && <button
                type="button"
                onClick={() => setWatched(!watched)}
                aria-pressed={watched}
                className="kit-btn kit-focus"
                style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.8rem', borderRadius: 100, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)', border: `1.5px solid ${watched ? colors.green : '#CBD5E1'}`, background: watched ? '#ECFDF5' : 'white', color: watched ? '#047857' : colors.muted }}
            >
                {watched ? <><Check size={13} aria-hidden="true" /> Watched</> : 'Mark as watched'}
            </button>}
        </section>
    );
};

export default TourVideo;
