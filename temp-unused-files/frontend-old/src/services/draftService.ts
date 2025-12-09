import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_PREFIX = 'draft_';

export interface Draft {
  conversationId: string;
  text: string;
  timestamp: string;
}

export const draftService = {
  // Save a draft for a conversation
  saveDraft: async (conversationId: string, text: string): Promise<void> => {
    try {
      if (!text.trim()) {
        // If text is empty, remove the draft
        await draftService.deleteDraft(conversationId);
        return;
      }

      const draft: Draft = {
        conversationId,
        text,
        timestamp: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        `${DRAFT_PREFIX}${conversationId}`,
        JSON.stringify(draft)
      );
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  },

  // Get a draft for a conversation
  getDraft: async (conversationId: string): Promise<Draft | null> => {
    try {
      const draftJson = await AsyncStorage.getItem(
        `${DRAFT_PREFIX}${conversationId}`
      );

      if (!draftJson) {
        return null;
      }

      return JSON.parse(draftJson);
    } catch (error) {
      console.error('Error getting draft:', error);
      return null;
    }
  },

  // Delete a draft for a conversation
  deleteDraft: async (conversationId: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(`${DRAFT_PREFIX}${conversationId}`);
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  },

  // Get all drafts
  getAllDrafts: async (): Promise<Draft[]> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const draftKeys = keys.filter(key => key.startsWith(DRAFT_PREFIX));

      if (draftKeys.length === 0) {
        return [];
      }

      const draftItems = await AsyncStorage.multiGet(draftKeys);
      const drafts: Draft[] = [];

      for (const [key, value] of draftItems) {
        if (value) {
          try {
            drafts.push(JSON.parse(value));
          } catch (error) {
            console.error(`Error parsing draft ${key}:`, error);
          }
        }
      }

      return drafts;
    } catch (error) {
      console.error('Error getting all drafts:', error);
      return [];
    }
  },

  // Get draft count
  getDraftCount: async (): Promise<number> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys.filter(key => key.startsWith(DRAFT_PREFIX)).length;
    } catch (error) {
      console.error('Error getting draft count:', error);
      return 0;
    }
  },

  // Clear all drafts
  clearAllDrafts: async (): Promise<void> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const draftKeys = keys.filter(key => key.startsWith(DRAFT_PREFIX));
      await AsyncStorage.multiRemove(draftKeys);
    } catch (error) {
      console.error('Error clearing all drafts:', error);
    }
  },
};
