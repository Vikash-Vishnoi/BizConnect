import api from './api';
import type {
  Template,
  CreateTemplatePayload,
  UpdateTemplatePayload,
  TemplateValidationResult,
  TemplateStats,
} from '../types/template';

export const templateService = {
  getTemplates: async (): Promise<Template[]> => {
    const response = await api.get<{ templates: Template[] }>('/templates');
    return Array.isArray(response.data) ? response.data : response.data.templates || [];
  },

  getTemplateById: async (id: string): Promise<Template> => {
    const response = await api.get<{ template: Template }>(`/templates/${id}`);
    return response.data.template || response.data as any;
  },

  createTemplate: async (payload: CreateTemplatePayload): Promise<Template> => {
    const response = await api.post<{ template: Template; message?: string }>('/templates', payload);
    return response.data.template || response.data as any;
  },

  updateTemplate: async (
    id: string,
    payload: UpdateTemplatePayload,
  ): Promise<Template> => {
    const response = await api.put<Template>(`/templates/${id}`, payload);
    return response.data;
  },

  // DELETE endpoint disabled - use status='archived' to archive templates
  // deleteTemplate: async (id: string): Promise<void> => {
  //   await api.delete(`/templates/${id}`);
  // },

  submitTemplate: async (id: string): Promise<Template> => {
    const response = await api.post<Template>(`/templates/${id}/submit`);
    return response.data;
  },

  checkTemplateStatus: async (id: string): Promise<Template> => {
    const response = await api.get<{ template: Template }>(`/templates/${id}/status`);
    return response.data.template || response.data as any;
  },

  getTemplateStats: async (): Promise<TemplateStats> => {
    const response = await api.get<TemplateStats>('/templates/stats');
    return response.data;
  },

  validateTemplate: (template: CreateTemplatePayload): TemplateValidationResult => {
    const errors: string[] = [];

    if (!template.name || template.name.trim() === '') {
      errors.push('Template name is required');
    } else if (!/^[a-z0-9_]+$/.test(template.name)) {
      errors.push('Template name must be lowercase and contain only letters, numbers, and underscores');
    }

    if (!template.components || template.components.length === 0) {
      errors.push('Template must have at least one component');
    }

    const hasBody = template.components.some(c => c.type === 'BODY');
    if (!hasBody) {
      errors.push('Template must have a BODY component');
    }

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

      if (component.buttons) {
        for (const button of component.buttons) {
          if (button.text.length > 20) {
            errors.push(`Button text "${button.text}" exceeds 20 characters`);
          }
        }
      }

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
