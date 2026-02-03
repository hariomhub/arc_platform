import React from 'react';

const Section = ({ children, className = '', background = 'white', ...props }) => {
    const bgClass = background === 'light' ? 'section-bg' : '';
    return (
        <section className={`section ${bgClass} ${className}`} {...props}>
            <div className="container">
                {children}
            </div>
        </section>
    );
};

export default Section;
