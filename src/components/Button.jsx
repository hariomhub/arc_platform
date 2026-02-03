import React from 'react';
import { Link } from 'react-router-dom';

const Button = ({ children, variant = 'primary', to, onClick, className = '', style, ...props }) => {
    const baseClass = `btn btn-${variant} ${className}`;

    if (to) {
        return <Link to={to} className={baseClass} style={style} {...props}>{children}</Link>;
    }

    return (
        <button onClick={onClick} className={baseClass} style={style} {...props}>
            {children}
        </button>
    );
};

export default Button;
