import React from 'react';

const Card = ({ title, children, className = '', footer }) => {
    return (
        <div className={`card ${className}`}>
            {title && <h4 className="mb-4 text-xl font-semibold text-primary">{title}</h4>}
            <div className="card-content">
                {children}
            </div>
            {footer && <div className="mt-4 pt-4 border-t border-gray-100">{footer}</div>}
        </div>
    );
};

export default Card;
