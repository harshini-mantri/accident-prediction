import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark text-white py-5">
      <Container>
        <Row>
          <Col md={3}>
            <h5>SafeAlert</h5>
            <p>Pioneering technology to predict and prevent accidents.</p>
          </Col>
          <Col md={3}>
            <h5>Quick Links</h5>
            <ul className="list-unstyled">
              <li><a href="#dashboard" className="text-white">Dashboard</a></li>
              <li><a href="#features" className="text-white">Features</a></li>
              <li><a href="#setup-guide" className="text-white">Setup Guide</a></li>
            </ul>
          </Col>
          <Col md={3}>
            <h5>Support</h5>
            <ul className="list-unstyled">
              <li><a href="#" className="text-white">Help Center</a></li>
              <li><a href="#" className="text-white">FAQ</a></li>
              <li><a href="#" className="text-white">Contact Support</a></li>
            </ul>
          </Col>
          <Col md={3}>
            <h5>Contact</h5>
            <address>
              Email: info@safealert.com<br />
              Phone: (555) 123-4567<br />
              Address: 123 Safety Ave, Secure City
            </address>
          </Col>
        </Row>
        <hr />
        <div className="text-center">
          <p>&copy; {currentYear} SafeAlert. All Rights Reserved.</p>
        </div>
      </Container>
    </footer>
  );
}

export default Footer;