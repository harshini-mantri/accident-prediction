import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Form, Button } from 'react-bootstrap';
import MapView from './MapView';
import StatusPanel from './StatusPanel';

const Dashboard = ({ currentSpeed }) => {
  const [voiceAlerts, setVoiceAlerts] = useState(true);
  const [stationNotifications, setStationNotifications] = useState(true);
  const [alertVolume, setAlertVolume] = useState(50);
  const [notificationRadius, setNotificationRadius] = useState(10);
  const sliderRef = useRef(null);

  // Update slider background
  useEffect(() => {
    if (sliderRef.current) {
      const percentage = alertVolume;
      sliderRef.current.style.background = `linear-gradient(to right, #6b7280 ${percentage}%, #e5e7eb ${percentage}%)`;
    }
  }, [alertVolume]);

  const handleVolumeChange = (e) => {
    setAlertVolume(e.target.value);
  };

  const handleRadiusChange = (e) => {
    setNotificationRadius(parseInt(e.target.value, 10));
  };

  return (
    <section id="dashboard" className="my-5">
      <StatusPanel />

      {/* Vehicle Status Card */}
      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Vehicle Status</Card.Title>
          <div className="speed-display">
            <h2 className={currentSpeed >= 100 ? 'text-danger' : 'text-success'}>
              {currentSpeed} km/h
            </h2>
            <p>{currentSpeed >= 100 ? 'Speed Limit Exceeded!' : 'Normal Speed'}</p>
          </div>
        </Card.Body>
      </Card>

      {/* Map View */}
      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Live Map</Card.Title>
          <MapView notificationRadius={notificationRadius} />
        </Card.Body>
      </Card>

      {/* Alert & Notification Controls */}
      <Row className="g-4 mb-4">
        <Col md={3}>
          <Card className="h-100">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-3">Voice Alerts</h5>
              <div className="form-check form-switch mb-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="voiceAlertsSwitch"
                  checked={voiceAlerts}
                  onChange={() => setVoiceAlerts(!voiceAlerts)}
                  style={{ width: '3em', height: '1.5em' }}
                />
              </div>
              <div>
                <label className="form-label fw-medium text-secondary">Alert Volume</label>
                <div className="mt-2">
                  <input
                    ref={sliderRef}
                    type="range"
                    min="0"
                    max="100"
                    className="form-range w-100"
                    value={alertVolume}
                    onChange={handleVolumeChange}
                    style={{
                      height: '4px',
                      borderRadius: '2px',
                      outline: 'none',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      background: `linear-gradient(to right, #6b7280 ${alertVolume}%, #e5e7eb ${alertVolume}%)`
                    }}
                  />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="h-100">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-3">Station Notifications</h5>
              <div className="form-check form-switch mb-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="stationNotificationsSwitch"
                  checked={stationNotifications}
                  onChange={() => setStationNotifications(!stationNotifications)}
                  style={{ width: '3em', height: '1.5em' }}
                />
              </div>
              <div>
                <label className="form-label fw-medium text-secondary">Notification Radius</label>
                <Form.Select className="mt-2" value={notificationRadius} onChange={handleRadiusChange}>
                  <option value="5">5 km</option>
                  <option value="10">10 km</option>
                  <option value="15">15 km</option>
                  <option value="20">20 km</option>
                </Form.Select>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="h-100">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-3">Sensor Sensitivity</h5>
              <div className="mb-3 mt-5">
                <label className="form-label fw-medium text-secondary">Sensitivity Level</label>
                <Form.Select className="mt-2">
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </Form.Select>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="h-100">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-3">Emergency Contacts</h5>
              <div className="d-grid mt-5">
                <Button variant="primary" size="lg">
                  Manage Contacts
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* CSS for range input */}
      <style>
        {`
          input[type=range]::-webkit-slider-thumb {
            appearance: none;
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #9ca3af;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            margin-top: -7px;
          }

          input[type=range]::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #9ca3af;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          }

          input[type=range]:focus {
            outline: none;
          }

          input[type=range]::-webkit-slider-runnable-track {
            width: 100%;
            height: 4px;
            cursor: pointer;
            border-radius: 2px;
          }

          input[type=range]::-moz-range-track {
            width: 100%;
            height: 4px;
            cursor: pointer;
            border-radius: 2px;
          }
        `}
      </style>

      {/* Recent Alerts */}
      <div className="mt-4">
        <h5 className="fw-bold mb-4">Recent Alerts</h5>

        <div className="border-bottom py-3">
          <div className="d-flex align-items-center">
            <div
              className="bg-warning rounded-circle text-center me-3"
              style={{ width: '3rem', height: '3rem', lineHeight: '3rem' }}
            >
              !
            </div>
            <div>
              <h6 className="mb-1">Road Condition Warning</h6>
              <p className="mb-1">Slippery road detected ahead on Highway 101</p>
              <small className="text-muted">Today, 10:23 AM</small>
            </div>
          </div>
        </div>

        <div className="py-3">
          <div className="d-flex align-items-center">
            <div
              className="bg-danger rounded-circle text-center me-3"
              style={{ width: '3rem', height: '3rem', lineHeight: '3rem' }}
            >
            </div>
            <div>
              <h6 className="mb-1">Potential Collision Warning</h6>
              <p className="mb-1">Vehicle approaching rapidly from blind spot</p>
              <small className="text-muted">Today, 10:15 AM</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
