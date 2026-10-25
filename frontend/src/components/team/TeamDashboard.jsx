import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ExternalLink, UserCircle, Users, PenSquare, Mic, Newspaper, Calendar, BookOpen, Trophy, Upload } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { colors, Card, SectionTitle, fmtDate } from '../ui/kit.jsx';
import ReferralHero from './ReferralHero.jsx';
import TourVideo from './TourVideo.jsx';
import GetStarted from './GetStarted.jsx';
import MyContactMessages from '../dashboard/MyContactMessages.jsx';
import { EventsCard, PostsCard, StatsCard, FeatureTiles, RegistrationsCard } from '../dashboard/DashboardCards.jsx';
import { StandingBanner, CurrentQuarter, LeadTabBar, LeadTabPanel } from '../chapterLead/LeadProgramme.jsx';
import { countryName } from '../../utils/countries.js';

const Skeleton = ({ height }) => <div className="skel" style={{ height }} />;

/**
 * The dashboard of a Chapter Lead or Chapter Ambassador, laid out as one column of full-width rows so
 * nothing sits beside a long sidebar:
 *
 *   1. Referral code (the thing to share) and, beside it, the tour video.
 *   2. "Get started": the first steps, ticked off as they happen. Folds away when all are done.
 *   3. The current quarter: what is left to do, then the four goals.
 *   4. Tabs: Overview, team, content, referrals, requests, leaderboard, history, settings.
 *
 * Wide screens put the referral card and checklist on the left and the video and chapter summary on the
 * right. On a phone they stack: referral, video, chapter, checklist.
 */

const CSS = `
    .tm-top { display: grid; grid-template-columns: minmax(0, 11fr) minmax(0, 9fr); grid-template-rows: auto 1fr; gap: 1.25rem; align-items: start; }
    .tm-ref   { grid-column: 1; grid-row: 1; min-width: 0; }
    .tm-start { grid-column: 1; grid-row: 2; min-width: 0; }
    .tm-side  { grid-column: 2; grid-row: 1 / span 2; display: grid; gap: 1.25rem; min-width: 0; }
    @media (max-width: 1000px) {
        .tm-top { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto auto; }
        .tm-ref { grid-column: 1; grid-row: 1; }
        .tm-side { grid-column: 1; grid-row: 2; }
        .tm-start { grid-column: 1; grid-row: 3; }
    }
    .tm-pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr)); gap: 1.25rem; align-items: stretch; }
    .tour-play .tour-play-icon { transition: transform .15s ease; }
    .tour-play:hover .tour-play-icon { transform: scale(1.08); }
    @media (prefers-reduced-motion: reduce) { .tour-play .tour-play-icon { transition: none; } }
`;

/** Where the member's chapter stands, in a few lines, plus the two links people look for. */
const ChapterCard = ({ data }) => {
    const { profile, team } = data;
    const isLead = profile.tier === 'lead';
    const chapter = profile.chapter;
    return (
        <Card>
            <SectionTitle icon={MapPin}>Your chapter</SectionTitle>
            {chapter ? (
                <>
                    <div style={{ fontWeight: 800, fontSize: '1.02rem', color: colors.text }}>{chapter.name}</div>
                    <div style={{ fontSize: '0.8rem', color: colors.muted, marginTop: 2 }}>{countryName(chapter.country_code)}</div>
                    <ul style={{ listStyle: 'none', margin: '0.8rem 0 0', padding: 0, display: 'grid', gap: 6, fontSize: '0.82rem', color: colors.text }}>
                        {isLead && team && (
                            <li>{team.ambassadors} ambassador{team.ambassadors === 1 ? '' : 's'}{team.seat_cap === null ? '' : ` of ${team.seat_cap} seats`}{team.pending_applications > 0 ? `, ${team.pending_applications} waiting for your decision` : ''}</li>
                        )}
                        {!isLead && <li>{team?.lead?.name ? `Your Chapter Lead is ${team.lead.name}` : 'Your chapter has no Chapter Lead yet. The administrators look after applications for now.'}</li>}
                        <li style={{ color: colors.muted }}>Current term ends {fmtDate(data.term.ends)}</li>
                    </ul>
                </>
            ) : (
                <p style={{ margin: 0, fontSize: '0.84rem', color: colors.muted, lineHeight: 1.6 }}>
                    An administrator assigns you to a chapter. Your team tools and chapter page appear once that is done.
                </p>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: '0.9rem' }}>
                {chapter?.slug && (
                    <Link to={`/chapters/${chapter.slug}`} className="kit-btn kit-focus" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.4rem 0.8rem', borderRadius: 8, border: '1.5px solid #CBD5E1', background: 'white', color: colors.primary, fontWeight: 700, fontSize: '0.78rem', textDecoration: 'none' }}>
                        Chapter page <ExternalLink size={12} aria-hidden="true" />
                    </Link>
                )}
                <Link to="/profile" className="kit-btn kit-focus" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.4rem 0.8rem', borderRadius: 8, border: '1.5px solid #CBD5E1', background: 'white', color: colors.primary, fontWeight: 700, fontSize: '0.78rem', textDecoration: 'none' }}>
                    <UserCircle size={13} aria-hidden="true" /> Edit profile
                </Link>
            </div>
        </Card>
    );
};

