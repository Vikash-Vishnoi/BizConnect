/**
 * 🎯 Custom Hook for Template Form Management
 * Extracts shared logic from CreateTemplate and EditTemplate
 */

import { useState, useEffect } from 'react';

/**
 * Build WhatsApp components from form data
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
 * Extract variables from body text
 */
export const extractVariables = (bodyText) => {
  const regex = /\{\{(\d+)\}\}/g;
  const matches = [...bodyText.matchAll(regex)];
  const uniqueVars = [...new Set(matches.map(m => parseInt(m[1])))].sort();
  return uniqueVars.map(num => ({ 
    index: num, 
    name: `Variable ${num}`,
    example: '' 
  }));
};

/**
 * Custom hook for template form management
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

  const addButton = (type, toast) => {
    if (formData.buttons.length >= 3) {
      const errorMsg = 'Maximum 3 buttons allowed';
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
