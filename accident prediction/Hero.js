import React from 'react';
import { Container, Button } from 'react-bootstrap';

function Hero() {
  return (
    <div 
      className="text-white text-center py-5 mb-4 mt-5"  // Added mt-5 for spacing
      style={{
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url("https://via.placeholder.com/1200x600")',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <Container>
        <h1 className="display-4 fw-bold mb-4">Predict. Alert. Prevent.</h1>
        <p className="lead mb-4">
          SafeAlert uses advanced AI and sensor technology to predict potential accidents 
          before they happen, providing voice alerts to drivers and emergency notifications 
          to nearby stations.
        </p>
        <Button 
          variant="primary" 
          size="lg" 
          href="#setup-guide"
        >
          Get Started
        </Button>
      </Container>
    </div>
  );
}

export default Hero;