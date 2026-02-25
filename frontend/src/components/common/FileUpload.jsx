import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';
import { validatePDF } from '../../utils/fileValidator.js';
import { formatFileSize } from '../../utils/fileValidator.js';

/**
 * Drag-and-drop + click file upload with client-side validation.
 * @param {{ onFileSelect: (file:File|null)=>void, accept?: string, maxSize?: number, label?: string, error?: string }} props
 */
const FileUpload = ({
    onFileSelect,
    accept = 'application/pdf',
    label = 'Upload PDF',
    error: externalError,
}) => {
    const inputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [validError, setValidError] = useState(null);

    const processFile = (f) => {
        if (!f) return;
        const { valid, error } = validatePDF(f);
        if (!valid) {
            setValidError(error);
            onFileSelect(null);
            return;
        }
        setValidError(null);
        setFile(f);
        onFileSelect(f);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) processFile(f);
    };

    const handleChange = (e) => {
        const f = e.target.files[0];
        if (f) processFile(f);
    };

    const clearFile = () => {
        setFile(null);
        setValidError(null);
        onFileSelect(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    const displayError = validError || externalError;

    return (
        <div style={{ fontFamily: 'var(--font-sans)' }}>
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                aria-label="Choose file to upload"
                style={{
                    width: '100%',
                    padding: '2rem 1rem',
                    border: `2px dashed ${dragOver || file ? 'var(--primary)' : displayError ? '#DC2626' : 'var(--border-medium)'}`,
                    borderRadius: 'var(--radius-md)',
                    background: dragOver ? '#F0F4F8' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'border-color 0.2s, background 0.2s',
                }}
            >
                <UploadCloud size={28} color={dragOver ? 'var(--primary)' : 'var(--text-light)'} />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    {label}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                    Drag & drop or click to browse (PDF, max 10MB)
                </span>
            </button>

            <input
                ref={inputRef}
                type="file"
                accept={accept}
                onChange={handleChange}
                style={{ display: 'none' }}
                aria-hidden="true"
            />

            {/* Selected file display */}
            {file && (
                <div
                    style={{
                        marginTop: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.6rem 0.875rem',
                        background: '#F0FDF4',
                        border: '1px solid #86EFAC',
                        borderRadius: 'var(--radius-sm)',
                    }}
                >
                    <FileText size={16} color="#166534" />
                    <span style={{ flex: 1, fontSize: '0.85rem', color: '#166534', fontWeight: '500', wordBreak: 'break-all' }}>
                        {file.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#166534' }}>
                        {formatFileSize(file.size)}
                    </span>
                    <button
                        type="button"
                        onClick={clearFile}
                        aria-label="Remove file"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534', display: 'flex' }}
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Error */}
            {displayError && (
                <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#DC2626' }}>
                    {displayError}
                </p>
            )}
        </div>
    );
};

export default FileUpload;
