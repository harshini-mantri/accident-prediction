import React, { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import Dashboard from './components/Dashboard';
import SetupGuide from './components/SetupGuide';
import Footer from './components/Footer';
import CollisionWarningModal from './components/CollisionWarningModal';
import EmergencyServicesModal from './components/EmergencyServicesModal';
import ContactModal from './components/ContactModal';
import MapView from './components/MapView';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Features from './components/Features';


function App() {
  const [showCollisionModal, setShowCollisionModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(90);

  useEffect(() => {
    const interval = setInterval(() => {
      const newSpeed = Math.floor(Math.random() * 41) + 80;
      setCurrentSpeed(newSpeed);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentSpeed >= 100 && !showCollisionModal) {
      setShowCollisionModal(true);
      speakAlert();
    } else if (currentSpeed < 100 && showCollisionModal) {
      setShowCollisionModal(false);
    }
  }, [currentSpeed, showCollisionModal]);

  const speakAlert = () => {
    const msg = new SpeechSynthesisUtterance("Warning! Your speed is too high. Please slow down.");
    msg.rate = 1;
    msg.pitch = 1.2;
    msg.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    msg.voice = voices.find(voice => voice.name.includes("Female") || voice.name.includes("Google") || voice.name.includes("Microsoft"));
    window.speechSynthesis.speak(msg);
  };

  const handleAlertDemoClick = () => {
    setCurrentSpeed(110);
    setShowCollisionModal(true);
    speakAlert();
  };

  const handleEmergencyFromCollision = () => {
    setShowCollisionModal(false);
    setShowEmergencyModal(true);
  };

  return (
    <div className="app-container">
      <Header />
      <Navigation
        onAlertDemoClick={handleAlertDemoClick}
        onEmergencyClick={() => setShowEmergencyModal(true)}
        onContactClick={() => setShowContactModal(true)}
        onMapToggle={() => setShowMapView(!showMapView)}
        onFeaturesClick={() => setShowFeatures(!showFeatures)}
      />

      {showMapView ? (
        <MapView onEmergencyClick={() => setShowEmergencyModal(true)} />
      ) : (
        <Container fluid="md">
          <Hero />
          <Dashboard currentSpeed={currentSpeed} />
          {showFeatures && <Features />}
          <SetupGuide />
        </Container>
      )}

      <CollisionWarningModal
        show={showCollisionModal}
        onHide={() => setShowCollisionModal(false)}
        onEmergency={handleEmergencyFromCollision}
        speed={currentSpeed}
      />

      <EmergencyServicesModal
        show={showEmergencyModal}
        onHide={() => setShowEmergencyModal(false)}
      />

      <ContactModal
        show={showContactModal}
        onHide={() => setShowContactModal(false)}
      />

      <Footer />
    </div>
  );
}

export default App;
