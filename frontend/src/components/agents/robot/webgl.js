/** Can this browser draw the 3D robots? Checked once, without loading the 3D code. */
let cached = null;

export const webglSupported = () => {
    if (cached !== null) return cached;
    try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        cached = !!gl;
        gl?.getExtension('WEBGL_lose_context')?.loseContext();   // give the probe context back straight away
    } catch {
        cached = false;
    }
    return cached;
};
