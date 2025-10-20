import type {User} from './auth';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Dashboard: {user?: User};
  Campaigns: undefined;
  CampaignDetails: {campaignId: string};
  CreateCampaign: undefined;
  Inbox: undefined;
  Conversation: {conversationId: string};
};
