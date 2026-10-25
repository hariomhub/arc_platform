import React, { useEffect, useState } from 'react';

/**
 * A thin bar at the very top of the window that fills as the article is read, so a long piece shows how far
 * there is to go. `targetRef` is the article element: the bar runs from its top to its bottom.
 */
const ReadingProgress = ({ targetRef }) => {
    const [percent, setPercent] = useState(0);

    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            const el = targetRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const total = rect.height - window.innerHeight;
            setPercent(total <= 0 ? 100 : Math.min(100, Math.max(0, (-rect.top / total) * 100)));
        };
        const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, [targetRef]);

    return (
        <div role="progressbar" aria-label="Reading progress" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 1200, background: 'transparent', pointerEvents: 'none' }}>
            <div style={{ width: `${percent}%`, height: '100%', background: '#0A4F99' }} />
        </div>
    );
};

export default ReadingProgress;
