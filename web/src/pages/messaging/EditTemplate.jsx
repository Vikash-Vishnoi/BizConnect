import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import * as templateService from '../../services/templates/templateService';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { MdInfo, MdWarning } from 'react-icons/md';
import { API_BASE_URL } from '../../config/api';
import './CreateTemplate.css';

const EditTemplate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category: 'UTILITY',
    language: 'en',
    headerType: 'NONE',
    headerText: '',
    bodyText: '',
    footerText: '',
    buttons: []
  });
  const [variables, setVariables] = useState([]);

  useEffect(() => {
    loadTemplate();
  }, [id]);

  useEffect(() => {
    // Extract variables from body text
    const regex = /\{\{(\d+)\}\}/g;
    const matches = [...formData.bodyText.matchAll(regex)];
    const uniqueVars = [...new Set(matches.map(m => parseInt(m[1])))].sort();
    setVariables(uniqueVars.map(num => ({ 
      index: num, 
      name: `Variable ${num}`,
      example: '' 
    })));
  }, [formData.bodyText]);

  const loadTemplate = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/templates/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to load template');
      }

      const data = await response.json();
      const template = data.template;

      // Parse template data into form structure
      const headerComponent = template.components?.find(c => c.type === 'HEADER');
      const bodyComponent = template.components?.find(c => c.type === 'BODY');
      const footerComponent = template.components?.find(c => c.type === 'FOOTER');
      const buttonsComponent = template.components?.find(c => c.type === 'BUTTONS');

      setFormData({
        name: template.name,
        category: template.category,
        language: template.language,
        headerType: headerComponent ? headerComponent.format : 'NONE',
        headerText: headerComponent?.text || '',
        bodyText: bodyComponent?.text || '',
        footerText: footerComponent?.text || '',
        buttons: buttonsComponent?.buttons || []
      });

      setLoading(false);
    } catch (err) {
      console.error('Error loading template:', err);
      toast.error('Failed to load template');
      navigate('/templates');
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addButton = (type) => {
    if (formData.buttons.length >= 3) {
      const errorMsg = 'Maximum 3 buttons allowed';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    const newButton = {
      type,
      text: '',
      ...(type === 'PHONE_NUMBER' && { phoneNumber: '' }),
      ...(type === 'URL' && { url: '' })
    };

    setFormData(prev => ({
      ...prev,
      buttons: [...prev.buttons, newButton]
    }));
  };

  const updateButton = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons.map((btn, i) => 
        i === index ? { ...btn, [field]: value } : btn
      )
    }));
  };

  const removeButton = (index) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index)
    }));
  };

  const buildComponents = () => {
    const components = [];

    // Header
    if (formData.headerType !== 'NONE') {
      if (formData.headerType === 'TEXT' && formData.headerText) {
        components.push({
          type: 'HEADER',
          format: 'TEXT',
          text: formData.headerText
        });
      } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(formData.headerType)) {
        components.push({
          type: 'HEADER',
          format: formData.headerType
        });
      }
    }

    // Body (required)
    components.push({
      type: 'BODY',
      text: formData.bodyText
    });

    // Footer
    if (formData.footerText.trim()) {
      components.push({
        type: 'FOOTER',
        text: formData.footerText
      });
    }

    // Buttons
    if (formData.buttons.length > 0) {
      components.push({
        type: 'BUTTONS',
        buttons: formData.buttons
      });
    }

    return components;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
      return;
    }

    // Validate
    if (!formData.name.trim()) {
      const errorMsg = 'Template name is required';
      setError(errorMsg);
      toast.error(errorMsg);
      setSaving(false);
      return;
    }

    if (!formData.bodyText.trim()) {
      const errorMsg = 'Template body is required';
      setError(errorMsg);
      toast.error(errorMsg);
      setSaving(false);
      return;
    }

    try {
      const templateData = {
        name: formData.name,
        category: formData.category,
        language: formData.language,
        components: buildComponents(),
        variables: variables.map(v => ({ name: v.name, example: v.example }))
      };

      await templateService.updateTemplate(id, templateData);
      
      toast.success('💾 Template updated successfully!');
      navigate(`/templates/${id}`);
    } catch (err) {
      console.error('Error updating template:', err);
      const errorMsg = err.response?.data?.message || 'Failed to update template';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const renderPreview = () => {
    return (
      <div className="whatsapp-preview">
        <div className="preview-message">
          {/* Header */}
          {formData.headerType === 'TEXT' && formData.headerText && (
            <div className="preview-header">
              <strong>{formData.headerText}</strong>
            </div>
          )}
          {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(formData.headerType) && (
            <div className="preview-header">
              <div className="preview-media-placeholder">
                {formData.headerType === 'IMAGE' && '🖼️ Image Header'}
                {formData.headerType === 'VIDEO' && '🎥 Video Header'}
                {formData.headerType === 'DOCUMENT' && '📄 Document Header'}
              </div>
            </div>
          )}

          {/* Body */}
          {formData.bodyText && (
            <div className="preview-body">
              {formData.bodyText}
            </div>
          )}

          {/* Footer */}
          {formData.footerText && (
            <div className="preview-footer">
              {formData.footerText}
            </div>
          )}

          {/* Buttons */}
          {formData.buttons.length > 0 && (
            <div className="preview-buttons">
              {formData.buttons.map((button, index) => (
                <div key={index} className="preview-button">
                  {button.type === 'PHONE_NUMBER' && '📞 '}
                  {button.type === 'URL' && '🔗 '}
                  {button.type === 'QUICK_REPLY' && '↩️ '}
                  {button.text || 'Button Text'}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="create-template-page">
        <Navbar />
        <div className="create-template-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading template...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-template-page">
      <Navbar />
      
      <div className="create-template-container">
        <div className="page-header">
          <h1>Edit Template</h1>
        </div>

        {error && (
          <Card className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError('')}>✕</button>
          </Card>
        )}

        <div className="create-content">
          {/* Form Section */}
          <div className="form-section">
            <Card className="form-card">
              <form onSubmit={handleSubmit}>
                {/* Basic Info */}
                <div className="form-section-title">
                  <h3>Basic Information</h3>
                </div>

                <div className="form-group">
                  <label htmlFor="name">Template Name *</label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g., welcome_message_v1"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    disabled
                  />
                  <small>Template name cannot be changed after creation</small>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="category">Category *</label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className="form-select"
                      disabled
                    >
                      <option value="MARKETING">Marketing</option>
                      <option value="UTILITY">Utility</option>
                      <option value="AUTHENTICATION">Authentication</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="language">Language *</label>
                    <select
                      id="language"
                      value={formData.language}
                      onChange={(e) => handleChange('language', e.target.value)}
                      className="form-select"
                      disabled
                    >
                      <option value="en">English</option>
                      <option value="en_US">English (US)</option>
                      <option value="hi">Hindi</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="pt_BR">Portuguese (BR)</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                </div>

                {/* Header */}
                <div className="form-section-title">
                  <h3>Header (Optional)</h3>
                </div>

                <div className="form-group">
                  <label htmlFor="headerType">Header Type</label>
                  <select
                    id="headerType"
                    value={formData.headerType}
                    onChange={(e) => handleChange('headerType', e.target.value)}
                    className="form-select"
                  >
                    <option value="NONE">No Header</option>
                    <option value="TEXT">Text</option>
                    <option value="IMAGE">Image</option>
                    <option value="VIDEO">Video</option>
                    <option value="DOCUMENT">Document</option>
                  </select>
                </div>

                {formData.headerType === 'TEXT' && (
                  <div className="form-group">
                    <label htmlFor="headerText">Header Text</label>
                    <Input
                      id="headerText"
                      type="text"
                      placeholder="Template header (e.g., 'Order Confirmation' or 'Special Offer')"
                      value={formData.headerText}
                      onChange={(e) => handleChange('headerText', e.target.value)}
                      maxLength={60}
                    />
                    <small>{formData.headerText.length}/60 characters</small>
                  </div>
                )}

                {/* Body */}
                <div className="form-section-title">
                  <h3>Message Body *</h3>
                </div>

                <div className="form-group">
                  <label htmlFor="bodyText">Body Text</label>
                  <textarea
                    id="bodyText"
                    className="form-textarea"
                    placeholder="Your message content. Use {{1}}, {{2}} for dynamic variables like customer name, order ID, etc."
                    value={formData.bodyText}
                    onChange={(e) => handleChange('bodyText', e.target.value)}
                    rows={6}
                    required
                  />
                  <small>{formData.bodyText.length}/1024 characters. Use {'{{1}}'}, {'{{2}}'} for variables.</small>
                </div>

                {variables.length > 0 && (
                  <div className="variables-section">
                    <h4>Variables Found: {variables.length}</h4>
                    <div className="variables-list">
                      {variables.map((v, index) => (
                        <div key={index} className="variable-item">
                          <code>{'{{' + v.index + '}}'}</code>
                          <span>Will be replaced with dynamic content</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="form-section-title">
                  <h3>Footer (Optional)</h3>
                </div>

                <div className="form-group">
                  <label htmlFor="footerText">Footer Text</label>
                  <Input
                    id="footerText"
                    type="text"
                    placeholder="e.g., Powered by Your Company"
                    value={formData.footerText}
                    onChange={(e) => handleChange('footerText', e.target.value)}
                    maxLength={60}
                  />
                  <small>{formData.footerText.length}/60 characters</small>
                </div>

                {/* Buttons */}
                <div className="form-section-title">
                  <h3>Call-to-Action Buttons (Optional)</h3>
                </div>

                {formData.buttons.map((button, index) => (
                  <Card key={index} className="button-card">
                    <div className="button-header">
                      <h4>Button {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeButton(index)}
                        className="remove-button"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="form-group">
                      <label>Button Type</label>
                      <select
                        value={button.type}
                        onChange={(e) => updateButton(index, 'type', e.target.value)}
                        className="form-select"
                      >
                        <option value="QUICK_REPLY">Quick Reply</option>
                        <option value="PHONE_NUMBER">Call Phone Number</option>
                        <option value="URL">Visit Website</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Button Text</label>
                      <Input
                        type="text"
                        placeholder="Button text"
                        value={button.text}
                        onChange={(e) => updateButton(index, 'text', e.target.value)}
                        maxLength={25}
                      />
                    </div>

                    {button.type === 'PHONE_NUMBER' && (
                      <div className="form-group">
                        <label>Phone Number</label>
                        <Input
                          type="tel"
                          placeholder="+91234567890"
                          value={button.phoneNumber}
                          onChange={(e) => updateButton(index, 'phoneNumber', e.target.value)}
                        />
                      </div>
                    )}

                    {button.type === 'URL' && (
                      <div className="form-group">
                        <label>URL</label>
                        <Input
                          type="url"
                          placeholder="https://example.com"
                          value={button.url}
                          onChange={(e) => updateButton(index, 'url', e.target.value)}
                        />
                      </div>
                    )}
                  </Card>
                ))}

                {formData.buttons.length < 3 && (
                  <div className="add-button-section">
                    <Button
                      type="button"
                      onClick={() => addButton('QUICK_REPLY')}
                      variant="secondary"
                    >
                      Add Button
                    </Button>
                  </div>
                )}

                {/* Submit */}
                <div className="form-actions">
                  <Button
                    type="button"
                    onClick={() => navigate(`/templates/${id}`)}
                    variant="secondary"
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Preview Section */}
          <div className="preview-section">
            <Card className="preview-card">
              <h3>Live Preview</h3>
              <p>See how your template will look on WhatsApp</p>
              {renderPreview()}
            </Card>

            <Card className="help-card">
              <h4>💡 Template Guidelines</h4>
              <ul>
                <li>Template names must be unique and lowercase</li>
                <li>Body text is required (max 1024 characters)</li>
                <li>Use {'{{1}}'}, {'{{2}}'} for dynamic variables</li>
                <li>Maximum 3 buttons allowed</li>
                <li>Templates must be approved by WhatsApp</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTemplate;


