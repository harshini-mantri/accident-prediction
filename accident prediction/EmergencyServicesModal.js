import React, { useState } from 'react';
import { Modal, Button, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';

const EmergencyServicesModal = ({ show, onHide }) => {
  const [isCalling, setIsCalling] = useState(false);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);

  const callEmergencyService = async (serviceType) => {
    setIsCalling(true);
    setError(null);

    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;
      setLocation({ lat: latitude, lng: longitude });

      const emergencyData = {
        serviceType,
        coordinates: { latitude, longitude },
        timestamp: new Date().toISOString()
      };

      try {
        await axios.post('/api/emergency', emergencyData);
      } catch (apiError) {
        console.warn('Backend unavailable. Continuing without server.');
      }

      const phoneNumber = getEmergencyNumber(serviceType);
      initiateCall(phoneNumber, serviceType);

    } catch (err) {
      setError(`Failed to retrieve location: ${err.message}`);
    } finally {
      setIsCalling(false);
    }
  };

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const getEmergencyNumber = (serviceType) => {
    const numbers = {
      'Ambulance': '102',
      'Police': '100',
      'Fire': '101'
    };
    return numbers[serviceType] || '112';
  };

  const initiateCall = (number, serviceType) => {
    onHide(); // Close modal

    if (isMobileDevice()) {
      window.location.href = `tel:${number}`;
    } else {
      const proceed = window.confirm(
        `Can't make direct calls from desktop.\n\n` +
        `Service: ${serviceType}\nNumber: ${number}\n\n` +
        `Open WhatsApp to contact emergency services?`
      );

      if (proceed) {
        window.open(
          `https://wa.me/${number}?text=EMERGENCY_${serviceType}_NEEDED`,
          '_blank'
        );
      }
    }
  };

  const isMobileDevice = () => {
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton className="bg-danger text-white">
        <Modal.Title>🚨 EMERGENCY SERVICES</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        <h4>Select Emergency Service</h4>

        {error && (
          <Alert variant="danger" className="mt-3">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

        <div className="d-grid gap-3 mt-4">
          <Button
            variant="danger"
            size="lg"
            onClick={() => callEmergencyService('Ambulance')}
            disabled={isCalling}
          >
            {isCalling ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Connecting...
              </>
            ) : (
              <>
                <i className="fas fa-ambulance me-2"></i>
                Call Ambulance
              </>
            )}
          </Button>

          <Button
            variant="primary"
            size="lg"
            onClick={() => callEmergencyService('Police')}
            disabled={isCalling}
          >
            {isCalling ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Connecting...
              </>
            ) : (
              <>
                <i className="fas fa-shield-alt me-2"></i>
                Call Police
              </>
            )}
          </Button>

          <Button
            variant="warning"
            size="lg"
            onClick={() => callEmergencyService('Fire')}
            disabled={isCalling}
          >
            {isCalling ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Connecting...
              </>
            ) : (
              <>
                <i className="fas fa-fire-extinguisher me-2"></i>
                Call Fire Department
              </>
            )}
          </Button>
        </div>

        {location && (
          <div className="mt-3 text-muted small">
            <i className="fas fa-map-marker-alt me-1"></i>
            Location shared: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default EmergencyServicesModal;
