/**
 * Trigger browser file download from a blob response.
 * @param {Blob | ArrayBuffer} blobData
 * @param {string} filename
 */
export const downloadBlob = (blobData, filename) => {
    const url = window.URL.createObjectURL(new Blob([blobData]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

/**
 * Extract a human-readable error message from an Axios error.
 * @param {unknown} error
 * @returns {string}
 */
export const getErrorMessage = (error) => {
    return (
        error?.response?.data?.message ||
        error?.message ||
        'Something went wrong. Please try again.'
    );
};

/**
 * Build URLSearchParams from an object, skipping null/undefined/'all' values.
 * @param {Record<string, unknown>} params
 * @returns {URLSearchParams}
 */
export const buildQueryParams = (params) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '' && value !== 'all') {
            sp.set(key, String(value));
        }
    });
    return sp;
};

/**
 * Safely parse JSON — returns null on failure.
 * @param {string} str
 * @returns {unknown | null}
 */
export const safeJSON = (str) => {
    try { return JSON.parse(str); }
    catch { return null; }
};
