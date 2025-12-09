/**
 * Message Content Builder - Extracts and structures message content from WhatsApp webhooks
 * @module routes/webhooks/messageContentBuilder
 */

const logger = require('../../../common/helpers/logger');

/**
 * Build structured message content from webhook data
 * @param {Object} messageData - Raw message data from webhook
 * @param {Object} message - Full WhatsApp message object
 * @returns {Object} Structured content object
 */ 
function buildMessageContent(messageData, message = {}) {
  const content = {
    text: messageData.text?.body || ''
  };

  try {
    switch (messageData.type) {
      case 'text':
        content.text = messageData.text?.body || '';
        break;

      case 'image':
        content.mediaId = messageData.image?.id;
        content.mediaUrl = messageData.image?.link || messageData.image?.url;
        content.mediaType = 'image';
        content.mimeType = messageData.image?.mime_type;
        content.sha256 = messageData.image?.sha256;
        content.caption = messageData.image?.caption || '';
        content.text = content.caption || '📷 Image';
        break;

      case 'video':
        content.mediaId = messageData.video?.id;
        content.mediaUrl = messageData.video?.link || messageData.video?.url;
        content.mediaType = 'video';
        content.mimeType = messageData.video?.mime_type;
        content.sha256 = messageData.video?.sha256;
        content.caption = messageData.video?.caption || '';
        content.text = content.caption || '🎥 Video';
        break;

      case 'audio':
        content.mediaId = messageData.audio?.id;
        content.mediaUrl = messageData.audio?.link || messageData.audio?.url;
        content.mediaType = 'audio';
        content.mimeType = messageData.audio?.mime_type;
        content.sha256 = messageData.audio?.sha256;
        content.voice = messageData.audio?.voice || false;
        content.text = '🎤 Audio message';
        break;

      case 'document':
        content.mediaId = messageData.document?.id;
        content.mediaUrl = messageData.document?.link || messageData.document?.url;
        content.mediaType = 'document';
        content.mimeType = messageData.document?.mime_type;
        content.sha256 = messageData.document?.sha256;
        content.filename = messageData.document?.filename || 'document';
        content.caption = messageData.document?.caption || '';
        content.text = `📄 ${content.filename}`;
        break;

      case 'sticker':
        content.mediaId = messageData.sticker?.id;
        content.mediaUrl = messageData.sticker?.link || messageData.sticker?.url;
        content.mediaType = 'sticker';
        content.mimeType = messageData.sticker?.mime_type;
        content.sha256 = messageData.sticker?.sha256;
        content.animated = messageData.sticker?.animated || false;
        content.text = '😊 Sticker';
        break;

      case 'location':
        content.location = {
          latitude: messageData.location?.latitude,
          longitude: messageData.location?.longitude,
          name: messageData.location?.name || '',
          address: messageData.location?.address || '',
          url: messageData.location?.url
        };
        content.text = `📍 ${messageData.location?.name || 'Location'}`;
        break;

      case 'contacts':
      case 'contact':
        content.contacts = (messageData.contacts || []).map(c => ({
          name: {
            formattedName: c.name?.formatted_name || c.name?.first_name || '',
            firstName: c.name?.first_name || '',
            lastName: c.name?.last_name || '',
            middleName: c.name?.middle_name || ''
          },
          phones: (c.phones || []).map(p => ({
            phone: p.phone || p.wa_id,
            type: p.type || 'MOBILE',
            waId: p.wa_id
          })),
          emails: (c.emails || []).map(e => ({
            email: e.email,
            type: e.type || 'WORK'
          })),
          urls: (c.urls || []).map(u => ({
            url: u.url,
            type: u.type || 'WORK'
          })),
          addresses: (c.addresses || []).map(a => ({
            street: a.street,
            city: a.city,
            state: a.state,
            zip: a.zip,
            country: a.country,
            countryCode: a.country_code,
            type: a.type || 'WORK'
          })),
          org: c.org ? {
            company: c.org.company,
            department: c.org.department,
            title: c.org.title
          } : null,
          birthday: c.birthday
        }));
        const firstContact = content.contacts[0];
        content.text = `👤 ${firstContact?.name?.formattedName || 'Contact'}`;
        break;

      case 'button':
      case 'button_reply':
        content.interactive = {
          type: 'button',
          buttonReply: {
            id: messageData.button?.payload || message.button?.payload,
            title: messageData.button?.text || message.button?.text
          }
        };
        content.text = content.interactive.buttonReply.title || '[Button Reply]';
        break;

      case 'interactive':
        if (messageData.interactive?.type === 'button_reply') {
          content.interactive = {
            type: 'button',
            buttonReply: {
              id: messageData.interactive.button_reply?.id,
              title: messageData.interactive.button_reply?.title
            }
          };
          content.text = messageData.interactive.button_reply?.title || '[Button Reply]';
        } else if (messageData.interactive?.type === 'list_reply') {
          content.interactive = {
            type: 'list',
            listReply: {
              id: messageData.interactive.list_reply?.id,
              title: messageData.interactive.list_reply?.title,
              description: messageData.interactive.list_reply?.description || ''
            }
          };
          content.text = messageData.interactive.list_reply?.title || '[List Reply]';
        } else if (messageData.interactive?.type === 'nfm_reply') {
          // Flow (NFM = Native Flow Message)
          content.interactive = {
            type: 'flow',
            flowReply: {
              name: messageData.interactive.nfm_reply?.name,
              body: messageData.interactive.nfm_reply?.body,
              responseJson: messageData.interactive.nfm_reply?.response_json
            }
          };
          content.text = `🔄 Flow: ${messageData.interactive.nfm_reply?.name || 'Response'}`;
        }
        break;

      case 'reaction':
        content.reaction = {
          messageId: messageData.reaction?.message_id,
          emoji: messageData.reaction?.emoji
        };
        content.text = `${messageData.reaction?.emoji || '❤️'} Reacted`;
        break;

      case 'order':
        content.order = {
          catalogId: messageData.order?.catalog_id,
          productItems: (messageData.order?.product_items || []).map(item => ({
            productRetailerId: item.product_retailer_id,
            quantity: item.quantity,
            itemPrice: item.item_price,
            currency: item.currency
          })),
          text: messageData.order?.text || ''
        };
        content.text = `🛒 Order (${content.order.productItems.length} items)`;
        break;

      case 'system':
        content.system = {
          body: messageData.system?.body || '',
          type: messageData.system?.type || 'unknown',
          identity: messageData.system?.identity,
          customer: messageData.system?.customer,
          waId: messageData.system?.wa_id,
          newWaId: messageData.system?.new_wa_id
        };
        content.text = `ℹ️ ${content.system.body || 'System message'}`;
        break;

      case 'unsupported':
        content.text = '❌ Unsupported message type';
        content.error = messageData.errors?.[0] || 'Message type not supported';
        break;

      default:
        content.text = `[${messageData.type || 'unknown'}]`;
        logger.warn('Unknown message type received', {
          type: messageData.type,
          messageId: message.id
        });
    }

    // Add context/reply information if present
    if (messageData.context || message.context) {
      const contextData = messageData.context || message.context;
      content.context = {
        messageId: contextData.id,
        from: contextData.from,
        forwarded: contextData.forwarded || false,
        frequentlyForwarded: contextData.frequently_forwarded || false
      };
    }

    // Add referral information if present (for Click-to-WhatsApp ads)
    if (messageData.referral || message.referral) {
      const referralData = messageData.referral || message.referral;
      content.referral = {
        sourceUrl: referralData.source_url,
        sourceType: referralData.source_type,
        sourceId: referralData.source_id,
        headline: referralData.headline,
        body: referralData.body,
        mediaType: referralData.media_type,
        mediaUrl: referralData.media_url,
        thumbnailUrl: referralData.thumbnail_url,
        ctwaClid: referralData.ctwa_clid
      };
    }

  } catch (error) {
    logger.error('Error building message content', {
      error: error.message,
      stack: error.stack,
      messageType: messageData.type,
      messageId: message.id
    });
    content.text = '[Error processing message]';
    content.error = error.message;
  }

  return content;
}

