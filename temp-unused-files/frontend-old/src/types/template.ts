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

export interface TemplateButton {
  type: TemplateButtonType;
  text: string;
  phoneNumber?: string;
  url?: string;
  example?: string[];
}

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

export interface CreateTemplatePayload {
  name: string;
  category: TemplateCategory;
  language: TemplateLanguage;
  components: TemplateComponent[];
}

export interface UpdateTemplatePayload extends Partial<CreateTemplatePayload> {
  status?: TemplateStatus;
}

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

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface TemplateStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
}
