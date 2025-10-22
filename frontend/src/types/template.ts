// Template component types based on WhatsApp Business API
export type TemplateComponentType = 
  | 'HEADER' 
  | 'BODY' 
  | 'FOOTER' 
  | 'BUTTONS';

export type TemplateHeaderFormat = 
  | 'TEXT' 
  | 'IMAGE' 
  | 'VIDEO' 
  | 'DOCUMENT';

export type TemplateButtonType = 
  | 'QUICK_REPLY' 
  | 'PHONE_NUMBER' 
  | 'URL';

export type TemplateCategory = 
  | 'UTILITY' 
  | 'MARKETING' 
  | 'AUTHENTICATION';

export type TemplateStatus = 
  | 'draft' 
  | 'pending' 
  | 'approved' 
  | 'rejected';

export type TemplateLanguage = 
  | 'en' 
  | 'en_US' 
  | 'hi' 
  | 'es' 
  | 'fr' 
  | 'pt_BR';

// Template button interface
export interface TemplateButton {
  type: TemplateButtonType;
  text: string;
  phoneNumber?: string;
  url?: string;
  example?: string[];
}

// Template component interface
export interface TemplateComponent {
  type: TemplateComponentType;
  format?: TemplateHeaderFormat;
  text?: string;
  example?: {
    header_handle?: string[];
    body_text?: string[][];
  };
  buttons?: TemplateButton[];
}

// Main template interface
export interface Template {
  _id: string;
  name: string;
  category: TemplateCategory;
  status: TemplateStatus;
  language: TemplateLanguage;
  components: TemplateComponent[];
  createdAt?: string;
  updatedAt?: string;
  rejectionReason?: string;
}

// Template creation/update payload
export interface CreateTemplatePayload {
  name: string;
  category: TemplateCategory;
  language: TemplateLanguage;
  components: TemplateComponent[];
}

export interface UpdateTemplatePayload extends Partial<CreateTemplatePayload> {
  status?: TemplateStatus;
}

// Template state management
export interface TemplatesState {
  list: Template[];
  selected: Template | null;
  loading: boolean;
  error: string | null;
  filters: {
    status: TemplateStatus | 'all';
    category: TemplateCategory | 'all';
    search: string;
  };
}

// Template validation result
export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
}

// Template statistics
export interface TemplateStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
}
