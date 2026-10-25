import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Video, Link2, Upload, Trash2, Save } from 'lucide-react';
import ConfirmDialog from '../../common/ConfirmDialog.jsx';
import { getTour, saveTourLink, saveTourText, deleteTour, uploadTourVideo } from '../../../api/adminChapterLeads.js';
import { getErrorMessage } from '../../../utils/apiHelpers.js';
import { colors, Card, SectionTitle, Pill, Button, Banner, Segmented, fieldStyle, labelStyle, fmtDate } from '../../chapterLead/ui.jsx';
import { ErrorNote, Spinner } from './shared.jsx';
import TourVideo from '../../team/TourVideo.jsx';

const MAX_MB = 100;

/**
 * The tour video every Chapter Lead and Chapter Ambassador sees on their dashboard. One video for both:
 * paste a YouTube or Vimeo link (best for anything longer than a few minutes), or upload a file up to 100 MB.
 * Saving replaces the video; the preview below is exactly what they see.
 */
const TourManager = ({ showToast }) => {
    const [tour, setTour] = useState(undefined);       // undefined = loading, null = none set
    const [error, setError] = useState('');
    const [mode, setMode] = useState('link');
    const [url, setUrl] = useState('');
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [busy, setBusy] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const fileInput = useRef(null);

    const load = useCallback(async () => {
        try {
            const res = await getTour();
            const t = res.data?.data || null;
            setTour(t);
            setTitle(t?.title || '');
            setDescription(t?.description || '');
            setError('');
        } catch (err) {
            setError(getErrorMessage(err));
            setTour(null);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const run = async (fn, message) => {
        setBusy(true);
        try {
            await fn();
            showToast?.(message, 'success');
            setUrl('');
            setFile(null);
            if (fileInput.current) fileInput.current.value = '';
            await load();
        } catch (err) {
            showToast?.(getErrorMessage(err), 'error');
        } finally {
            setBusy(false);
        }
    };

    const submit = (e) => {
        e.preventDefault();
        const text = { title: title.trim() || undefined, description: description.trim() || undefined };
        if (mode === 'link') {
            if (!url.trim()) { showToast?.('Paste the video link first.', 'warning'); return; }
            run(() => saveTourLink({ url: url.trim(), ...text }), 'The tour video is live on every team dashboard.');
        } else {
            if (!file) { showToast?.('Choose a video file first.', 'warning'); return; }
            if (file.size > MAX_MB * 1024 * 1024) { showToast?.(`That file is over ${MAX_MB} MB. Paste a YouTube or Vimeo link instead.`, 'warning'); return; }
            run(() => uploadTourVideo(file, text), 'The tour video is live on every team dashboard.');
        }
    };

    if (tour === undefined) return <Spinner />;

    const wordsChanged = tour && (title.trim() !== (tour.title || '') || description.trim() !== (tour.description || ''));

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            {error && <ErrorNote>{error}</ErrorNote>}

            <Card>
                <SectionTitle icon={Video} right={tour ? <Pill tone="green">Live</Pill> : <Pill tone="gray">Not set</Pill>}>Tour video</SectionTitle>
                <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: colors.muted, lineHeight: 1.6, maxWidth: 680 }}>
                    One short video that shows Chapter Leads and Chapter Ambassadors how to use the portal and what its key features are. It sits at the top of their dashboard,
                    next to the referral code, and the first-steps checklist asks them to watch it. Setting a new video replaces the old one, and everyone is asked to watch it again.
                </p>

                {tour && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px,100%), 1fr))', gap: '1.25rem', alignItems: 'start', marginBottom: '1.25rem' }}>
                        <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>What they see</div>
                            <TourVideo tour={tour} profileId="preview" preview />
                        </div>
                        <div style={{ fontSize: '0.82rem', color: colors.muted, lineHeight: 1.7 }}>
                            <div><strong style={{ color: colors.text }}>Source:</strong> {tour.source === 'upload' ? `Uploaded file (${tour.file_name || 'video'})` : `Link (${tour.provider})`}</div>
                            {tour.original_url && <div style={{ wordBreak: 'break-all' }}><strong style={{ color: colors.text }}>Link:</strong> {tour.original_url}</div>}
                            <div><strong style={{ color: colors.text }}>Set by:</strong> {tour.updated_by_name || 'an administrator'}{tour.updated_at ? `, ${fmtDate(tour.updated_at)}` : ''}</div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                <Button small tone="danger" onClick={() => setConfirmRemove(true)} disabled={busy}><Trash2 size={13} /> Remove video</Button>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={submit} style={{ display: 'grid', gap: '0.9rem', maxWidth: 680 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: colors.text }}>{tour ? 'Replace the video' : 'Add the video'}</div>
                    <Segmented
                        ariaLabel="How to add the video"
                        value={mode}
                        onChange={setMode}
                        disabled={busy}
                        options={[{ value: 'link', label: 'Paste a link' }, { value: 'upload', label: 'Upload a file' }]}
                    />

                    {mode === 'link' ? (
                        <div>
                            <label htmlFor="tour-url" style={labelStyle}>Video link</label>
                            <input id="tour-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." style={fieldStyle} disabled={busy} maxLength={500} inputMode="url" />
                            <p style={{ margin: '0.3rem 0 0', fontSize: '0.74rem', color: colors.muted, lineHeight: 1.5 }}>
                                A YouTube or Vimeo link, or a direct https link to an .mp4 or .webm file. On YouTube, set the video to Unlisted to keep it off search while anyone with the link can watch.
                            </p>
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="tour-file" style={labelStyle}>Video file</label>
                            <input id="tour-file" ref={fileInput} type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => setFile(e.target.files?.[0] || null)} style={fieldStyle} disabled={busy} />
                            <p style={{ margin: '0.3rem 0 0', fontSize: '0.74rem', color: colors.muted, lineHeight: 1.5 }}>
                                .mp4, .webm or .mov, up to {MAX_MB} MB. It is stored privately and shown only to signed-in team members. For a longer video, use a YouTube or Vimeo link.
                            </p>
                        </div>
                    )}

                    <div>
                        <label htmlFor="tour-title" style={labelStyle}>Title (optional)</label>
                        <input id="tour-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="How to use your dashboard" style={fieldStyle} disabled={busy} maxLength={120} />
                    </div>
                    <div>
                        <label htmlFor="tour-desc" style={labelStyle}>Short description (optional)</label>
                        <textarea id="tour-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What the video covers, and how long it takes." style={{ ...fieldStyle, resize: 'vertical' }} disabled={busy} maxLength={500} />
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Button type="submit" disabled={busy}>
                            {mode === 'link' ? <Link2 size={14} /> : <Upload size={14} />} {busy ? 'Saving...' : (tour ? 'Replace video' : 'Publish video')}
                        </Button>
                        {tour && wordsChanged && (
                            <Button tone="ghost" disabled={busy} onClick={() => run(() => saveTourText({ title: title.trim(), description: description.trim() }), 'The title and description are updated.')}>
                                <Save size={14} /> Save title and description only
                            </Button>
                        )}
                    </div>
                    {busy && mode === 'upload' && <Banner tone="info">Uploading. Keep this page open until it finishes.</Banner>}
                </form>
            </Card>

            <ConfirmDialog
                isOpen={confirmRemove}
                onClose={() => setConfirmRemove(false)}
                onConfirm={async () => { setConfirmRemove(false); await run(() => deleteTour(), 'The tour video was removed.'); }}
                loading={busy}
                title="Remove the tour video?"
                message="Team members will see a note that a tour is on its way until you add another one."
                confirmLabel="Remove"
            />
        </div>
    );
};

export default TourManager;