/**
 * Get message preview text for notifications
 * @param {Object} message - Message object
 * @returns {string} Preview text
 */
function getMessagePreview(message) {
  const maxLength = 100;

  try {
    switch (message.type) {
      case 'text':
        const text = message.content?.text || '';
        return text.length > maxLength 
          ? text.substring(0, maxLength) + '...' 
          : text;

      case 'image':
        return message.content?.caption 
          ? `📷 ${message.content.caption}` 
          : '📷 Image';

      case 'video':
        return message.content?.caption 
          ? `🎥 ${message.content.caption}` 
          : '🎥 Video';

      case 'audio':
        return message.content?.voice ? '🎤 Voice message' : '🎤 Audio';

      case 'document':
        return `📄 ${message.content?.filename || 'Document'}`;

      case 'sticker':
        return '😊 Sticker';

      case 'location':
        return `📍 ${message.content?.location?.name || 'Location'}`;

      case 'contacts':
      case 'contact':
        const contactName = message.content?.contacts?.[0]?.name?.formattedName;
        return `👤 ${contactName || 'Contact'}`;

      case 'button_reply':
        return `🔘 ${message.content?.text || 'Button reply'}`;

      case 'list_reply':
        return `📋 ${message.content?.text || 'List reply'}`;

      case 'interactive':
        if (message.content?.interactive?.type === 'flow') {
          return `🔄 ${message.content?.text || 'Flow response'}`;
        }
        return `💬 ${message.content?.text || 'Interactive message'}`;

      case 'reaction':
        return `${message.content?.reaction?.emoji || '❤️'} Reaction`;

      case 'order':
        return `🛒 ${message.content?.text || 'Order'}`;

      case 'system':
        return `ℹ️ ${message.content?.text || 'System message'}`;

      default:
        return `[${message.type}]`;
    }
  } catch (error) {
    logger.error('Error generating message preview', {
      error: error.message,
      messageType: message.type
    });
    return '[Message]';
  }
}

/**
 * Extract message data from webhook payload
 * @param {Object} webhookData - Webhook data
 * @returns {Object|null} Extracted message data
 */
function extractMessageData(webhookData) {
  const message = webhookData.messages?.[0];
  
  if (!message) {
    logger.warn('No messages array in webhook data');
    return null;
  }

  return {
    from: message.from,
    timestamp: message.timestamp,
    id: message.id,
    type: message.type,
    text: message.text,
    image: message.image,
    video: message.video,
    audio: message.audio,
    document: message.document,
    sticker: message.sticker,
    location: message.location,
    contacts: message.contacts,
    interactive: message.interactive,
    reaction: message.reaction,
    context: message.context,
    referral: message.referral,
    button: message.button,
    order: message.order,
    system: message.system,
    errors: message.errors
  };
}

module.exports = {
  buildMessageContent,
  getMessagePreview,
  extractMessageData
};