// What a chapter team member can do from the Overview, each one gated by the server's capability list.
const teamFeatures = (can) => [
    { icon: PenSquare, label: 'Write a post', desc: 'Share a thought with the community', path: '/community-qna', allowed: can('feed.post') },
    { icon: BookOpen, label: 'Write a blog', desc: 'Reviewed before it goes live', path: '/chapter-lead/blog/new', allowed: can('blog.write') },
    { icon: Mic, label: 'Request to host', desc: 'Ask to host a podcast or workshop', path: '/user/dashboard?tab=requests', allowed: can('team.dashboard') },
    { icon: Users, label: 'Manage your team', desc: 'Applications and ambassadors', path: '/user/dashboard?tab=team', allowed: can('team.manage') },
    { icon: Calendar, label: 'Draft an event', desc: 'An administrator publishes it', path: '/events', allowed: can('content.draft') },
    { icon: Newspaper, label: 'Draft a news item', desc: 'An administrator publishes it', path: '/news', allowed: can('content.draft') },
    { icon: Upload, label: 'Share a resource', desc: 'Added after review', path: '/resources', allowed: can('resources.upload') },
    { icon: Trophy, label: 'See the leaderboard', desc: 'Your team and the chapters', path: '/user/dashboard?tab=leaderboard', allowed: can('leaderboard.view') },
    { icon: BookOpen, label: 'Automated news', desc: 'Approve the automated feed', path: '/admin-dashboard?tab=auto_news', allowed: can('autonews.manage') },
];

/**
 * @param lead     { data, loading, error, noProfile } from GET /api/chapter-lead/dashboard
 * @param member   what every member sees: { events, registrations, posts, stats, usage, loading, openPosts, openStats }
 */
const TeamDashboard = ({ lead, tab, setTab, showToast, onReload, member, UnavailableView }) => {
    const { user, can } = useAuth();

    if (lead.loading) {
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1.25rem', minWidth: 0 }}>
                <style>{CSS}</style>
                <div className="tm-top">
                    <div className="tm-ref"><Skeleton height={210} /></div>
                    <div className="tm-start"><Skeleton height={260} /></div>
                    <div className="tm-side"><Skeleton height={300} /></div>
                </div>
                <Skeleton height={120} />
            </div>
        );
    }
    if (!lead.data) return UnavailableView;

    const data = lead.data;
    const tier = data.profile.tier;

    // The tabs sit below the top rows, so opening one from a link up here also scrolls it into view.
    const openTab = (key) => {
        setTab(key);
        const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        requestAnimationFrame(() => document.getElementById('team-tabs')?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' }));
    };
    const membersGoal = data.goals.find((g) => g.key === 'members');

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1.25rem', minWidth: 0 }}>
            <style>{CSS}</style>

            <StandingBanner standing={data.standing} tier={tier} />

            <div className="tm-top">
                <div className="tm-ref">
                    <ReferralHero
                        code={data.profile.referral_code}
                        counts={data.referrals || { total: 0, qualified: 0, pending: 0 }}
                        tier={tier}
                        goal={membersGoal && !data.quarter.partial ? { counted: membersGoal.counted, target: membersGoal.target } : null}
                        profileId={data.profile.id}
                        onOpenReferrals={() => openTab('referrals')}
                        showToast={showToast}
                    />
                </div>
                <div className="tm-start"><GetStarted data={data} onOpenTab={openTab} /></div>
                <aside className="tm-side" aria-label="Tour and chapter">
                    <TourVideo tour={data.tour} profileId={data.profile.id} />
                    <ChapterCard data={data} />
                </aside>
            </div>

            <CurrentQuarter data={data} onOpenTab={openTab} />

            <div id="team-tabs" style={{ scrollMarginTop: 84 }}>
                <LeadTabBar tab={tab} onChange={setTab} tier={tier} data={data} />
            </div>

            {tab !== 'overview' ? (
                <LeadTabPanel tab={tab} data={data} user={user} showToast={showToast} onChanged={onReload} />
            ) : (
                <>
                    <FeatureTiles title="What you can do" features={teamFeatures(can)} showLocked={false} />
                    <div className="tm-pair">
                        <EventsCard events={member.events} loading={member.loading} />
                        <PostsCard posts={member.posts} loading={member.loading} onSeeAll={member.openPosts} emptyAction={can('feed.post') ? { to: '/community-qna', label: 'Write your first post' } : null} />
                    </div>
                    <div className="tm-pair">
                        <MyContactMessages />
                        <StatsCard stats={member.stats} usage={member.usage} loading={member.loading} canPost={can('feed.post')} onDetails={member.openStats} />
                    </div>
                    <RegistrationsCard registrations={member.registrations} loading={member.loading} />
                </>
            )}
        </div>
    );
};

export default TeamDashboard;
