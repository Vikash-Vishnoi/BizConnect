/**
 * ✅ FEATURE 32: Flow Messages Service
 * Frontend API service for WhatsApp Flows (interactive forms)
 */

import api from './api';

export interface FlowComponent {
  type: 'TextInput' | 'TextArea' | 'CheckboxGroup' | 'RadioButtonsGroup' | 'Dropdown' | 
        'DatePicker' | 'OptIn' | 'Footer' | 'EmbeddedLink' | 'Image' | 'DataSource';
  name: string;
  label?: string;
  required?: boolean;
  [key: string]: any;
}

export interface FlowScreen {
  id: string;
  title: string;
  data: FlowComponent[];
  terminal?: boolean;
  success?: boolean;
}

export interface Flow {
  _id: string;
  flowId?: string;
  name: string;
  category: string;
  screens: FlowScreen[];
  status: 'draft' | 'review' | 'published' | 'deprecated';
  version: string;
  analytics: {
    totalViews: number;
    totalCompletions: number;
    completionRate: number;
    averageTime: number;
    dropoffRate: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FlowResponse {
  _id: string;
  flowId: string;
  contactPhone: string;
  status: 'started' | 'in_progress' | 'completed' | 'abandoned';
  responseData: any;
  screenVisits: Array<{
    screenId: string;
    timestamp: Date;
    timeSpent: number;
  }>;
  startedAt: string;
  completedAt?: string;
  timeSpent: number;
}

/**
 * Get all flows
 */
export const getFlows = async (page = 1, status = 'all') => {
  const response = await api.get(`/flows?page=${page}&status=${status}`);
  return response.data;
};

/**
 * Get flow by ID
 */
export const getFlowById = async (flowId: string) => {
  const response = await api.get(`/flows/${flowId}`);
  return response.data;
};

/**
 * Create a new flow
 */
export const createFlow = async (flowData: Partial<Flow>) => {
  const response = await api.post('/flows', flowData);
  return response.data;
};

/**
 * Update an existing flow
 */
export const updateFlow = async (flowId: string, flowData: Partial<Flow>) => {
  const response = await api.put(`/flows/${flowId}`, flowData);
  return response.data;
};

/**
 * Delete a flow
 */
export const deleteFlow = async (flowId: string) => {
  const response = await api.delete(`/flows/${flowId}`);
  return response.data;
};

/**
 * Publish a flow to WhatsApp
 */
export const publishFlow = async (flowId: string) => {
  const response = await api.post(`/flows/${flowId}/publish`);
  return response.data;
};

/**
 * Deprecate a published flow
 */
export const deprecateFlow = async (flowId: string) => {
  const response = await api.post(`/flows/${flowId}/deprecate`);
  return response.data;
};

/**
 * Send a flow message to a contact
 */
export const sendFlowMessage = async (
  flowId: string,
  contactPhone: string,
  flowToken: string,
  flowCta: string,
  mode: 'draft' | 'published' = 'published'
) => {
  const response = await api.post(`/flows/${flowId}/send`, {
    to: contactPhone,
    flow_token: flowToken,
    flow_cta: flowCta,
    mode
  });
  return response.data;
};

/**
 * Get flow responses
 */
export const getFlowResponses = async (flowId: string, page = 1) => {
  const response = await api.get(`/flows/${flowId}/responses?page=${page}`);
  return response.data;
};

/**
 * Get flow analytics
 */
export const getFlowAnalytics = async (flowId: string) => {
  const response = await api.get(`/flows/${flowId}/analytics`);
  return response.data;
};

/**
 * Get flow statistics summary
 */
export const getFlowStatsSummary = async () => {
  const response = await api.get('/flows/stats/summary');
  return response.data;
};

/**
 * Get template flows (pre-built)
 */
export const getTemplateFlows = () => {
  return [
    {
      name: 'Lead Generation Form',
      category: 'lead_generation',
      screens: [
        {
          id: 'WELCOME',
          title: 'Welcome',
          data: [
            {
              type: 'TextBody',
              text: 'Thank you for your interest! Please provide your details.'
            }
          ],
          terminal: false
        },
        {
          id: 'CONTACT_INFO',
          title: 'Contact Information',
          data: [
            {
              type: 'TextInput',
              name: 'full_name',
              label: 'Full Name',
              required: true,
              'input-type': 'text'
            },
            {
              type: 'TextInput',
              name: 'email',
              label: 'Email Address',
              required: true,
              'input-type': 'email'
            },
            {
              type: 'TextInput',
              name: 'phone',
              label: 'Phone Number',
              required: false,
              'input-type': 'phone'
            }
          ],
          terminal: false
        },
        {
          id: 'INTERESTS',
          title: 'Your Interests',
          data: [
            {
              type: 'CheckboxGroup',
              name: 'interests',
              label: 'What are you interested in?',
              required: true,
              data_source: [
                { id: 'product', title: 'Product Demo' },
                { id: 'pricing', title: 'Pricing Information' },
                { id: 'support', title: 'Technical Support' }
              ]
            },
            {
              type: 'TextArea',
              name: 'message',
              label: 'Additional Comments',
              required: false
            }
          ],
          terminal: false
        },
        {
          id: 'SUCCESS',
          title: 'Thank You!',
          data: [
            {
              type: 'TextBody',
              text: 'Thank you! We will contact you soon.'
            }
          ],
          terminal: true,
          success: true
        }
      ]
    },
    {
      name: 'Appointment Booking',
      category: 'appointment',
      screens: [
        {
          id: 'WELCOME',
          title: 'Book Appointment',
          data: [
            {
              type: 'TextBody',
              text: 'Let\'s schedule your appointment'
            }
          ],
          terminal: false
        },
        {
          id: 'DETAILS',
          title: 'Your Details',
          data: [
            {
              type: 'TextInput',
              name: 'name',
              label: 'Your Name',
              required: true,
              'input-type': 'text'
            },
            {
              type: 'DatePicker',
              name: 'date',
              label: 'Preferred Date',
              required: true
            },
            {
              type: 'RadioButtonsGroup',
              name: 'time',
              label: 'Preferred Time',
              required: true,
              data_source: [
                { id: 'morning', title: 'Morning (9AM - 12PM)' },
                { id: 'afternoon', title: 'Afternoon (12PM - 3PM)' },
                { id: 'evening', title: 'Evening (3PM - 6PM)' }
              ]
            }
          ],
          terminal: false
        },
        {
          id: 'SUCCESS',
          title: 'Confirmed',
          data: [
            {
              type: 'TextBody',
              text: 'Your appointment is confirmed!'
            }
          ],
          terminal: true,
          success: true
        }
      ]
    }
  ];
};
