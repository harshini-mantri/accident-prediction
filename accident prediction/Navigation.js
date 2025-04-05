import React from 'react';
import { Navbar, Nav, Button, ButtonGroup } from 'react-bootstrap';

const Navigation = ({ 
  onContactClick, 
  onAlertDemoClick, 
  onEmergencyClick,
  onMapToggle,
  onFeaturesClick
}) => {
  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4 px-3">
      <Navbar.Brand href="#home">SafeAlert</Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      
      <Navbar.Collapse id="basic-navbar-nav" className="justify-content-between">
        <Nav className="me-auto">
          <Nav.Link href="#dashboard">Dashboard</Nav.Link>
          <Nav.Link href="#features" onClick={onFeaturesClick}>Features</Nav.Link>
          <Nav.Link href="#setup">Setup Guide</Nav.Link>
        </Nav>

        <ButtonGroup className="d-flex gap-2">
          <Button 
            variant="outline-light" 
            onClick={onContactClick}
            className="d-flex align-items-center"
          >
            <i className="fas fa-address-book me-2"></i>
            Contacts
          </Button>
          <Button 
            variant="outline-info" 
            onClick={onMapToggle}
            className="d-flex align-items-center"
          >
            <i className="fas fa-map me-2"></i>
            Map View
          </Button>
          <Button 
            variant="warning" 
            onClick={onAlertDemoClick}
            className="d-flex align-items-center"
          >
            <i className="fas fa-bell me-2"></i>
            Alert Demo
          </Button>
          <Button 
            variant="danger" 
            onClick={onEmergencyClick}
            className="d-flex align-items-center"
          >
            <i className="fas fa-ambulance me-2"></i>
            Emergency
          </Button>
        </ButtonGroup>
      </Navbar.Collapse>
    </Navbar>
  );
};

export default Navigation;
