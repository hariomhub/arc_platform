/**
 * Average feature-test score, shared between the admin Managing panel and the
 * public product detail page so the formula can't drift between the two.
 * @param {{score: number|string|null}[]} featureTests
 * @returns {string|null} formatted to 1 decimal, or null if nothing has a score yet
 */
export const calcAvgTestScore = (featureTests) => {
    const scored = (featureTests || []).filter((ft) => ft.score != null);
    if (scored.length === 0) return null;
    const sum = scored.reduce((s, ft) => s + (parseFloat(ft.score) || 0), 0);
    return (sum / scored.length).toFixed(1);
};
