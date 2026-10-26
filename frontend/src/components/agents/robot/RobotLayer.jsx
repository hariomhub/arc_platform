import React, { useEffect, useRef } from 'react';

/**
 * RobotLayer - the 3D robots for whatever element it is placed in (it fills its positioned parent and lets clicks
 * through). The 3D code, and three.js with it, is only fetched when a layer first mounts.
 *
 *   items   [{ bot, finish, held, p, getEl }]  fixed for the life of the layer (pass a memoised array)
 *   layout  (host) => [{ x, ground, scale, k }]  where each robot stands, see three/runtime.js
 *   onFail  called once if WebGL could not be used, so the caller can fall back to the flat drawing
 */
const RobotLayer = ({ items, layout, pixelRatioCap, onFail }) => {
    const hostRef = useRef(null);
    useEffect(() => {
        let dead = false;
        let stage = null;
        import('./three/runtime.js')
            .then((rt) => {
                if (dead) return;
                stage = rt.mount(hostRef.current, { items, layout, pixelRatioCap, onError: onFail });
                if (!stage) onFail?.();
            })
            .catch(() => { if (!dead) onFail?.(); });
        return () => { dead = true; stage?.dispose(); };
        // the layer is built once for a fixed set of bots
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <div ref={hostRef} className="bot-3d" aria-hidden="true" />;
};

export default RobotLayer;
