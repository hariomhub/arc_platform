/**
 * Switches that let code ship before the paperwork around it is ready.
 *
 * EARNINGS_GATE=on  existing Chapter Leads are asked to choose "receive" or "waive" earnings (and to
 *                   confirm employer clearance) at their next sign-in. Leave it off until counsel has
 *                   approved the wording; ambassadors give the confirmation when they apply either way.
 */
export const earningsGateOn = () => String(process.env.EARNINGS_GATE || '').toLowerCase() === 'on';
