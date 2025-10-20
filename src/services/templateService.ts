import api from './api';
import type {
  Template,
  CreateTemplatePayload,
  UpdateTemplatePayload,
  TemplateValidationResult,
  TemplateStats,
} from '../types/template';

// Dummy data for development
const dummyTemplates: Template[] = [
  {
    _id: 'tpl_001',
    name: 'health_reminder',
    category: 'UTILITY',
    status: 'approved',
    language: 'en',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Health Reminder',
      },
      {
        type: 'BODY',
        text: 'Hello {{1}}, your health check is due on {{2}}. Please visit our clinic at your earliest convenience.',
        example: {
          body_text: [['John', 'December 25, 2024']],
        },
      },
      {
        type: 'FOOTER',
        text: 'City Hospital - Your Health Partner',
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'QUICK_REPLY',
            text: 'Confirm',
          },
          {
            type: 'PHONE_NUMBER',
            text: 'Call Us',
            phoneNumber: '+1234567890',
          },
        ],
      },
    ],
    createdAt: '2024-10-15T10:30:00Z',
    updatedAt: '2024-10-15T10:30:00Z',
  },
  {
    _id: 'tpl_002',
    name: 'appointment_confirmation',
    category: 'UTILITY',
    status: 'approved',
    language: 'en',
    components: [
      {
        type: 'BODY',
        text: 'Your appointment with Dr. {{1}} is confirmed for {{2}} at {{3}}. Location: {{4}}',
        example: {
          body_text: [['Smith', 'December 20, 2024', '10:00 AM', 'Main Building, Room 205']],
        },
      },
      {
        type: 'FOOTER',
        text: 'Reply CANCEL to reschedule',
      },
    ],
    createdAt: '2024-10-14T09:00:00Z',
    updatedAt: '2024-10-14T09:00:00Z',
  },
  {
    _id: 'tpl_003',
    name: 'prescription_ready',
    category: 'UTILITY',
    status: 'approved',
    language: 'en',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '💊 Prescription Ready',
      },
      {
        type: 'BODY',
        text: 'Hi {{1}}, your prescription is ready for pickup at our pharmacy. Prescription ID: {{2}}',
        example: {
          body_text: [['Sarah', 'RX123456']],
        },
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'View Details',
            url: 'https://hospital.com/prescription/{{1}}',
            example: ['RX123456'],
          },
        ],
      },
    ],
    createdAt: '2024-10-13T14:20:00Z',
    updatedAt: '2024-10-13T14:20:00Z',
  },
  {
    _id: 'tpl_004',
    name: 'seasonal_checkup',
    category: 'MARKETING',
    status: 'pending',
    language: 'en',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        example: {
          header_handle: ['https://example.com/seasonal-checkup.jpg'],
        },
      },
      {
        type: 'BODY',
        text: 'Hello {{1}}! 🌟 Its time for your seasonal health checkup. Get 20% off on comprehensive health packages this month!',
        example: {
          body_text: [['valued patient']],
        },
      },
      {
        type: 'FOOTER',
        text: 'Offer valid until end of month',
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Book Now',
            url: 'https://hospital.com/book',
          },
          {
            type: 'PHONE_NUMBER',
            text: 'Call Now',
            phoneNumber: '+1234567890',
          },
        ],
      },
    ],
    createdAt: '2024-10-16T11:00:00Z',
    updatedAt: '2024-10-16T11:00:00Z',
  },
  {
    _id: 'tpl_005',
    name: 'test_results_available',
    category: 'UTILITY',
    status: 'draft',
    language: 'en',
    components: [
      {
        type: 'BODY',
        text: 'Dear {{1}}, your lab test results for {{2}} are now available. Please login to view your results.',
        example: {
          body_text: [['Patient', 'Blood Test']],
        },
      },
    ],
    createdAt: '2024-10-17T08:00:00Z',
    updatedAt: '2024-10-17T08:00:00Z',
  },
  {
    _id: 'tpl_006',
    name: 'vaccination_reminder',
    category: 'UTILITY',
    status: 'rejected',
    language: 'en',
    components: [
      {
        type: 'BODY',
        text: 'URGENT: {{1}}, you need to get vaccinated NOW!',
        example: {
          body_text: [['John']],
        },
      },
    ],
    createdAt: '2024-10-12T10:00:00Z',
    updatedAt: '2024-10-18T15:30:00Z',
    rejectionReason: 'Message content violates WhatsApp policies - overly promotional and uses caps lock.',
  },
];

// Template service with API integration
export const templateService = {
  // Get all templates
  getTemplates: async (): Promise<Template[]> => {
    try {
      const response = await api.get<Template[]>('/templates');
      return response.data;
    } catch (error) {
      console.warn('API call failed, using dummy data:', error);
      // Return dummy data if API fails
      return dummyTemplates;
    }
  },

  // Get template by ID
  getTemplateById: async (id: string): Promise<Template> => {
    try {
      const response = await api.get<Template>(`/templates/${id}`);
      return response.data;
    } catch (error) {
      console.warn('API call failed, using dummy data:', error);
      const template = dummyTemplates.find(t => t._id === id);
      if (!template) {
        throw new Error('Template not found');
      }
      return template;
    }
  },

  // Create new template
  createTemplate: async (payload: CreateTemplatePayload): Promise<Template> => {
    try {
      const response = await api.post<Template>('/templates', payload);
      return response.data;
    } catch (error: any) {
      console.warn('API call failed, using mock response:', error);
      // Return mock template
      const newTemplate: Template = {
        _id: `tpl_${Date.now()}`,
        ...payload,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return newTemplate;
    }
  },

  // Update template
  updateTemplate: async (
    id: string,
    payload: UpdateTemplatePayload,
  ): Promise<Template> => {
    try {
      const response = await api.put<Template>(`/templates/${id}`, payload);
      return response.data;
    } catch (error) {
      console.warn('API call failed, using mock response:', error);
      const template = dummyTemplates.find(t => t._id === id);
      if (!template) {
        throw new Error('Template not found');
      }
      return {
        ...template,
        ...payload,
        updatedAt: new Date().toISOString(),
      };
    }
  },

  // Delete template
  deleteTemplate: async (id: string): Promise<void> => {
    try {
      await api.delete(`/templates/${id}`);
    } catch (error) {
      console.warn('API call failed, using mock response:', error);
      // Mock success
    }
  },

  // Submit template for approval
  submitTemplate: async (id: string): Promise<Template> => {
    try {
      const response = await api.post<Template>(`/templates/${id}/submit`);
      return response.data;
    } catch (error) {
      console.warn('API call failed, using mock response:', error);
      const template = dummyTemplates.find(t => t._id === id);
      if (!template) {
        throw new Error('Template not found');
      }
      return {
        ...template,
        status: 'pending',
        updatedAt: new Date().toISOString(),
      };
    }
  },

  // Get template statistics
  getTemplateStats: async (): Promise<TemplateStats> => {
    try {
      const response = await api.get<TemplateStats>('/templates/stats');
      return response.data;
    } catch (error) {
      console.warn('API call failed, calculating from dummy data:', error);
      const stats: TemplateStats = {
        total: dummyTemplates.length,
        draft: dummyTemplates.filter(t => t.status === 'draft').length,
        pending: dummyTemplates.filter(t => t.status === 'pending').length,
        approved: dummyTemplates.filter(t => t.status === 'approved').length,
        rejected: dummyTemplates.filter(t => t.status === 'rejected').length,
      };
      return stats;
    }
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
