/**
 * ✂️ Create Template Page Component
 * 
 * WhatsApp Business template creation interface with live preview.
 * Supports all template types: text, media headers, buttons, variables.
 * Includes auto-save functionality and form validation.
 * 
 * @component
 * @requires react-router-dom - Navigation
 * @requires Toast - Success/error notifications
 * @requires templateService - Template creation API
 * @requires useAutoSave - Auto-save form data hook
 * @requires useTemplateForm - Shared template form logic hook
 * 
 * @features
 * - Template creation wizard with sections
 * - Live WhatsApp message preview
 * - Auto-save to localStorage
 * - Header types: TEXT, IMAGE, VIDEO, DOCUMENT
 * - Button types: QUICK_REPLY, PHONE_NUMBER, URL
 * - Variable support with examples
 * - Form validation
 * - Save as draft functionality
 * - Category selection (MARKETING, UTILITY, AUTHENTICATION)
 * - Multi-language support
 * 
 * @state
 * - loading: Submission state
 * - formData: Template form fields (from useTemplateForm hook)
 * - variables: Dynamic variables array
 * - error: Validation/API error messages
 * 
 * @navigation
 * - /login: Redirects if no token
 * - /templates/:id: After successful creation
 * 
 * @hooks
 * - useTemplateForm: Shared template logic
 * - useAutoSave: Auto-save to localStorage
 * 
 * @todo Replace localStorage.getItem with STORAGE_KEYS
 * @todo Add image upload preview
 * @todo Add template duplication
 * 
 * @example
 * <Route path="/templates/create" element={<CreateTemplate />} />
 */

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import * as templateService from '../../services/templates/templateService';
import * as templateMediaService from '../../services/templates/templateMediaService';
import useAutoSave, { loadAutoSaved } from '../../hooks/useAutoSave';
import useTemplateForm from '../../hooks/useTemplateForm';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { MdInfo, MdWarning, MdDelete, MdUpload, MdImage, MdVideocam, MdInsertDriveFile, MdFolder } from 'react-icons/md';
import { COOKIE_KEYS } from '../../config/constants';
import { getCookie } from '../../utils/cookies';
import { handleApiError, logError } from '../../utils/errors';
import './CreateTemplate.css';

