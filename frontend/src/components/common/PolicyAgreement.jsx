import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

/**
 * The "I agree to the Privacy Policy and Terms" tick box. Links open in a new
 * tab so a half-filled form is never lost. Used by the Chapter Lead application
 * and the re-acceptance prompt for existing leads.
 */
const SCOPE = {
    lead: ', including the Chapter Lead role, quarterly goals and revenue-share terms.',
    ambassador: ', including the Chapter Ambassador role, quarterly goals, and that my name, role and chapter are listed publicly while I hold the role.',
    team: ', including the chapter team roles, quarterly goals, the public chapter page and, for Chapter Leads, the revenue-share terms.',
};

const PolicyAgreement = ({ checked, onChange, error, disabled = false, id = 'accept-privacy', scope = 'lead' }) => (
    <div>
        <label
            htmlFor={id}
            style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: disabled ? 'not-allowed' : 'pointer',
                background: error ? '#FFF5F5' : '#F8FAFC', border: `1px solid ${error ? '#FCA5A5' : '#E2E8F0'}`,
                borderRadius: '8px', padding: '0.7rem 0.8rem',
            }}
        >
            <input
                id={id}
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: '#003366', flexShrink: 0 }}
            />
            <span style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.55 }}>
                <strong style={{ color: '#1E293B' }}>I have read and agree to the </strong>
                <Link to="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#003366', fontWeight: 600 }}>Privacy Policy</Link>
                {' '}and{' '}
                <Link to="/terms#chapter-lead" target="_blank" rel="noopener noreferrer" style={{ color: '#003366', fontWeight: 600 }}>Terms</Link>
                {SCOPE[scope] || SCOPE.lead} <span style={{ color: '#EF4444' }}>*</span>
            </span>
        </label>
        {error && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.74rem', color: '#DC2626', marginTop: 4 }}>
                <AlertCircle size={11} />{error}
            </span>
        )}
    </div>
);

export default PolicyAgreement;
