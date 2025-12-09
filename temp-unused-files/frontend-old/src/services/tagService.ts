/**
 * Tag Service
 * 
 * API client for contact/conversation tags:
 * - Get all tags
 * - Add/remove tags from conversations
 * - Rename, delete, merge tags
 * - Tag analytics
 * 
 * @module tagService
 */

import api from './api';

export interface Tag {
  name: string;
  count: number;
  lastUsed: Date;
  color: string;
}

export interface TagAnalytics {
  totalUniqueTags: number;
  totalTaggedConversations: number;
  totalUntaggedConversations: number;
  tagCoverage: number;
  distribution: Array<{
    tagCount: number;
    conversations: number;
  }>;
}

class TagService {
  /**
   * Get all tags for the authenticated user
   */
  async getAllTags(): Promise<{ success: boolean; tags: Tag[]; total: number }> {
    const response = await api.get('/tags');
    return response.data;
  }

  /**
   * Get conversations with a specific tag
   */
  async getConversationsByTag(
    tagName: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    success: boolean;
    conversations: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    tag: string;
  }> {
    const response = await api.get(`/tags/${encodeURIComponent(tagName)}/conversations`, {
      params: { page, limit }
    });
    return response.data;
  }

  /**
   * Add a tag to a conversation
   */
  async addTagToConversation(
    conversationId: string,
    tagName: string
  ): Promise<{
    success: boolean;
    conversation: any;
    tag: string;
  }> {
    const response = await api.post(`/tags/conversation/${conversationId}/add`, {
      tagName
    });
    return response.data;
  }

  /**
   * Remove a tag from a conversation
   */
  async removeTagFromConversation(
    conversationId: string,
    tagName: string
  ): Promise<{
    success: boolean;
    conversation: any;
    tag: string;
  }> {
    const response = await api.post(`/tags/conversation/${conversationId}/remove`, {
      tagName
    });
    return response.data;
  }

  /**
   * Rename a tag across all conversations
   */
  async renameTag(
    oldTagName: string,
    newTagName: string
  ): Promise<{
    success: boolean;
    oldTag: string;
    newTag: string;
    updatedCount: number;
  }> {
    const response = await api.put(`/tags/${encodeURIComponent(oldTagName)}/rename`, {
      newTagName
    });
    return response.data;
  }

  /**
   * DELETE endpoint disabled - tags retained for historical data integrity
   */
  // async deleteTag(tagName: string): Promise<{
  //   success: boolean;
  //   tag: string;
  //   deletedFromCount: number;
  // }> {
  //   const response = await api.delete(`/tags/${encodeURIComponent(tagName)}`);
  //   return response.data;
  // }

  /**
   * Merge multiple tags into one
   */
  async mergeTags(
    tagsToMerge: string[],
    targetTag: string
  ): Promise<{
    success: boolean;
    mergedTags: string[];
    targetTag: string;
    updatedCount: number;
  }> {
    const response = await api.post('/tags/merge', {
      tagsToMerge,
      targetTag
    });
    return response.data;
  }

  /**
   * Get tag suggestions based on query
   */
  async getTagSuggestions(
    query: string = '',
    limit: number = 10
  ): Promise<{
    success: boolean;
    suggestions: Tag[];
    query: string;
  }> {
    const response = await api.get('/tags/suggestions', {
      params: { q: query, limit }
    });
    return response.data;
  }

  /**
   * Get tag analytics
   */
  async getTagAnalytics(): Promise<{
    success: boolean;
    analytics: TagAnalytics;
  }> {
    const response = await api.get('/tags/analytics');
    return response.data;
  }

  /**
   * Validate a tag name
   */
  async validateTagName(tagName: string): Promise<{
    success: boolean;
    validation: {
      valid: boolean;
      normalized?: string;
      error?: string;
    };
  }> {
    const response = await api.post('/tags/validate', {
      tagName
    });
    return response.data;
  }
}

export default new TagService();
