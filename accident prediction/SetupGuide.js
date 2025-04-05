import React from 'react';
import { Container, Row, Col, Card, ListGroup } from 'react-bootstrap';


function SetupGuide() {
  const setupSteps = [
    {
      title: 'Install SafeAlert Device',
      description: "Connect the device to your vehicle's OBD-II port under the dashboard."
    },
    {
      title: 'Download Mobile App',
      description: 'Get the SafeAlert app from App Store or Google Play Store.'
    },
    {
      title: 'Create Account',
      description: 'Sign up with your email and create a secure password.'
    },
    {
      title: 'Pair Device',
      description: 'Follow in-app instructions to pair your SafeAlert device.'
    },
    {
      title: 'Configure Settings',
      description: 'Set up alert preferences and emergency contacts.'
    }
  ];

  const systemRequirements = [
    {
      title: 'Vehicle Compatibility',
      description: 'Works with vehicles manufactured after 2005 with OBD-II port.'
    },
    {
      title: 'Mobile Device',
      description: 'iOS 12+ or Android 8.0+ smartphone with Bluetooth.'
    },
    {
      title: 'Internet Connection',
      description: 'Cellular data or Wi-Fi for cloud-based features.'
    },
    {
      title: 'Audio Output',
      description: 'Vehicle speakers or Bluetooth for voice alerts.'
    }
  ];

  return (
    <Container id="setup-guide" className="my-5">
      <h2 className="text-center mb-4 text-primary">Setup Guide</h2>
      <Row>
        {/* Getting Started Card */}
        <Col md={6}>
          <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-primary text-white">Getting Started</Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                {setupSteps.map((step, index) => (
                  <ListGroup.Item key={index}>
                    <strong>Step {index + 1}: {step.title}</strong>
                    <p className="text-muted mb-0">{step.description}</p>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        {/* System Requirements Card */}
        <Col md={6}>
          <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-secondary text-white">System Requirements</Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                {systemRequirements.map((req, index) => (
                  <ListGroup.Item key={index}>
                    <strong>{req.title}</strong>
                    <p className="text-muted mb-0">{req.description}</p>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default SetupGuide;
