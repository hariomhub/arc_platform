/**
 * pricing.js - single source of truth for the membership offer.
 *
 * Market, currency, amount, period, offer length and tax wording all live here.
 * Every screen that shows a price or the offer terms (cards, FAQ, modals) must
 * read from this file rather than hard-coding numbers.
 *
 * Owner-approved pricing: first 12 months are complimentary; afterwards
 *   India:         INR 1,999 per year + applicable GST/taxes
 *   United States: US$49 per year + applicable taxes
 * There is no automatic paid renewal. Tax rates are NOT configured here - the
 * business supplies them before any paid renewal is enabled.
 */

export const COMPLIMENTARY_MONTHS = 12;

export const NO_PAYMENT_LINE = 'No payment required today. No automatic paid renewal.';

export const MARKETS = {
    IN: {
        code: 'IN',
        label: 'India',
        currency: 'INR',
        complimentaryPrice: '₹0',
        renewalPrice: '₹1,999',
        renewalPeriod: 'year',
        taxNote: 'plus applicable GST/taxes',
    },
    US: {
        code: 'US',
        label: 'United States',
        currency: 'USD',
        complimentaryPrice: 'US$0',
        renewalPrice: 'US$49',
        renewalPeriod: 'year',
        taxNote: 'plus applicable taxes',
    },
};

export const MARKET_ORDER = ['IN', 'US'];

/** "Then ₹1,999 per year, plus applicable GST/taxes." */
export const renewalLine = (market) =>
    `Then ${market.renewalPrice} per ${market.renewalPeriod}, ${market.taxNote}.`;

/** "for your first 12 months" */
export const complimentaryPeriodLine = () => `for your first ${COMPLIMENTARY_MONTHS} months`;

/** One-line summary used in the FAQ: both markets, taxes stated separately. */
export const renewalSummary = () =>
    `You can choose to renew annually at ${MARKETS.IN.renewalPrice} in India or ${MARKETS.US.renewalPrice} in the United States, plus applicable taxes. There is no automatic paid renewal.`;

/**
 * Suggests a default market from the browser locale / time zone. It is only a
 * suggestion - the visitor can always pick the other market. Returns null when
 * there is no clear signal (e.g. any country other than India or the US), so we
 * never guess for markets that have no defined policy yet.
 */
export const detectSuggestedMarket = () => {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const lang = (typeof navigator !== 'undefined' && navigator.language) || '';
        if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta' || /-IN$/i.test(lang)) return 'IN';
        if (/-US$/i.test(lang) && tz.startsWith('America/')) return 'US';
    } catch {
        /* no suggestion */
    }
    return null;
};
