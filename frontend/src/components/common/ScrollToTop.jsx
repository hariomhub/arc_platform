import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scrolls to top on every route change. Renders nothing. */
const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [pathname]);

    return null;
};

export default ScrollToTop;
