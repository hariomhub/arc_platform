import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import About from './pages/About';
import Framework from './pages/Framework';
import Assessment from './pages/Assessment';
import Services from './pages/Services';
import Resources from './pages/Resources';
import Certifications from './pages/Certifications';
import Membership from './pages/Membership';
import Contact from './pages/Contact';
import RiskDomain from './pages/RiskDomain';

function App() {
  const { pathname } = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/risk-domains/:id" element={<RiskDomain />} />
          <Route path="/about" element={<About />} />
          <Route path="/framework" element={<Framework />} />
          <Route path="/assessment" element={<Assessment />} />
          <Route path="/services" element={<Services />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/certifications" element={<Certifications />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
