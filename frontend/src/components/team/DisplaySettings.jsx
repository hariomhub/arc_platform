import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { getDisplaySettings, saveDisplaySettings } from '../../api/chapterLead.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';
import { colors, Card, SectionTitle, Switch } from '../ui/kit.jsx';

const FIELDS = [
    { key: 'show_photo',          label: 'My photo',          description: 'Your profile photo next to your name.' },
    { key: 'show_organisation',   label: 'My organisation',   description: 'Off by default. Showing an employer can matter to your employer, so it is your call.' },
    { key: 'show_linkedin',       label: 'My LinkedIn link',  description: 'A link to your LinkedIn profile.' },
    { key: 'show_bio',            label: 'My short bio',      description: 'The first lines of the bio on your profile.' },
    { key: 'show_in_leaderboard', label: 'Show me on the leaderboard', description: 'Your team sees your name and score. Off shows you as "Hidden member" to others.' },
];

/**
 * What the public chapter page shows about me. My name, role and chapter are always listed while the
 * role is active (the Terms say so); everything else is my own choice and saves as I flip it.
 */
const DisplaySettings = ({ chapterSlug, showToast }) => {
    const [settings, setSettings] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let alive = true;
        getDisplaySettings()
            .then((res) => { if (alive) setSettings(res.data?.data || null); })
            .catch((err) => { if (alive) setError(getErrorMessage(err)); });
        return () => { alive = false; };
    }, []);

    const toggle = async (key, value) => {
        const before = settings;
        setSettings({ ...settings, [key]: value });          // show the change at once
        try {
            const res = await saveDisplaySettings({ [key]: value });
            setSettings(res.data?.data || { ...before, [key]: value });
        } catch (err) {
            setSettings(before);
            showToast?.(getErrorMessage(err), 'error');
        }
    };

    return (
        <Card>
            <SectionTitle icon={Eye}>On your chapter page</SectionTitle>
            <p style={{ margin: '0 0 0.8rem', fontSize: '0.78rem', color: colors.muted, lineHeight: 1.6 }}>
                While you hold this role your name, role and chapter are listed on the public chapter page. You choose what else is shown.
            </p>
            {error && <p style={{ margin: 0, fontSize: '0.8rem', color: colors.red }}>{error}</p>}
            {!settings && !error && <div className="skel" style={{ height: 120 }} />}
            {settings && (
                <div style={{ display: 'grid', gap: 12 }}>
                    {FIELDS.map((f) => (
                        <Switch
                            key={f.key}
                            id={`display-${f.key}`}
                            checked={Boolean(settings[f.key])}
                            onChange={(v) => toggle(f.key, v)}
                            label={f.label}
                            description={f.description}
                        />
                    ))}
                </div>
            )}
            {chapterSlug && (
                <p style={{ margin: '0.9rem 0 0', fontSize: '0.78rem' }}>
                    <Link to={`/chapters/${chapterSlug}`} style={{ color: colors.primary, fontWeight: 700 }}>See your chapter page</Link>
                </p>
            )}
        </Card>
    );
};

export default DisplaySettings;
