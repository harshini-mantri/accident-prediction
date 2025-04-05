import React from 'react';
import { Container } from 'react-bootstrap';

function Header() {
  return (
    <header className="bg-primary text-white text-center py-4">
      <Container>
        <h1 className="display-5 fw-bold">SafeAlert</h1>
        <p className="lead">Advanced Accident Prediction & Alert System</p>
      </Container>
    </header>
  );
}

export default Header;