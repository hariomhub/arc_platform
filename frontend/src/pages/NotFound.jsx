import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Calendar, BookOpen, MessageSquare } from 'lucide-react';

const SUGGESTIONS = [
    { label: 'Events', href: '/events', icon: Calendar },
    { label: 'Resources', href: '/resources', icon: BookOpen },
    { label: 'Community Q&A', href: '/community-qna', icon: MessageSquare },
];

const NotFound = () => {
    const navigate = useNavigate();
    useEffect(() => { document.title = '404 Not Found | ARC'; }, []);

    return (
        <div className="min-h-[75vh] flex flex-col items-center justify-center text-center px-8 py-16 bg-slate-50">
            {/* Large 404 */}
            <div
                className="text-[8rem] font-black leading-none text-slate-200 mb-4 select-none font-serif"
                aria-hidden="true"
            >
                404
            </div>

            <h1 className="font-serif text-[#003366] text-4xl mb-3">Page Not Found</h1>
            <p className="text-slate-500 max-w-md mb-10 text-base leading-relaxed">
                The page you're looking for doesn't exist or may have been moved. Let's get you back on track.
            </p>

            {/* Action buttons */}
            <div className="flex gap-4 flex-wrap justify-center mb-12">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 bg-[#003366] text-white px-7 py-3 rounded-md font-bold text-sm no-underline hover:opacity-90 transition-opacity"
                >
                    <Home size={16} /> Go Home
                </Link>
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 bg-white text-slate-500 border border-slate-300 px-7 py-3 rounded-md font-semibold text-sm cursor-pointer font-sans hover:border-slate-400 transition-colors"
                >
                    <ArrowLeft size={16} /> Go Back
                </button>
            </div>

            {/* Suggested links */}
            <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">Explore</p>
                <div className="flex gap-3 flex-wrap justify-center">
                    {SUGGESTIONS.map(({ label, href, icon: Icon }) => (
                        <Link
                            key={href}
                            to={href}
                            className="inline-flex items-center gap-1.5 bg-white text-[#003366] border border-slate-200 px-4 py-2 rounded-md font-semibold text-sm no-underline shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all"
                        >
                            <Icon size={14} /> {label}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default NotFound;
