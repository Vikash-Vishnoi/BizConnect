import api from './api';
import type {
  Template,
  CreateTemplatePayload,
  UpdateTemplatePayload,
  TemplateValidationResult,
  TemplateStats,
} from '../types/template';

// Template service with API integration
export const templateService = {
  // Get all templates
  getTemplates: async (): Promise<Template[]> => {
    const response = await api.get<{ templates: Template[] }>('/templates');
    // Backend might return { templates: [...] } or just [...]
    return Array.isArray(response.data) ? response.data : response.data.templates || [];
  },

  // Get template by ID
  getTemplateById: async (id: string): Promise<Template> => {
    const response = await api.get<{ template: Template }>(`/templates/${id}`);
    // Backend returns { template: {...} }
    return response.data.template || response.data as any;
  },

  // Create new template
  createTemplate: async (payload: CreateTemplatePayload): Promise<Template> => {
    const response = await api.post<{ template: Template; message?: string }>('/templates', payload);
    // Backend returns { template: {...}, message: '...' }
    return response.data.template || response.data as any;
  },

  // Update template
  updateTemplate: async (
    id: string,
    payload: UpdateTemplatePayload,
  ): Promise<Template> => {
    const response = await api.put<Template>(`/templates/${id}`, payload);
    return response.data;
  },

  // Delete template
  deleteTemplate: async (id: string): Promise<void> => {
    await api.delete(`/templates/${id}`);
  },

  // Submit template for approval
  submitTemplate: async (id: string): Promise<Template> => {
    const response = await api.post<Template>(`/templates/${id}/submit`);
    return response.data;
  },

  // Get template statistics
  getTemplateStats: async (): Promise<TemplateStats> => {
    const response = await api.get<TemplateStats>('/templates/stats');
    return response.data;
  },

  // Validate template against WhatsApp rules
  validateTemplate: (template: CreateTemplatePayload): TemplateValidationResult => {
    const errors: string[] = [];

    // Validate template name
    if (!template.name || template.name.trim() === '') {
      errors.push('Template name is required');
    } else if (!/^[a-z0-9_]+$/.test(template.name)) {
      errors.push('Template name must be lowercase and contain only letters, numbers, and underscores');
    }

    // Validate components
    if (!template.components || template.components.length === 0) {
      errors.push('Template must have at least one component');
    }

    // Check for BODY component (required)
    const hasBody = template.components.some(c => c.type === 'BODY');
    if (!hasBody) {
      errors.push('Template must have a BODY component');
    }

    // Validate component order
    const componentOrder = ['HEADER', 'BODY', 'FOOTER', 'BUTTONS'];
    let lastIndex = -1;
    for (const component of template.components) {
      const currentIndex = componentOrder.indexOf(component.type);
      if (currentIndex < lastIndex) {
        errors.push('Components must be in order: HEADER, BODY, FOOTER, BUTTONS');
        break;
      }
      lastIndex = currentIndex;
    }

    // Validate each component
    for (const component of template.components) {
      if (component.type === 'BODY' && !component.text) {
        errors.push('BODY component must have text');
      }

      if (component.type === 'HEADER') {
        if (!component.format) {
          errors.push('HEADER component must have a format');
        }
        if (component.format === 'TEXT' && !component.text) {
          errors.push('HEADER with TEXT format must have text');
        }
      }

      if (component.type === 'FOOTER' && !component.text) {
        errors.push('FOOTER component must have text');
      }

      if (component.type === 'BUTTONS') {
        if (!component.buttons || component.buttons.length === 0) {
          errors.push('BUTTONS component must have at least one button');
        }
        if (component.buttons && component.buttons.length > 3) {
          errors.push('BUTTONS component can have at most 3 buttons');
        }
      }

      // Validate button text length
      if (component.buttons) {
        for (const button of component.buttons) {
          if (button.text.length > 20) {
            errors.push(`Button text "${button.text}" exceeds 20 characters`);
          }
        }
      }

      // Validate text length
      if (component.text) {
        if (component.type === 'HEADER' && component.text.length > 60) {
          errors.push('HEADER text must not exceed 60 characters');
        }
        if (component.type === 'BODY' && component.text.length > 1024) {
          errors.push('BODY text must not exceed 1024 characters');
        }
        if (component.type === 'FOOTER' && component.text.length > 60) {
          errors.push('FOOTER text must not exceed 60 characters');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

export default templateService;
