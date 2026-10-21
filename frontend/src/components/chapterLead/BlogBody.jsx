import React from 'react';
import { colors } from './ui.jsx';

/**
 * Renders blog text safely. The body is plain text — it is NEVER injected as HTML —
 * so a blog can't carry scripts. A tiny set of conventions gives it structure:
 *
 *   blank line        -> new paragraph
 *   "## Heading"      -> section heading
 *   "- item" lines    -> bullet list
 *   single newline    -> line break inside a paragraph
 */
const BlogBody = ({ text }) => {
    const blocks = String(text || '').replace(/\r\n/g, '\n').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

    return (
        <div style={{ fontSize: '1.02rem', lineHeight: 1.85, color: '#334155' }}>
            {blocks.map((block, i) => {
                if (block.startsWith('## ')) {
                    return <h2 key={i} style={{ margin: '2rem 0 0.7rem', fontSize: '1.35rem', fontWeight: 800, color: colors.text }}>{block.slice(3)}</h2>;
                }
                const lines = block.split('\n');
                if (lines.every((l) => l.trim().startsWith('- '))) {
                    return (
                        <ul key={i} style={{ margin: '0 0 1.2rem', paddingLeft: '1.4rem' }}>
                            {lines.map((l, j) => <li key={j} style={{ marginBottom: 4 }}>{l.trim().slice(2)}</li>)}
                        </ul>
                    );
                }
                return (
                    <p key={i} style={{ margin: '0 0 1.2rem' }}>
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
