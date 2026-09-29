/**
 * brand.js - the one place the operating company's legal name lives.
 *
 * OWNER INPUT STILL NEEDED: set OPERATOR_LEGAL_NAME to the exact registered
 * legal name of the company that operates Risk AI Council. Until it is set,
 * operatorLine() returns null and no "an initiative of ..." sentence is
 * rendered anywhere, so a placeholder or guessed name can never go public.
 *
 * Used by: About (now), and Footer / Terms / Privacy once those are updated.
 */
export const OPERATOR_LEGAL_NAME = 'PinkUnicorn Algorithms';

/** "Risk AI Council is an initiative of <legal name>." - or null until the name is set. */
export const operatorLine = () =>
    OPERATOR_LEGAL_NAME ? `Risk AI Council is an initiative of ${OPERATOR_LEGAL_NAME}.` : null;
