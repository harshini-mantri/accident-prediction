import React, { useState } from 'react';
import { Modal, Button, Form, ListGroup } from 'react-bootstrap';

function ContactModal({ show, onHide }) {
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactType, setContactType] = useState('family');

  const [contacts, setContacts] = useState([
    { name: 'Emergency Services', phone: '911', type: 'Default' },
    { name: 'John Doe', phone: '(555) 987-6543', type: 'Family' }
  ]);

  const addContact = () => {
    if (contactName && contactPhone) {
      setContacts([
        ...contacts, 
        { name: contactName, phone: contactPhone, type: contactType }
      ]);
      setContactName('');
      setContactPhone('');
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Emergency Contacts</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Contact Name</Form.Label>
            <Form.Control 
              type="text" 
              placeholder="Enter contact name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Phone Number</Form.Label>
            <Form.Control 
              type="tel" 
              placeholder="Enter phone number"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Contact Type</Form.Label>
            <Form.Select 
              value={contactType}
              onChange={(e) => setContactType(e.target.value)}
            >
              <option value="family">Family</option>
              <option value="friend">Friend</option>
              <option value="emergency">Emergency Contact</option>
            </Form.Select>
          </Form.Group>
          <Button variant="primary" onClick={addContact}>
            Add Contact
          </Button>
        </Form>

        <h5 className="mt-4">Current Contacts</h5>
        <ListGroup>
          {contacts.map((contact, index) => (
            <ListGroup.Item key={index} className="d-flex justify-content-between">
              <div>
                <strong>{contact.name}</strong>
                <p className="text-muted mb-0">{contact.phone}</p>
              </div>
              <span className="badge bg-secondary">{contact.type}</span>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Modal.Body>
    </Modal>
  );
}

export default ContactModal;