/**
 * Template Form Management Hook
 * 
 * @module hooks/useTemplateForm
 * @description Custom React hook for managing WhatsApp template creation and editing.
 * Handles form state, validation, variable extraction, and component building for WhatsApp templates.
 * Shared logic between CreateTemplate and EditTemplate pages.
 * 
 * @features
 * - Form state management for template fields
 * - Automatic variable extraction from body text ({{1}}, {{2}}, etc.)
 * - Button management (QUICK_REPLY, PHONE_NUMBER, URL)
 * - Template validation
 * - WhatsApp component building (HEADER, BODY, FOOTER, BUTTONS)
 * - Error handling and validation
 * 
 * @constants
 * - MAX_BUTTONS: Maximum 3 buttons per template (WhatsApp limit)
 * - VARIABLE_REGEX: Pattern for detecting {{N}} variables
 * 
 * @example
 * // In CreateTemplate or EditTemplate component
 * const {
 *   formData,
 *   variables,
 *   handleChange,
 *   addButton,
 *   validateForm,
 *   buildComponents
 * } = useTemplateForm({ name: 'Welcome', category: 'MARKETING' });
 * 
 * // Add button
 * addButton('QUICK_REPLY', toast);
 * 
 * // Validate before submit
 * const error = validateForm();
 * if (!error) {
 *   const components = buildComponents();
 *   await submitTemplate({ ...formData, components });
 * }
 */

import { useState, useEffect } from 'react';

/**
 * @constant {number} MAX_BUTTONS - Maximum buttons allowed per template (WhatsApp limit)
 */
const MAX_BUTTONS = 3;

/**
 * @constant {RegExp} VARIABLE_REGEX - Pattern for extracting variables like {{1}}, {{2}}
 */
const VARIABLE_REGEX = /\{\{(\d+)\}\}/g;

/**
 * Build WhatsApp components from form data
 * @param {Object} formData - Template form data
 * @returns {Array} WhatsApp template components (HEADER, BODY, FOOTER, BUTTONS)
 */
export const buildComponents = (formData) => {
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
  if (formData.bodyText && formData.bodyText.trim()) {
    components.push({
      type: 'BODY',
      text: formData.bodyText
    });
  }

  // Footer
  if (formData.footerText && formData.footerText.trim()) {
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

/**
 * Extract variables from template body text
 * @param {string} bodyText - Template body text with {{N}} variables
 * @returns {Array} Array of variable objects (index, name, example)
 * @example
 * extractVariables('Hello {{1}}, your order {{2}} is ready')
 * // Returns: [{ index: 1, name: 'Variable 1', example: '' }, { index: 2, name: 'Variable 2', example: '' }]
 */
export const extractVariables = (bodyText) => {
  const matches = [...bodyText.matchAll(VARIABLE_REGEX)];
  const uniqueVars = [...new Set(matches.map(m => parseInt(m[1])))].sort();
  return uniqueVars.map(num => ({ 
    index: num, 
    name: `Variable ${num}`,
    example: '' 
  }));
};

/**
 * Custom hook for WhatsApp template form management
 * @param {Object} initialData - Initial form data
 * @returns {Object} Form state and handlers
 * @property {Object} formData - Current form data
 * @property {Function} setFormData - Set form data
 * @property {Array} variables - Extracted variables from body text
 * @property {string} error - Current error message
 * @property {Function} setError - Set error message
 * @property {Function} handleChange - Handle field changes
 * @property {Function} addButton - Add button to template
 * @property {Function} updateButton - Update button properties
 * @property {Function} removeButton - Remove button
 * @property {Function} validateForm - Validate form data
 * @property {Function} buildComponents - Build WhatsApp components
 */
export const useTemplateForm = (initialData = {}) => {
  const [formData, setFormData] = useState({
    name: '',
    category: 'UTILITY',
    language: 'en',
    headerType: 'NONE',
    headerText: '',
    bodyText: '',
    footerText: '',
    buttons: [],
    ...initialData
  });
  
  const [variables, setVariables] = useState([]);
  const [error, setError] = useState('');

  // Extract variables when body text changes
  useEffect(() => {
    setVariables(extractVariables(formData.bodyText));
  }, [formData.bodyText]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  /**
   * Add button to template
   * @param {string} type - Button type (QUICK_REPLY, PHONE_NUMBER, URL)
   * @param {Object} toast - Toast notification object (optional)
   */
  const addButton = (type, toast) => {
    if (formData.buttons.length >= MAX_BUTTONS) {
      const errorMsg = `Maximum ${MAX_BUTTONS} buttons allowed`;
      setError(errorMsg);
      if (toast) toast.error(errorMsg);
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

  /**
   * Update button properties
   * @param {number} index - Button index
   * @param {string} field - Field to update (text, phoneNumber, url)
   * @param {string} value - New value
   */
  const updateButton = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons.map((btn, i) => 
        i === index ? { ...btn, [field]: value } : btn
      )
    }));
  };

  /**
   * Remove button from template
   * @param {number} index - Button index to remove
   */
  const removeButton = (index) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index)
    }));
  };

  /**
   * Validate template form data
   * @returns {string|null} Error message or null if valid
   */
  const validateForm = () => {
    if (!formData.name.trim()) {
      return 'Template name is required';
    }
    if (!formData.bodyText.trim()) {
      return 'Template body is required';
    }
    return null;
  };

  return {
    formData,
    setFormData,
    variables,
    error,
    setError,
    handleChange,
    addButton,
    updateButton,
    removeButton,
    validateForm,
    buildComponents: () => buildComponents(formData)
  };
};

export default useTemplateForm;
