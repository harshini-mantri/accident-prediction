import React, { useState, useRef, useEffect } from 'react';
import Navigation from './Navigation';
import CollisionWarningModal from './CollisionWarningModal';

// Reusable speech detection hook
const useSpeechSynthesis = () => {
  const [isSupported, setIsSupported] = useState(false);
  useEffect(() => {
    setIsSupported('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window);
  }, []);
  return isSupported;
};

const SafetySystem = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const speedTimerRef = useRef(null);
  const speedExceededRef = useRef(false);
  const speechSupported = useSpeechSynthesis();

  // Optional welcome message
  useEffect(() => {
    const welcomeTimeout = setTimeout(() => {
      if (speechSupported) {
        const msg = new SpeechSynthesisUtterance("Welcome to SafeAlert. Drive safe and have a pleasant journey.");
        msg.rate = 1;
        msg.pitch = 1.2;
        msg.volume = 1;
        window.speechSynthesis.speak(msg);
      }
    }, 3000);

    return () => {
      clearTimeout(welcomeTimeout);
      window.speechSynthesis.cancel();
    };
  }, [speechSupported]);

  useEffect(() => {
    if (speedTimerRef.current) clearTimeout(speedTimerRef.current);

    if (currentSpeed >= 100 && !speedExceededRef.current) {
      speedExceededRef.current = true;
      speedTimerRef.current = setTimeout(() => setShowWarning(true), 5000);
    } else if (currentSpeed < 100) {
      speedExceededRef.current = false;
    }
  }, [currentSpeed]);

  const handleDismiss = () => setShowWarning(false);

  const handleEmergencyContact = () => {
    alert("Emergency services have been contacted!");
  };

  const handleAlertDemoClick = () => {
    setShowWarning(true);
  };

  const handleContactClick = () => {
    alert("Opening contact modal...");
  };

  const handleMapToggle = () => {
    alert("Toggling map view...");
  };

  const handleFeaturesClick = () => {
    alert("Scrolling to features section...");
  };

  return (
    <>
      <Navigation
        onContactClick={handleContactClick}
        onAlertDemoClick={handleAlertDemoClick}
        onEmergencyClick={handleEmergencyContact}
        onMapToggle={handleMapToggle}
        onFeaturesClick={handleFeaturesClick}
      />

      <CollisionWarningModal
        show={showWarning}
        onHide={handleDismiss}
        onEmergency={handleEmergencyContact}
        speed={currentSpeed}
      />
    </>
  );
};

export default SafetySystem;
