/**
 * Request-level auth diagnostics. Off unless DEBUG_AUTH=on: logging every request (and the
 * names of its cookies) on a production server is noise and a small privacy leak.
 */
export const debugAuth = (...args) => {
    if (process.env.DEBUG_AUTH === 'on') console.log(...args);
};
