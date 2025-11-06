import type {User} from './auth';
import type {Template} from './template';
import type {Campaign} from './campaign';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  Dashboard: {user?: User};
  Campaigns: undefined;
  CampaignDetails: {campaignId: string};
  CreateCampaign: {edit?: Campaign; duplicate?: Campaign} | undefined;
  Inbox: undefined;
  Conversation: {conversationId: string};
  Search: undefined;
  SavedReplies: undefined;
  Templates: undefined;
  CreateTemplate: {templateToEdit?: Template} | undefined;
  TemplateDetails: {templateId: string};
  Analytics: undefined;
  WelcomeMessageSettings: undefined;
};
