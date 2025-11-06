const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Conversation = require('../models/Conversation');

// @route   GET /api/search/messages
// @desc    Search messages across all conversations
// @access  Private
router.get('/messages', auth, async (req, res) => {
  try {
    const { q, limit = 50, page = 1 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchQuery = q.trim();
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Create text search regex (case-insensitive)
    const searchRegex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    // Find conversations with matching messages
    const conversations = await Conversation.find({
      userId: req.userId,
      isDeleted: false,
      'messages.content.text': searchRegex,
      'messages.isDeleted': { $ne: true }
    })
      .select('_id contact messages')
      .lean();

    // Extract matching messages
    const results = [];
    
    for (const conversation of conversations) {
      const matchingMessages = conversation.messages.filter(msg => 
        !msg.isDeleted &&
        msg.content?.text &&
        searchRegex.test(msg.content.text)
      );

      for (const message of matchingMessages) {
        results.push({
          messageId: message._id,
          conversationId: conversation._id,
          contact: conversation.contact,
          message: {
            _id: message._id,
            text: message.content.text,
            type: message.type,
            direction: message.direction,
            timestamp: message.timestamp,
            // Highlight matching text
            highlightedText: highlightMatches(message.content.text, searchQuery)
          }
        });
      }
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => new Date(b.message.timestamp) - new Date(a.message.timestamp));

    // Paginate
    const paginatedResults = results.slice(skip, skip + parseInt(limit));
    const total = results.length;
    const hasMore = skip + parseInt(limit) < total;

    res.json({
      results: paginatedResults,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      hasMore,
      query: searchQuery
    });
  } catch (error) {
    console.error('Message search error:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

// @route   GET /api/search/conversations
// @desc    Search conversations by contact name or phone
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    const { q, limit = 50 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchQuery = q.trim();
    const searchRegex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    // Search by contact name or phone number
    const conversations = await Conversation.find({
      userId: req.userId,
      isDeleted: false,
      $or: [
        { 'contact.name': searchRegex },
        { 'contact.phoneNumber': searchRegex }
      ]
    })
      .sort({ lastMessageAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      conversations,
      total: conversations.length,
      query: searchQuery
    });
  } catch (error) {
    console.error('Conversation search error:', error);
    res.status(500).json({ error: 'Failed to search conversations' });
  }
});

// @route   GET /api/search/combined
// @desc    Combined search (messages + conversations)
// @access  Private
router.get('/combined', auth, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchQuery = q.trim();
    const searchRegex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    // Search conversations
    const conversationMatches = await Conversation.find({
      userId: req.userId,
      isDeleted: false,
      $or: [
        { 'contact.name': searchRegex },
        { 'contact.phoneNumber': searchRegex }
      ]
    })
      .sort({ lastMessageAt: -1 })
      .limit(parseInt(limit))
      .select('_id contact status lastMessage lastMessageAt unreadCount')
      .lean();

    // Search messages
    const messageMatches = await Conversation.find({
      userId: req.userId,
      isDeleted: false,
      'messages.content.text': searchRegex,
      'messages.isDeleted': { $ne: true }
    })
      .select('_id contact messages')
      .limit(parseInt(limit))
      .lean();

    // Extract matching messages (top 10)
    const messageResults = [];
    for (const conversation of messageMatches) {
      const matchingMessages = conversation.messages
        .filter(msg => 
          !msg.isDeleted &&
          msg.content?.text &&
          searchRegex.test(msg.content.text)
        )
        .slice(0, 2); // Top 2 messages per conversation

      for (const message of matchingMessages) {
        messageResults.push({
          messageId: message._id,
          conversationId: conversation._id,
          contact: conversation.contact,
          snippet: truncateText(message.content.text, 100),
          timestamp: message.timestamp
        });
      }
    }

    // Sort message results by timestamp
    messageResults.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      conversations: conversationMatches,
      messages: messageResults.slice(0, 10),
      query: searchQuery,
      totalConversations: conversationMatches.length,
      totalMessages: messageResults.length
    });
  } catch (error) {
    console.error('Combined search error:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

// Helper function to highlight matching text
function highlightMatches(text, query) {
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

// Helper function to truncate text
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

module.exports = router;
