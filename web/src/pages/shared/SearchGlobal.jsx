import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import { API_BASE_URL } from '../../config/api';
import './SearchGlobal.css';

const SearchGlobal = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [results, setResults] = useState({
    contacts: [],
    messages: [],
    campaigns: []
  });
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchTypes = [
    { value: 'all', label: 'All', icon: '🔍' },
    { value: 'contacts', label: 'Contacts', icon: '👤' },
    { value: 'messages', label: 'Messages', icon: '' },
    { value: 'campaigns', label: 'Campaigns', icon: '' }
  ];

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        query: searchTerm,
        type: searchType
      });

      const response = await fetch(`${API_BASE_URL}/contacts/search?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setResults({
          contacts: data.contacts || [],
          messages: data.messages || [],
          campaigns: data.campaigns || []
        });
      }
    } catch (error) {
      console.error('Failed to perform search:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalResults = () => {
    return results.contacts.length + results.messages.length + results.campaigns.length;
  };

  const highlightText = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={i}>{part}</mark> : part
    );
  };

  return (
    <>
      <Navbar />
      <div className="search-global-container">
        <div className="search-global-header">
          <h1>🔍 Global Search</h1>
          <p>Search across contacts, messages, and campaigns</p>
        </div>

        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="Search contacts, campaigns, templates, or messages"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            <button type="submit" className="search-btn" disabled={loading}>
              {loading ? '⏳' : '🔍'} Search
            </button>
          </div>

          <div className="search-filters">
            {searchTypes.map(type => (
              <button
                key={type.value}
                type="button"
                className={`filter-btn ${searchType === type.value ? 'active' : ''}`}
                onClick={() => setSearchType(type.value)}
              >
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </form>

        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Searching...</p>
          </div>
        )}

        {!loading && hasSearched && (
          <div className="results-container">
            {getTotalResults() === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>No results found</h3>
                <p>Try different keywords or search filters</p>
              </div>
            ) : (
              <>
                <div className="results-summary">
                  <h2>Found {getTotalResults()} results for "{searchTerm}"</h2>
                </div>

                {(searchType === 'all' || searchType === 'contacts') && results.contacts.length > 0 && (
                  <div className="results-section">
                    <h3 className="section-title">
                      <span>👤 Contacts</span>
                      <span className="count-badge">{results.contacts.length}</span>
                    </h3>
                    <div className="results-grid">
                      {results.contacts.map((contact) => (
                        <div key={contact._id} className="result-card contact-card">
                          <div className="contact-avatar">
                            {contact.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="contact-info">
                            <h4>{highlightText(contact.name || 'Unknown', searchTerm)}</h4>
                            <p className="phone">{contact.phone}</p>
                            {contact.email && (
                              <p className="email">{highlightText(contact.email, searchTerm)}</p>
                            )}
                            {contact.tags && contact.tags.length > 0 && (
                              <div className="tags">
                                {contact.tags.map((tag, i) => (
                                  <span key={i} className="tag">🏷️ {tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(searchType === 'all' || searchType === 'messages') && results.messages.length > 0 && (
                  <div className="results-section">
                    <h3 className="section-title">
                      <span>Messages</span>
                      <span className="count-badge">{results.messages.length}</span>
                    </h3>
                    <div className="messages-list">
                      {results.messages.map((message) => (
                        <div key={message._id} className="result-card message-card">
                          <div className="message-header">
                            <span className="contact-name">{message.contact?.name || message.from}</span>
                            <span className="message-date">
                              {new Date(message.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="message-content">
                            {highlightText(message.content || message.text || '', searchTerm)}
                          </p>
                          <div className="message-meta">
                            <span className={`status ${message.status}`}>{message.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(searchType === 'all' || searchType === 'campaigns') && results.campaigns.length > 0 && (
                  <div className="results-section">
                    <h3 className="section-title">
                      <span>Campaigns</span>
                      <span className="count-badge">{results.campaigns.length}</span>
                    </h3>
                    <div className="campaigns-list">
                      {results.campaigns.map((campaign) => (
                        <div key={campaign._id} className="result-card campaign-card">
                          <div className="campaign-header">
                            <h4>{highlightText(campaign.name, searchTerm)}</h4>
                            <span className={`status-badge ${campaign.status}`}>
                              {campaign.status}
                            </span>
                          </div>
                          <p className="campaign-description">
                            {highlightText(campaign.description || '', searchTerm)}
                          </p>
                          <div className="campaign-stats">
                            <span className="stat">📤 {campaign.totalSent || 0} sent</span>
                            <span className="stat">{campaign.totalDelivered || 0} delivered</span>
                            <span className="stat">{campaign.totalRead || 0} read</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!hasSearched && !loading && (
          <div className="search-tips">
            <h3>💡 Search Tips</h3>
            <ul>
              <li>Use specific keywords for better results</li>
              <li>Filter by type to narrow down your search</li>
              <li>Search by phone numbers, names, or email addresses</li>
              <li>Try searching for campaign names or message content</li>
            </ul>
          </div>
        )}
      </div>
    </>
  );
};

export default SearchGlobal;



