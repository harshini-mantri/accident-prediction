import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';


const featureData = [
  {
    icon: '🔍',
    title: 'AI-Powered Prediction',
    description:
      'Our advanced AI algorithms analyze driving conditions, vehicle data, and environmental factors to predict potential accident scenarios before they occur.'
  },
  {
    icon: '🔊',
    title: 'Voice Alert System',
    description:
      'Receive clear voice alerts about potential dangers, giving you time to react and avoid hazardous situations while keeping your focus on the road.'
  },
  {
    icon: '🚨',
    title: 'Emergency Station Notifications',
    description:
      'Automatically notify nearby emergency stations with your location and situation details if a high-risk scenario is detected.'
  },
  {
    icon: '📱',
    title: 'Mobile Integration',
    description:
      'Connect your mobile device to receive alerts and manage your safety settings even when you\'re away from your vehicle.'
  },
  {
    icon: '🔌',
    title: 'Easy Vehicle Integration',
    description:
      'Our system integrates with your vehicle\'s onboard computer and sensors for comprehensive monitoring and accident prevention.'
  },
  {
    icon: '📊',
    title: 'Safety Analytics',
    description:
      'Review your driving patterns, receive safety tips, and track improvements with detailed analytics and reporting.'
  }
];

function Features() {
  return (
    <Container id="features" className="my-5">
      <h2 className="text-center mb-4 text-primary">Key Features</h2>
      <Row>
        {featureData.map((feature, index) => (
          <Col md={4} key={index} className="mb-4">
            <Card className="h-100 shadow-sm">
              <Card.Body className="text-center">
                <div className="display-4 mb-3">{feature.icon}</div>
                <Card.Title className="text-primary">{feature.title}</Card.Title>
                <Card.Text>{feature.description}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}

export default Features;
