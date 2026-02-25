import { useContext } from 'react';
import ToastContext from '../context/ToastContext.jsx';

/**
 * Access the ToastContext.
 * Must be used inside <ToastProvider>.
 */
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used inside <ToastProvider>');
    }
    return context;
};
