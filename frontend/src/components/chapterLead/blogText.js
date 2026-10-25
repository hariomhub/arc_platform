// Pure helpers for the blog editor: formatting at the cursor, counts, and the copy that guides a writer.
// No React in here, so it is easy to test on its own.

const lineStart = (v, i) => (i <= 0 ? 0 : v.lastIndexOf('\n', i - 1) + 1);
const lineEnd = (v, i) => {
    const n = v.indexOf('\n', i);
    return n === -1 ? v.length : n;
};

// BlogBody only treats a heading or a bullet list as one when it is its own paragraph,
// so formatting pads it with blank lines on both sides.
const padBefore = (before) => (before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n');
const padAfter = (after) => (after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n');

/** Turn the line at `s` into a "## " heading, or back into plain text if it already is one. */
export const toggleHeading = (v, s) => {
    const ls = lineStart(v, s);
    const le = lineEnd(v, s);
    const line = v.slice(ls, le);
    if (line.startsWith('## ')) {
        const plain = line.slice(3);
        const caret = ls + plain.length;
        return { text: v.slice(0, ls) + plain + v.slice(le), start: caret, end: caret };
    }
    const before = v.slice(0, ls);
    const after = v.slice(le);
    const head = `${before}${padBefore(before)}## ${line.replace(/^- /, '')}`;
    return { text: head + padAfter(after) + after, start: head.length, end: head.length };
};

/** Turn the selected lines into "- " bullets, or back into plain lines if they all are bullets. */
export const toggleBullets = (v, s, e) => {
    const end = e > s && v[e - 1] === '\n' ? e - 1 : e; // a selection that ends at the start of a line does not include that line
    const ls = lineStart(v, s);
    const le = lineEnd(v, Math.max(s, end));
    const lines = v.slice(ls, le).split('\n');
    const filled = lines.filter((l) => l.trim() !== '');
    const allBullets = filled.length > 0 && filled.every((l) => l.startsWith('- '));
    const before = v.slice(0, ls);
    const after = v.slice(le);

    if (allBullets) {
        const plain = lines.map((l) => (l.startsWith('- ') ? l.slice(2) : l)).join('\n');
        return { text: before + plain + after, start: ls, end: ls + plain.length };
    }
    const list = lines.map((l) => (l.trim() === '' || l.startsWith('- ') ? l : `- ${l.replace(/^## /, '')}`)).join('\n');
    const pre = padBefore(before);
    return { text: before + pre + list + padAfter(after) + after, start: ls + pre.length, end: ls + pre.length + list.length };
};

export const countWords = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;

/** Whole minutes at ~200 words a minute; 0 for an empty text. */
export const readingMinutes = (words) => (words > 0 ? Math.max(1, Math.ceil(words / 200)) : 0);

export const STARTER_OUTLINE = `## The problem

What did you run into, and why does it matter to people who work in AI risk?

## What we learned

- One concrete lesson
- Another, ideally with an example

## What to do next

Give readers one clear step they can take this week.
`;

export const TOPIC_IDEAS = [
    'What the EU AI Act means for model validation',
    'A practical checklist for auditing a generative AI system',
    'A real AI incident, and how to stop the next one',
    'How to govern third-party AI vendors without slowing the business',
    'Explaining model risk to a board in plain English',
];

// Questions that rotate (typed out) in the editor header to spark an idea. Not clickable on purpose:
// the topic chips under the title are the ones that fill the headline.
export const WRITING_PROMPTS = [
    'What did you learn this quarter that your peers should know?',
    'Which AI risk do people keep underestimating?',
    'What would you tell yourself a year ago about AI governance?',
    'Which framework or control finally clicked for you?',
    'What went wrong on a project, and what fixed it?',
];

export const TIPS = [
    'Open with the problem your reader has, not with your background.',
    'Use ## headings so people can skim, and keep paragraphs short.',
    'Give one real example. Specifics beat general advice.',
    'End with a clear takeaway the reader can act on.',
];

/** Encouragement that follows the length of the text. `tone` picks the colour of the progress bar. */
export const stageMessage = (chars, min) => {
    if (chars === 0) return { tone: 'idle', text: 'Start with one sentence. You can polish it later.' };
    const p = chars / min;
    if (p < 0.4) return { tone: 'go', text: 'Good start. Keep going while the idea is fresh.' };
    if (p < 0.8) return { tone: 'go', text: "You're finding your flow." };
    if (p < 1) return { tone: 'go', text: 'Almost there. A few more lines and you can submit.' };
    return { tone: 'done', text: 'Long enough to submit. Read it once more, then send it for review.' };
};

// ── Reading side: the same blocks drive the page body and its "On this page" outline ──

/** Blank lines separate blocks. Shared by BlogBody and the outline so heading ids always line up. */
export const parseBlocks = (text) =>
    String(text || '').replace(/\r\n/g, '\n').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

export const headingId = (title, index) =>
    `s${index}-${String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)}`;

/** [{ id, title }] for every "## " heading, in order. */
export const outlineOf = (text) =>
    parseBlocks(text).flatMap((block, index) => (block.startsWith('## ')
        ? [{ id: headingId(block.slice(3), index), title: block.slice(3).trim() }]
        : []));
