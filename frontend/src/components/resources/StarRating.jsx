/**
 * StarRating.jsx — reusable star display + interactive selector
 * Props:
 *   value       — current rating (1-5 or 0 for none)
 *   onChange    — if provided, renders interactive selector
 *   size        — star size in px (default 16)
 *   showLabel   — show "X.X / 5" text next to stars
 *   count       — show (N reviews) text
 */
import React, { useState } from 'react';

const Star = ({ filled, half, size, color, hovered }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        style={{ display: 'block', transition: 'transform 0.1s' }}
        xmlns="http://www.w3.org/2000/svg">
        {half ? (
            <>
                <defs>
                    <linearGradient id="half-grad">
                        <stop offset="50%" stopColor={color} />
                        <stop offset="50%" stopColor="#e2e8f0" />
                    </linearGradient>
                </defs>
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                    fill="url(#half-grad)" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
            </>
        ) : (
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                fill={filled ? color : '#e2e8f0'}
                stroke={filled ? color : '#cbd5e1'}
                strokeWidth="1.5" strokeLinejoin="round" />
        )}
    </svg>
);

const StarRating = ({
    value = 0,
    onChange,
    size = 16,
    color = '#f59e0b',
    showLabel = false,
    count,
    className,
}) => {
    const [hover, setHover] = useState(0);
    const interactive = !!onChange;
    const display     = interactive ? (hover || value) : value;

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} className={className}>
            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map(star => (
                    <span key={star}
                        onMouseEnter={() => interactive && setHover(star)}
                        onMouseLeave={() => interactive && setHover(0)}
                        onClick={() => interactive && onChange(star)}
                        style={{
                            cursor: interactive ? 'pointer' : 'default',
                            display: 'flex',
                            transform: interactive && hover === star ? 'scale(1.25)' : 'scale(1)',
                            transition: 'transform 0.1s',
                        }}>
                        <Star
                            filled={display >= star}
                            half={!interactive && display > star - 1 && display < star}
                            size={size}
                            color={color}
                            hovered={hover === star}
                        />
                    </span>
                ))}
            </div>
            {showLabel && value > 0 && (
                <span style={{ fontSize: size * 0.8, fontWeight: '700', color: '#1a1a2e', lineHeight: 1 }}>
                    {Number(value).toFixed(1)}
                </span>
            )}
            {count !== undefined && (
                <span style={{ fontSize: size * 0.75, color: '#9aaab7', fontWeight: '500' }}>
                    ({count})
                </span>
            )}
        </div>
    );
};

export default StarRating;