const CreateTemplate = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [headerMediaPublicId, setHeaderMediaPublicId] = useState('');
  const fileInputRef = useRef(null);
  
  // Load auto-saved data
  const initialData = loadAutoSaved('createTemplate', {
    name: '',
    category: 'UTILITY',
    language: 'en',
    headerType: 'NONE',
    headerText: '',
    bodyText: '',
    footerText: '',
    buttons: []
  });
  
  // Use shared template form hook
  const {
    formData,
    variables,
    error,
    setError,
    handleChange,
    addButton: addButtonToForm,
    updateButton,
    removeButton,
    validateForm,
    buildComponents
  } = useTemplateForm(initialData);
  
  // Auto-save form data
  const { clearSaved } = useAutoSave('createTemplate', formData);
  
  const addButton = (type) => {
    addButtonToForm(type, toast);
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size based on type
    const maxSize = formData.headerType === 'IMAGE' ? 5 * 1024 * 1024 : 
                    formData.headerType === 'VIDEO' ? 16 * 1024 * 1024 :
                    100 * 1024 * 1024; // DOCUMENT

    if (file.size > maxSize) {
      toast.error(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    setUploadingMedia(true);
    setUploadProgress(0);

    try {
      console.log('📤 Starting template media upload to Cloudinary...', { 
        filename: file.name, 
        size: file.size, 
        type: file.type,
        headerType: formData.headerType 
      });

      const uploadData = await templateMediaService.uploadTemplateMedia(
        file,
        formData.headerType,
        (progress) => {
          setUploadProgress(progress);
          console.log(`⏳ Upload progress: ${progress}%`);
        }
      );

      console.log('✅ Cloudinary upload successful:', uploadData);

      // Validate upload response
      if (!uploadData?.media?.url) {
        throw new Error('Invalid upload response: missing media URL');
      }

      setHeaderMediaUrl(uploadData.media.url);
      setHeaderMediaPublicId(uploadData.media.publicId);
      toast.success(`✅ ${formData.headerType.toLowerCase()} uploaded successfully`);
    } catch (err) {
      console.error('❌ Template media upload error:', {
        message: err.message,
        response: err.response?.data,
        stack: err.stack
      });

      let errorMsg = 'Failed to upload media';
      if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message) {
        errorMsg = err.message;
      }

      toast.error(errorMsg);
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveMedia = async () => {
    if (!headerMediaPublicId) {
      setHeaderMediaUrl('');
      return;
    }

    try {
      const resourceType = formData.headerType === 'IMAGE' ? 'image' : 
                          formData.headerType === 'VIDEO' ? 'video' : 'raw';
      await templateMediaService.deleteTemplateMedia(headerMediaPublicId, resourceType);
      setHeaderMediaUrl('');
      setHeaderMediaPublicId('');
      toast.success('Media removed');
    } catch (err) {
      console.error('Error removing media:', err);
      toast.error('Failed to remove media');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const token = getCookie(COOKIE_KEYS.TOKEN);
    if (!token) {
      navigate('/login');
      return;
    }

    // Validate using shared function
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      setLoading(false);
      return;
    }

    try {
      // Build components
      const components = buildComponents();
      
      // If there's a media header, add the URL to the header component
      if (headerMediaUrl && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(formData.headerType)) {
        console.log('📎 Adding Cloudinary URL to template header:', {
          headerType: formData.headerType,
          mediaUrl: headerMediaUrl,
          publicId: headerMediaPublicId
        });

        const headerComponent = components.find(c => c.type === 'HEADER');
        if (headerComponent) {
          headerComponent.example = {
            header_handle: [headerMediaUrl]
          };
        }
      }

      const templateData = {
        name: formData.name,
        category: formData.category,
        language: formData.language,
        components: components,
        variables: variables.map(v => ({ name: v.name, example: v.example })),
        status: 'pending'
      };

      console.log('📨 Submitting template with data:', templateData);

      const data = await templateService.createTemplate(templateData);
      
      clearSaved();
      toast.success('🎉 Template created successfully! Awaiting WhatsApp approval.');
      navigate(`/templates/${data._id}`);
    } catch (err) {
      logError('Error creating template', err);
      const errorMsg = handleApiError(err, 'Failed to create template');
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsDraft = async () => {
    setError('');
    setLoading(true);

    const token = getCookie(COOKIE_KEYS.TOKEN);
    if (!token) {
      navigate('/login');
      return;
    }

    // Validate using shared function
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      setLoading(false);
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

      const data = await templateService.saveDraft(templateData);
      
      clearSaved();
      toast.success('💾 Template saved as draft successfully!');
      navigate(`/templates/${data._id}`);
    } catch (err) {
      logError('Error saving draft', err);
      const errorMsg = handleApiError(err, 'Failed to save template as draft');
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
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

  return (
    <div className="create-template-page">
      <Navbar />
      
      <div className="create-template-container">
        <div className="page-header">
          <h1>Create New Template</h1>
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
                    required
                  />
                  <small>Use lowercase letters, numbers, and underscores only</small>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="category">Category *</label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className="form-select"
                      required
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
                      required
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

                {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(formData.headerType) && (
                  <div className="form-group">
                    <label>{formData.headerType} Upload</label>
                    
                    {!headerMediaUrl && (
                      <div className="media-upload-section">
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleMediaUpload}
                          accept={
                            formData.headerType === 'IMAGE' ? 'image/jpeg,image/png' :
                            formData.headerType === 'VIDEO' ? 'video/mp4,video/3gpp' :
                            'application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx'
                          }
                          style={{ display: 'none' }}
                        />
                        <Button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingMedia}
                        >
                          <MdUpload /> {uploadingMedia ? 'Uploading...' : `Upload ${formData.headerType}`}
                        </Button>
                        
                        {uploadingMedia && (
                          <div className="upload-progress">
                            <div className="progress-bar">
                              <div 
                                className="progress-fill" 
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                            <small>{uploadProgress}%</small>
                          </div>
                        )}
                      </div>
                    )}

                    {headerMediaUrl && (
                      <div className="media-preview">
                        {formData.headerType === 'IMAGE' && (
                          <img src={headerMediaUrl} alt="Header preview" className="preview-image" />
                        )}
                        {formData.headerType === 'VIDEO' && (
                          <video src={headerMediaUrl} controls className="preview-video" />
                        )}
                        {formData.headerType === 'DOCUMENT' && (
                          <div className="document-preview">
                            <span>📄 Document uploaded</span>
                            <a href={headerMediaUrl} target="_blank" rel="noopener noreferrer">View</a>
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="danger"
                          size="small"
                          onClick={handleRemoveMedia}
                        >
                          <MdDelete /> Remove
                        </Button>
                      </div>
                    )}

                    <small>
                      {formData.headerType === 'IMAGE' && 'Max 5MB. Supported: JPEG, PNG'}
                      {formData.headerType === 'VIDEO' && 'Max 16MB. Supported: MP4, 3GPP'}
                      {formData.headerType === 'DOCUMENT' && 'Max 100MB. Supported: PDF, DOC, PPT, XLS'}
                    </small>
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
                    onClick={() => navigate('/templates')}
                    variant="secondary"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveAsDraft}
                    variant="secondary"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : '💾 Save as Draft'}
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Template'}
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

export default CreateTemplate;



