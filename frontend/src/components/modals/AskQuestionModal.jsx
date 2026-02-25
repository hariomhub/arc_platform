import React, { useState } from 'react';
import Modal from '../common/Modal.jsx';
import { createQnaPost } from '../../api/qna.js';
import { useToast } from '../../hooks/useToast.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';

/**
 * Modal to ask a new QnA question.
 * @param {{ isOpen: boolean, onClose: ()=>void, onSuccess?: ()=>void }} props
 */
const AskQuestionModal = ({ isOpen, onClose, onSuccess }) => {
    const { showToast } = useToast();

    const [form, setForm] = useState({ title: '', body: '', tags: '' });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const validate = () => {
        const e = {};
        if (!form.title.trim()) e.title = 'Title is required.';
        else if (form.title.length < 10) e.title = 'Title must be at least 10 characters.';
        if (!form.body.trim()) e.body = 'Question body is required.';
        else if (form.body.length < 20) e.body = 'Body must be at least 20 characters.';
        return e;
    };

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setLoading(true);
        try {
            const tags = form.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);

            await createQnaPost({ title: form.title, body: form.body, tags });
            showToast('Question posted successfully!', 'success');
            setForm({ title: '', body: '', tags: '' });
            setErrors({});
            onClose();
            onSuccess?.();
        } catch (err) {
            showToast(getErrorMessage(err), 'error');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = (hasError) => ({
        width: '100%',
        padding: '0.6rem 0.75rem',
        border: `1px solid ${hasError ? '#DC2626' : 'var(--border-light)'}`,
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.875rem',
        fontFamily: 'var(--font-sans)',
        color: 'var(--text-main)',
        outline: 'none',
        transition: 'border-color 0.15s',
        resize: 'vertical',
    });

    const labelStyle = {
        display: 'block',
        fontSize: '0.8rem',
        fontWeight: '700',
        color: 'var(--text-main)',
        marginBottom: '0.4rem',
        fontFamily: 'var(--font-sans)',
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ask a Question" size="md">
            <form onSubmit={handleSubmit} noValidate style={{ fontFamily: 'var(--font-sans)' }}>
                {/* Title */}
                <div style={{ marginBottom: '1rem' }}>
                    <label htmlFor="qna-title" style={labelStyle}>
                        Title <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                        id="qna-title"
                        type="text"
                        value={form.title}
                        onChange={handleChange('title')}
                        placeholder="e.g. How does the EU AI Act classify high-risk systems?"
                        style={inputStyle(!!errors.title)}
                        maxLength={200}
                    />
                    {errors.title && (
                        <p style={{ color: '#DC2626', fontSize: '0.78rem', marginTop: '3px' }}>{errors.title}</p>
                    )}
                </div>

                {/* Body */}
                <div style={{ marginBottom: '1rem' }}>
                    <label htmlFor="qna-body" style={labelStyle}>
                        Details <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <textarea
                        id="qna-body"
                        value={form.body}
                        onChange={handleChange('body')}
                        placeholder="Describe your question in detail…"
                        rows={5}
                        style={{ ...inputStyle(!!errors.body), minHeight: '120px' }}
                    />
                    {errors.body && (
                        <p style={{ color: '#DC2626', fontSize: '0.78rem', marginTop: '3px' }}>{errors.body}</p>
                    )}
                </div>

                {/* Tags */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label htmlFor="qna-tags" style={labelStyle}>
                        Tags{' '}
                        <span style={{ fontWeight: '400', color: 'var(--text-light)' }}>
                            (optional, comma-separated)
                        </span>
                    </label>
                    <input
                        id="qna-tags"
                        type="text"
                        value={form.tags}
                        onChange={handleChange('tags')}
                        placeholder="e.g. EU AI Act, governance, model risk"
                        style={inputStyle(false)}
                    />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        style={{
                            padding: '0.6rem 1.25rem',
                            border: '1px solid var(--border-medium)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'white',
                            color: 'var(--text-secondary)',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontFamily: 'var(--font-sans)',
                            opacity: loading ? 0.5 : 1,
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '0.6rem 1.5rem',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--primary)',
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: '700',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontFamily: 'var(--font-sans)',
                            opacity: loading ? 0.7 : 1,
                        }}
                    >
                        {loading ? 'Posting…' : 'Post Question'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AskQuestionModal;
