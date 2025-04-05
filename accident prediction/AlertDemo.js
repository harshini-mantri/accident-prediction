import React, { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import CollisionWarningModal from './CollisionWarningModal';


const AlertDemo = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);

  // ✅ Expose to window for debugging/demo use
  useEffect(() => {
    window.setCurrentSpeed = (speed) => {
      simulateSpeedChange(speed);
    };

    return () => {
      delete window.setCurrentSpeed;
    };
  }, []);

  const simulateSpeedChange = (speed) => {
    setCurrentSpeed(speed);
    if (speed >= 100) {
      setShowWarning(true);
    }
  };

  useEffect(() => {
    if (showWarning) setCurrentSpeed(100);
  }, [showWarning]);

  const handleEmergencyContact = () => {
    alert("Emergency services have been contacted!");
  };

  const handleDismiss = () => {
    setShowWarning(false);
    setTimeout(() => setCurrentSpeed(70), 500);
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <h5>Current Speed: {currentSpeed} km/h</h5>
        <div className="d-flex gap-2 mb-3">
          <Button size="sm" onClick={() => simulateSpeedChange(70)}>Set Speed 70</Button>
          <Button size="sm" onClick={() => simulateSpeedChange(90)}>Set Speed 90</Button>
          <Button size="sm" variant="warning" onClick={() => simulateSpeedChange(100)}>Set Speed 100</Button>
          <Button size="sm" variant="danger" onClick={() => simulateSpeedChange(120)}>Set Speed 120</Button>
        </div>
      </div>

      <Button variant="warning" onClick={() => setShowWarning(true)}>
        <i className="fas fa-bell me-2"></i>
        Alert Demo
      </Button>

      <CollisionWarningModal
        show={showWarning}
        onHide={handleDismiss}
        onEmergency={handleEmergencyContact}
        speed={currentSpeed}
      />
    </div>
  );
};

export default AlertDemo;
