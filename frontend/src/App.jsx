import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import ScrollToTop from './components/common/ScrollToTop.jsx';
import LoadingSpinner from './components/common/LoadingSpinner.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import AdminRoute from './components/common/AdminRoute.jsx';
import { useAuth } from './hooks/useAuth.js';

// ─── Lazy page imports ────────────────────────────────────────────────────────
const Home = lazy(() => import('./pages/Home.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Events = lazy(() => import('./pages/Events.jsx'));
const Services = lazy(() => import('./pages/Services.jsx'));
const Framework = lazy(() => import('./pages/Framework.jsx'));
const Resources = lazy(() => import('./pages/Resources.jsx'));
const Certifications = lazy(() => import('./pages/Certifications.jsx'));
const CommunityQnA = lazy(() => import('./pages/CommunityQnA.jsx'));
const QnADetail = lazy(() => import('./pages/QnADetail.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const Membership = lazy(() => import('./pages/Membership.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));
const UserManagement = lazy(() => import('./pages/UserManagement.jsx'));
const UserDashboard = lazy(() => import('./pages/UserDashboard.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const ProductReviews = lazy(() => import('./pages/ProductReviews.jsx'));
const ProductReviewDetail = lazy(() => import('./pages/ProductReviewDetail.jsx'));
const AllNominees = lazy(() => import('./pages/AllNominees.jsx'));
const AllWinners = lazy(() => import('./pages/AllWinners.jsx'));
const AdminNominees = lazy(() => import('./pages/AdminNominees.jsx'));
const News = lazy(() => import('./pages/News.jsx'));
const ExecutiveCheckout = lazy(() => import('./pages/ExecutiveCheckout.jsx'));

// ── OAuth landing: waits for cookie/session restore then routes correctly ──
const OAuthLanding = () => {
  const { user, isAuthLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthLoading) return;   // wait for getMe() to finish
    if (user) {
      if (user.role === 'founding_member') {
        navigate('/admin-dashboard', { replace: true });
      } else {
        navigate('/user/dashboard', { replace: true });
      }
    } else {
      navigate('/login?error=linkedin_failed', { replace: true });
    }
  }, [user, isAuthLoading, navigate]);

  return <LoadingSpinner fullPage />;
};

// ─── Auth-aware redirector (login / register redirect if already signed in) ──
const GuestRoute = ({ children }) => {
  const { user, isAuthLoading } = useAuth();
  if (isAuthLoading) return <LoadingSpinner fullPage />;
  if (user) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <>
      <ScrollToTop />
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main id="main-content" style={{ flex: 1 }}>
          <Suspense fallback={<LoadingSpinner fullPage />}>
            <Routes>
              {/* ── Public routes ── */}
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/events" element={<Events />} />
              <Route path="/services" element={<Services />} />
              <Route path="/framework" element={<Framework />} />
              <Route path="/assessment" element={<Navigate to="/framework" replace />} />
              <Route path="/ai-research" element={<Navigate to="/community-qna" replace />} />
              <Route path="/certification" element={<Certifications />} />

              {/* ── Research & Resources — open to all; page handles role-based UI ── */}
              <Route path="/resources" element={<Resources />} />
              <Route path="/community-qna" element={<CommunityQnA />} />
              <Route path="/community-qna/:id" element={<QnADetail />} />
              <Route path="/news" element={<News />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/services/product-reviews" element={<ProductReviews />} />
              <Route path="/services/product-reviews/:id" element={<ProductReviewDetail />} />
              <Route path="/nominees" element={<AllNominees />} />
              <Route path="/winners" element={<AllWinners/>} />

              {/* ── Guest-only routes ── */}
              <Route path="/membership" element={<Membership />} />
              <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

              {/* ── Protected routes ── */}
              <Route
                path="/executive-checkout"
                element={
                  <ProtectedRoute>
                    <ExecutiveCheckout />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* ── User dashboard ── */}
              <Route
                path="/user/dashboard"
                element={
                  <ProtectedRoute>
                    <UserDashboard />
                  </ProtectedRoute>
                }
              />

              {/* ── Admin routes ── */}
              <Route
                path="/admin-dashboard"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin-dashboard/users"
                element={
                  <AdminRoute>
                    <UserManagement />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin-dashboard/nominees"
                element={
                  <AdminRoute>
                    <AdminNominees />
                  </AdminRoute>
                }
              />

              {/* ── OAuth callback landing (LinkedIn, Google, etc.) ── */}
              <Route path="/auth/callback" element={<OAuthLanding />} />

              {/* ── Catch-all ── */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </>
  );
}

export default App;
