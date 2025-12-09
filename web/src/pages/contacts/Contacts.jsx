import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import useAutoSave, { loadAutoSaved } from '../../hooks/useAutoSave';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ConfirmationModal from '../../components/ConfirmationModal';
import * as contactService from '../../services/contacts/contactService';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import { MdAdd, MdEdit, MdDelete, MdRefresh, MdSearch, MdUpload, MdDownload, MdCheckCircle, MdCancel, MdPerson } from 'react-icons/md';
import './Contacts.css';

const Contacts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState(null);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedContact, setSelectedContact] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  
  const [formData, setFormData] = useState(() => 
    loadAutoSaved('contactForm', {
      phoneNumber: '',
      name: '',
      email: '',
      tags: [],
      notes: ''
    })
  );
  
  // Auto-save form data when modal is open
  const { clearSaved } = useAutoSave('contactForm', formData, 500, showModal);

  useEffect(() => {
    if (user?.businessId) {
      fetchContacts();
    }
  }, [user?.businessId]);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchQuery, filterTag]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await contactService.getContacts();
      setContacts(data.contacts || []);
      
      // Extract all unique tags
      const tags = new Set();
      data.contacts.forEach(contact => {
        if (contact.tags && Array.isArray(contact.tags)) {
          contact.tags.forEach(tag => tags.add(tag));
        }
      });
      setAllTags(Array.from(tags));

    } catch (err) {
      console.error('Contacts fetch error:', err);
      const errorMsg = err.message || 'Failed to load contacts';
      setError(errorMsg);
      
      // Don't show toast for business setup errors
      if (!errorMsg.includes('business') && !errorMsg.includes('X-Business-ID')) {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const filterContacts = () => {
    let filtered = contacts;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(contact => 
        contact.name?.toLowerCase().includes(query) ||
        contact.phoneNumber?.includes(query) ||
        contact.email?.toLowerCase().includes(query)
      );
    }

    // Filter by tag
    if (filterTag && filterTag !== 'all') {
      filtered = filtered.filter(contact => 
        contact.tags && contact.tags.includes(filterTag)
      );
    }

    setFilteredContacts(filtered);
  };

  const handleAddContact = () => {
    setModalMode('add');
    setFormData({
      phoneNumber: '',
      name: '',
      email: '',
      tags: [],
      notes: ''
    });
    setShowModal(true);
  };

  const handleEditContact = (contact) => {
    setModalMode('edit');
    setSelectedContact(contact);
    setFormData({
      phoneNumber: contact.phoneNumber,
      name: contact.name || '',
      email: contact.email || '',
      tags: contact.tags || [],
      notes: contact.notes || ''
    });
    setShowModal(true);
  };

  const handleDeleteClick = (contactId) => {
    setDeletingContactId(contactId);
    setShowDeleteModal(true);
  };

  const handleDeleteContact = async () => {
    try {
      await contactService.deleteContact(deletingContactId);
      toast.success('Contact deleted successfully');
      setShowDeleteModal(false);
      setDeletingContactId(null);
      fetchContacts();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.message || 'Failed to delete contact');
      setShowDeleteModal(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (modalMode === 'add') {
        await contactService.createContact(formData);
        toast.success('🎉 Contact created successfully');
      } else {
        await contactService.updateContact(selectedContact._id, formData);
        toast.success('✅ Contact updated successfully');
      }

      clearSaved(); // Clear auto-saved data
      setShowModal(false);
      fetchContacts();
    } catch (err) {
      const errorMsg = err.message || 'Failed to save contact';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const rows = text.split('\n').filter(row => row.trim());
      
      if (rows.length < 2) {
        setError('CSV file is empty or invalid');
        return;
      }

      // Parse headers
      const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
      const phoneIndex = headers.findIndex(h => h.includes('phone') || h.includes('number'));
      const nameIndex = headers.findIndex(h => h.includes('name'));
      const emailIndex = headers.findIndex(h => h.includes('email'));

      if (phoneIndex === -1) {
        setError('CSV must have a phone number column');
        return;
      }

      // Parse contacts
      const importedContacts = [];
      for (let i = 1; i < rows.length; i++) {
        const values = rows[i].split(',').map(v => v.trim());
        if (values[phoneIndex]) {
          importedContacts.push({
            phoneNumber: values[phoneIndex],
            name: nameIndex !== -1 ? values[nameIndex] : '',
            email: emailIndex !== -1 ? values[emailIndex] : ''
          });
        }
      }

      // Upload to backend
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/contacts/bulk', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ contacts: importedContacts })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to import contacts');
        }

        fetchContacts();
        toast.success(`✅ Successfully imported ${data.imported} contacts`);
      } catch (err) {
        const errorMsg = err.message || 'Failed to import contacts';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    };

    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  };

  const handleExportCSV = () => {
    try {
      const csvRows = [];
      csvRows.push(['Phone Number', 'Name', 'Email', 'Tags', 'Notes']);
      
      filteredContacts.forEach(contact => {
        csvRows.push([
          contact.phoneNumber,
          contact.name || '',
          contact.email || '',
          contact.tags ? contact.tags.join(';') : '',
          contact.notes || ''
        ]);
      });

      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`✅ Exported ${filteredContacts.length} contacts`);
    } catch (err) {
      toast.error('Failed to export contacts');
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedContacts.length === 0) {
      toast.error('No contacts selected');
      return;
    }
    setShowBulkDeleteModal(true);
  };

  const handleBulkDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/contacts/bulk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contactIds: selectedContacts })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete contacts');
      }

      toast.success(`✅ Deleted ${selectedContacts.length} contacts`);
      setSelectedContacts([]);
      setShowBulkDeleteModal(false);
      fetchContacts();
    } catch (err) {
      toast.error(err.message || 'Failed to delete contacts');
      setShowBulkDeleteModal(false);
    }
  };

  const toggleSelectContact = (contactId) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c._id));
    }
  };

  if (!user?.businessId) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <BusinessSetupRequired
            title="Business Setup Required"
            message="Please complete your business setup to manage contacts."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Navbar />
      
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-text">
            <h1 className="page-title">Contacts</h1>
            <p className="page-subtitle">Manage your contact list and groups - {filteredContacts.length} contacts</p>
          </div>
          <div className="page-actions">
            <Button variant="outline" size="small" onClick={fetchContacts}>
              <MdRefresh /> Refresh
            </Button>
            <Button variant="outline" size="small" onClick={handleExportCSV}>
              <MdDownload /> Export CSV
            </Button>
            <label style={{ cursor: 'pointer', margin: 0 }}>
              <Button variant="outline" size="small" as="span">
                <MdUpload /> Import CSV
              </Button>
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                style={{ display: 'none' }}
              />
            </label>
            <Button size="small" onClick={handleAddContact}>
              <MdAdd /> Add Contact
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <Card className="stat-card" hoverable>
            <div className="stat-icon stat-icon-primary"><MdPerson /></div>
            <div className="stat-content">
              <p className="stat-label">Total Contacts</p>
              <h2 className="stat-value">{contacts.length}</h2>
            </div>
          </Card>

          <Card className="stat-card" hoverable>
            <div className="stat-icon stat-icon-success"><MdCheckCircle /></div>
            <div className="stat-content">
              <p className="stat-label">With Email</p>
              <h2 className="stat-value">{contacts.filter(c => c.email).length}</h2>
            </div>
          </Card>

          <Card className="stat-card" hoverable>
            <div className="stat-icon stat-icon-info"><MdPerson /></div>
            <div className="stat-content">
              <p className="stat-label">Tagged</p>
              <h2 className="stat-value">{contacts.filter(c => c.tags?.length > 0).length}</h2>
            </div>
          </Card>

          <Card className="stat-card" hoverable>
            <div className="stat-icon stat-icon-warning"><MdPerson /></div>
            <div className="stat-content">
              <p className="stat-label">Filtered</p>
              <h2 className="stat-value">{filteredContacts.length}</h2>
            </div>
          </Card>
        </div>

        {error && (error.includes('business') || error.includes('X-Business-ID')) ? (
          <BusinessSetupRequired 
            message="Please complete your business setup to manage contacts"
          />
        ) : error ? (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError('')}>Dismiss</button>
          </div>
        ) : null}

        <Card className="filters-section">
          <div className="filter-group">
            <Input
              type="text"
              placeholder="🔍 Search contacts by name, phone number, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
            <button
              className={`status-badge ${filterTag === 'all' ? 'status-badge-info' : 'status-badge-secondary'}`}
              onClick={() => setFilterTag('all')}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              All ({contacts.length})
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                className={`status-badge ${filterTag === tag ? 'status-badge-info' : 'status-badge-secondary'}`}
                onClick={() => setFilterTag(tag)}
                style={{ cursor: 'pointer', border: 'none' }}
              >
                {tag} ({contacts.filter(c => c.tags?.includes(tag)).length})
              </button>
            ))}
          </div>

          {selectedContacts.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', padding: '12px', background: 'var(--background)', borderRadius: '8px' }}>
              <span style={{ flex: 1, fontWeight: '500' }}>{selectedContacts.length} selected</span>
              <Button variant="danger" size="small" onClick={handleBulkDeleteClick}>
                <MdDelete /> Delete Selected
              </Button>
            </div>
          )}
        </Card>

        {loading ? (
          <LoadingSkeleton type="table" />
        ) : filteredContacts.length === 0 ? (
          <Card>
            <div className="empty-state">
              <div className="empty-state-icon">📇</div>
              <h3 className="empty-state-title">No contacts found</h3>
              <p className="empty-state-text">Start by adding your first contact or importing from CSV</p>
              <Button onClick={handleAddContact}><MdAdd /> Add Contact</Button>
            </div>
          </Card>
        ) : (
          <Card padding="none">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Contact</th>
                  <th>Phone Number</th>
                  <th>Email</th>
                  <th>Tags</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map(contact => (
                  <tr key={contact._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(contact._id)}
                        onChange={() => toggleSelectContact(contact._id)}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '50%', 
                          background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', 
                          color: 'white', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontWeight: '600',
                          fontSize: '16px'
                        }}>
                          {contact.name ? contact.name[0].toUpperCase() : '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                            {contact.name || 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{contact.phoneNumber}</td>
                    <td style={{ color: contact.email ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                      {contact.email || 'No email'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {contact.tags?.length > 0 ? (
                          contact.tags.map(tag => (
                            <span key={tag} className="status-badge status-badge-info" style={{ fontSize: '11px' }}>
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>-</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEditContact(contact)}
                          title="Edit"
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '6px',
                            cursor: 'pointer',
                            color: 'var(--primary)',
                            fontSize: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '4px',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                          <MdEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(contact._id)}
                          title="Delete"
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '6px',
                            cursor: 'pointer',
                            color: '#dc2626',
                            fontSize: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '4px',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                          <MdDelete />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* Add/Edit Contact Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === 'add' ? 'Add New Contact' : 'Edit Contact'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Phone Number *</label>
                <Input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="+1234567890"
                  required
                  disabled={modalMode === 'edit'}
                />
              </div>

              <div className="form-group">
                <label>Contact Name</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Customer's full name"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>

              <div className="form-group">
                <label>Tags (comma-separated)</label>
                <Input
                  type="text"
                  value={formData.tags.join(', ')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) 
                  })}
                  placeholder="customer, vip, lead"
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Internal notes (e.g., 'VIP customer', 'Prefers evening messages', purchase history)"
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {modalMode === 'add' ? 'Add Contact' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingContactId(null);
        }}
        onConfirm={handleDeleteContact}
        title="Delete Contact"
        message="Are you sure you want to delete this contact? This action cannot be undone."
        variant="danger"
        confirmText="Delete"
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        title="Delete Multiple Contacts"
        message={`Are you sure you want to delete ${selectedContacts.length} selected contacts? This action cannot be undone.`}
        variant="danger"
        confirmText={`Delete ${selectedContacts.length} Contacts`}
      />
    </div>
  );
};

export default Contacts;





