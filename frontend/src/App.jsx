import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

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
const Assessment = lazy(() => import('./pages/Assessment.jsx'));
const Resources = lazy(() => import('./pages/Resources.jsx'));
const Certifications = lazy(() => import('./pages/Certifications.jsx'));
const AIResearch = lazy(() => import('./pages/AIResearch.jsx'));
const CommunityQnA = lazy(() => import('./pages/CommunityQnA.jsx'));
const QnADetail = lazy(() => import('./pages/QnADetail.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const Membership = lazy(() => import('./pages/Membership.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));
const UserManagement = lazy(() => import('./pages/UserManagement.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

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
              <Route path="/assessment" element={<Assessment />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/certification" element={<Certifications />} />
              <Route path="/ai-research" element={<AIResearch />} />
              <Route path="/community-qna" element={<CommunityQnA />} />
              <Route path="/community-qna/:id" element={<QnADetail />} />
              <Route path="/contact" element={<Contact />} />

              {/* ── Guest-only routes ── */}
              <Route path="/membership" element={<Membership />} />
              <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

              {/* ── Protected routes ── */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* ── Admin routes ── */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <UserManagement />
                  </AdminRoute>
                }
              />

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
