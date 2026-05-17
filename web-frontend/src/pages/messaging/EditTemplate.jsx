/**
 * ✏️ Edit Template Page Component
 * 
 * WhatsApp Business template editing interface with live preview.
 * Allows modification of existing templates (draft or rejected only).
 * Approved templates cannot be edited per WhatsApp policy.
 * 
 * @component
 * @requires react-router-dom - Get template ID from URL params
 * @requires Toast - Success/error notifications
 * @requires templateService - Template CRUD APIs
 * @requires useTemplateForm - Shared template form logic hook
 * 
 * @features
 * - Load existing template data
 * - Edit template components (header, body, footer, buttons)
 * - Live WhatsApp message preview
 * - Form validation
 * - Update draft templates
 * - Submit for approval
 * - Template status awareness (draft/approved/rejected)
 * 
 * @state
 * - loading: Template load state
 * - saving: Form submission state
 * - templateStatus: Current template status
 * - formData: Template form fields (from useTemplateForm hook)
 * - variables: Dynamic variables array
 * - error: Validation/API error messages
 * 
 * @navigation
 * - /login: Redirects if no token
 * - /templates: Redirects on load failure
 * - /templates/:id: After successful update
 * 
 * @restrictions
 * - Approved templates cannot be edited (WhatsApp policy)
 * - Only draft and rejected templates are editable
 * 
 * @todo Replace localStorage.getItem with STORAGE_KEYS
 * @todo Add template version history
 * @todo Add template duplication feature
 * 
 * @example
 * <Route path="/templates/:id/edit" element={<EditTemplate />} />
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import * as templateService from '../../services/templates/templateService';
import useTemplateForm from '../../hooks/useTemplateForm';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { MdInfo, MdWarning, MdImage, MdVideocam, MdInsertDriveFile } from 'react-icons/md';
import { STORAGE_KEYS } from '../../config/constants';
import { handleApiError, logError } from '../../utils/errors';
import './CreateTemplate.css';

const EditTemplate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateStatus, setTemplateStatus] = useState('');
  
  // Use shared template form hook
  const {
    formData,
    setFormData,
    variables,
    error,
    setError,
    handleChange,
    addButton: addButtonToForm,
    updateButton,
    removeButton,
    validateForm,
    buildComponents
  } = useTemplateForm();
  
  const addButton = (type) => {
    addButtonToForm(type, toast);
  };

  useEffect(() => {
    loadTemplate();
  }, [id]);


  const loadTemplate = async () => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const data = await templateService.getTemplateById(id);
      // Handle nested response structure: { success: true, data: template }
      const template = data.data || data;
      
      // Store template status
      setTemplateStatus(template.status);

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
      logError('Error loading template', err);
      
      if (err.response?.status === 401) {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        navigate('/login');
        return;
      }
      
      const errorMsg = handleApiError(err, 'Failed to load template');
      toast.error(errorMsg);
      navigate('/templates');
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) {
      navigate('/login');
      return;
    }

    // Validate using shared function
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
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
      logError('Error updating template', err);
      const errorMsg = handleApiError(err, 'Failed to update template');
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    setError('');
    setSaving(true);

    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) {
      navigate('/login');
      return;
    }

    // Validate using shared function
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      setSaving(false);
      return;
    }

    try {
      const templateData = {
        name: formData.name,
        category: formData.category,
        language: formData.language,
        components: buildComponents(),
        variables: variables.map(v => ({ name: v.name, example: v.example })),
        status: 'pending'
      };

      await templateService.updateTemplate(id, templateData);
      
      toast.success('🚀 Template submitted for approval!');
      navigate(`/templates/${id}`);
    } catch (err) {
      logError('Error submitting template', err);
      const errorMsg = handleApiError(err, 'Failed to submit template');
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
                {formData.headerType === 'IMAGE' && <><MdImage /> Image Header</>}
                {formData.headerType === 'VIDEO' && <><MdVideocam /> Video Header</>}
                {formData.headerType === 'DOCUMENT' && <><MdInsertDriveFile /> Document Header</>}
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
          
          {/* Timestamp */}
          <div className="preview-timestamp">
            {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </div>
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
                      disabled={templateStatus !== 'draft' && templateStatus !== 'rejected'}
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
                      disabled={templateStatus !== 'draft' && templateStatus !== 'rejected'}
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
                  {(templateStatus === 'draft' || templateStatus === 'rejected') && (
                    <Button 
                      type="button"
                      onClick={handleSubmitForApproval} 
                      disabled={saving}
                      style={{ background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)' }}
                    >
                      {saving ? 'Submitting...' : '🚀 Submit for Approval'}
                    </Button>
                  )}
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


