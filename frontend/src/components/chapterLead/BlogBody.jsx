import React from 'react';
import { colors } from './ui.jsx';
import { parseBlocks, headingId } from './blogText.js';

/**
 * Renders blog text safely. The body is plain text — it is NEVER injected as HTML —
 * so a blog can't carry scripts. A tiny set of conventions gives it structure:
 *
 *   blank line        -> new paragraph
 *   "## Heading"      -> section heading (gets an id, so the page can link to it)
 *   "- item" lines    -> bullet list
 *   single newline    -> line break inside a paragraph
 *
 * The first paragraph is set slightly larger, as an opening line.
 */
const BlogBody = ({ text }) => {
    const blocks = parseBlocks(text);
    const firstParagraph = blocks.findIndex((b) => !b.startsWith('## ') && !b.split('\n').every((l) => l.trim().startsWith('- ')));

    return (
        <div style={{ fontSize: '1.08rem', lineHeight: 1.85, color: '#334155' }}>
            {blocks.map((block, i) => {
                if (block.startsWith('## ')) {
                    const title = block.slice(3);
                    return (
                        <h2 key={i} id={headingId(title, i)} style={{ margin: '2.4rem 0 0.8rem', paddingTop: '0.4rem', fontSize: '1.55rem', fontWeight: 800, color: colors.text, lineHeight: 1.3, letterSpacing: '-0.01em', scrollMarginTop: 96 }}>
                            {title}
                        </h2>
                    );
                }
                const lines = block.split('\n');
                if (lines.every((l) => l.trim().startsWith('- '))) {
                    return (
                        <ul key={i} style={{ margin: '0 0 1.4rem', paddingLeft: '1.5rem', listStyleType: 'disc' }}>
                            {lines.map((l, j) => <li key={j} style={{ marginBottom: 8, paddingLeft: 4 }}>{l.trim().slice(2)}</li>)}
                        </ul>
                    );
                }
                const lead = i === firstParagraph;
                return (
                    <p key={i} style={{ margin: '0 0 1.4rem', ...(lead ? { fontSize: '1.22rem', lineHeight: 1.75, color: colors.text } : null) }}>
                        {lines.map((l, j) => (
                            <React.Fragment key={j}>{l}{j < lines.length - 1 && <br />}</React.Fragment>
                        ))}
                    </p>
                );
            })}
        </div>
    );
};

export default BlogBody;
