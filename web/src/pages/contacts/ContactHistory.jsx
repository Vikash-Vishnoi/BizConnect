import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import * as contactService from '../../services/contacts/contactService';
import Navbar from '../../components/Navbar';
import { MdHistory, MdSearch, MdPerson, MdMessage, MdCall, MdEmail, MdEvent } from 'react-icons/md';
import './ContactHistory.css';

const ContactHistory = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (user?.businessId) {
      fetchContacts();
    }
  }, [user?.businessId]);

  const fetchContacts = async () => {
    try {
      setContactsLoading(true);
      const data = await contactService.getContacts();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setContactsLoading(false);
    }
  };

  const fetchContactHistory = async (contactId) => {
    setLoading(true);
    try {
      const data = await contactService.getContactHistory(contactId);
      setHistory(data.history || []);
    } catch (error) {
      console.error('Failed to fetch contact history:', error);
      toast.error('Failed to load contact history');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType) => {
    switch (actionType?.toLowerCase()) {
      case 'message': return <MdMessage style={{ color: '#10b981' }} />;
      case 'call': return <MdCall style={{ color: '#3b82f6' }} />;
      case 'email': return <MdEmail style={{ color: '#8b5cf6' }} />;
      case 'event': return <MdEvent style={{ color: '#f59e0b' }} />;
      default: return <MdHistory />;
    }
  };

  const handleSelectContact = (contact) => {
    setSelectedContact(contact);
    fetchContactHistory(contact._id);
  };

  const filteredContacts = contacts.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phoneNumber?.includes(searchTerm)
  );

  if (!user?.businessId) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <BusinessSetupRequired
            title="Business Setup Required"
            message="Please complete your business setup to view contact history."
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="contact-history-container">
        <div className="contact-history-header">
          <h1><MdHistory style={{ verticalAlign: 'middle' }} /> Contact History</h1>
          <p>View detailed interaction history for your contacts</p>
        </div>

        <div className="contact-history-layout">
          <div className="contacts-sidebar">
            <div className="search-box" style={{ position: 'relative' }}>
              <MdSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
            </div>
            <div className="contacts-list">
              {contactsLoading ? (
                <LoadingSkeleton type="list" />
              ) : filteredContacts.length === 0 ? (
                <div className="empty-state-small">
                  <p>No contacts found</p>
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <div
                    key={contact._id}
                    className={`contact-item ${selectedContact?._id === contact._id ? 'active' : ''}`}
                    onClick={() => handleSelectContact(contact)}
                  >
                    <div className="contact-avatar">
                      <MdPerson />
                    </div>
                    <div className="contact-info">
                      <div className="contact-name">{contact.name || 'Unknown'}</div>
                      <div className="contact-phone">{contact.phoneNumber}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="history-content">
            {!selectedContact ? (
              <div className="empty-state">
                <div className="empty-icon">📇</div>
                <h3>Select a Contact</h3>
                <p>Choose a contact from the list to view their history</p>
              </div>
            ) : loading ? (
              <LoadingSkeleton type="list" />
            ) : history.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>No History Found</h3>
                <p>No interaction history available for this contact</p>
              </div>
            ) : (
              <div className="history-timeline">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2>History for {selectedContact.name || selectedContact.phoneNumber}</h2>
                  <select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  >
                    <option value="all">All Actions</option>
                    <option value="message">Messages</option>
                    <option value="call">Calls</option>
                    <option value="email">Emails</option>
                    <option value="event">Events</option>
                  </select>
                </div>
                {history
                  .filter(item => filterType === 'all' || item.action?.toLowerCase() === filterType)
                  .map((item, index) => (
                  <div key={index} className="timeline-item">
                    <div className="timeline-marker">
                      {getActionIcon(item.action)}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-action" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {getActionIcon(item.action)}
                          {item.action}
                        </span>
                        <span className="timeline-date">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="timeline-details">{item.details}</div>
                      {item.metadata && (
                        <div className="timeline-metadata">
                          {Object.entries(item.metadata).map(([key, value]) => (
                            <span key={key} className="metadata-tag">
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactHistory;





