/**
 * Contact Deduplication Routes
 * @module routes/contacts/deduplication
 * 
 * Identifies and manages duplicate contacts
 * Helps maintain clean contact database
 */

const express = require('express');
const router = express.Router();
const Contact = require('../../../core/database/models/Contact');
const { auth, requireBusiness, requireBusinessPermission } = require('../../../core/middlewares/auth');
const { requireBusinessOwnership } = require('../../../core/middlewares/rbac');
 
/**
 * @route   POST /api/contacts/deduplicate
 * @desc    Run deduplication process and merge duplicates
 * @access  Private - Manager+ only
 */
router.post('/deduplicate', auth, requireBusiness, requireBusinessOwnership, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { 
      autoMerge = false, 
      threshold = 80,
      fields = ['phoneNumber', 'name', 'email']
    } = req.body;

    // Find all contacts for business
    const contacts = await Contact.find({
      businessId: req.businessId,
      isDuplicate: false, // Don't process already marked duplicates
      mergedInto: null
    }).lean();

    if (contacts.length < 2) {
      return res.json({
        message: 'Not enough contacts to check for duplicates',
        duplicatesFound: 0,
        merged: 0
      });
    }

    // Find potential duplicates
    const duplicateGroups = findDuplicateGroups(contacts, fields, threshold);

    let mergedCount = 0;
    const duplicateDetails = [];

    // Process each duplicate group
    for (const group of duplicateGroups) {
      const master = group.contacts[0]; // Keep first as master
      const duplicates = group.contacts.slice(1);

      duplicateDetails.push({
        masterId: master._id,
        masterPhone: master.phoneNumber,
        masterName: master.name,
        duplicates: duplicates.map(d => ({
          id: d._id,
          phone: d.phoneNumber,
          name: d.name,
          email: d.email,
          score: d.duplicateScore
        })),
        similarityScore: group.score
      });

      if (autoMerge) {
        // Merge duplicates into master
        for (const duplicate of duplicates) {
          await mergeContacts(master._id, duplicate._id, req.businessId);
          mergedCount++;
        }
      } else {
        // Just mark them as duplicates
        for (const duplicate of duplicates) {
          await Contact.findByIdAndUpdate(duplicate._id, {
            isDuplicate: true,
            mergedInto: null,
            duplicateScore: duplicate.duplicateScore
          });
        }
      }
    }

    res.json({
      message: autoMerge 
        ? `Deduplication complete. Merged ${mergedCount} duplicate contacts.`
        : `Found ${duplicateGroups.length} duplicate groups. Review and merge manually.`,
      duplicatesFound: duplicateGroups.length,
      totalDuplicateContacts: duplicateGroups.reduce((sum, g) => sum + g.contacts.length - 1, 0),
      merged: mergedCount,
      groups: duplicateDetails,
      autoMerge,
      threshold
    });
  } catch (error) {
    console.error('Deduplication error:', error);
    res.status(500).json({ 
      error: 'Failed to deduplicate contacts',
      details: error.message 
    });
  }
});

/**
 * @route   GET /api/contacts/duplicates
 * @desc    Get list of potential duplicate contacts
 * @access  Private - All authenticated users
 */
router.post('/deduplicate', auth, requireBusiness, requireBusinessOwnership, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const defaultThreshold = parseInt(process.env.CONTACT_DUPLICATE_THRESHOLD || '80');
    const defaultLimit = parseInt(process.env.CONTACT_DUPLICATES_LIMIT || '50');
    const {
      threshold = defaultThreshold,
      limit = defaultLimit,
      skip = 0,
      includeAlreadyMerged = false
    } = req.query;

    // Build query
    const query = {
      businessId: req.businessId
    };

    if (!includeAlreadyMerged) {
      query.mergedInto = null;
    }

    // Get contacts
    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .lean();

    if (contacts.length < 2) {
      return res.json({
        duplicates: [],
        total: 0,
        message: 'No duplicates found'
      });
    }

    // Find duplicate groups
    const duplicateGroups = findDuplicateGroups(
      contacts, 
      ['phoneNumber', 'name', 'email'], 
      parseInt(threshold)
    );

    // Format response
    const duplicates = duplicateGroups.map(group => {
      const master = group.contacts[0];
      const dupes = group.contacts.slice(1);

      return {
        group: {
          score: group.score,
          reason: group.reason,
          contactCount: group.contacts.length
        },
        master: {
          id: master._id,
          phoneNumber: master.phoneNumber,
          name: master.name,
          email: master.email,
          tags: master.tags,
          messageCount: master.messageCount,
          createdAt: master.createdAt
        },
        duplicates: dupes.map(d => ({
          id: d._id,
          phoneNumber: d.phoneNumber,
          name: d.name,
          email: d.email,
          tags: d.tags,
          messageCount: d.messageCount,
          isDuplicate: d.isDuplicate,
          mergedInto: d.mergedInto,
          duplicateScore: d.duplicateScore,
          createdAt: d.createdAt
        }))
      };
    });

    // Apply pagination
    const paginatedDuplicates = duplicates.slice(
      parseInt(skip), 
      parseInt(skip) + parseInt(limit)
    );

    res.json({
      duplicates: paginatedDuplicates,
      total: duplicates.length,
      showing: paginatedDuplicates.length,
      threshold: parseInt(threshold),
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: parseInt(skip) + paginatedDuplicates.length < duplicates.length
      }
    });
  } catch (error) {
    console.error('Get duplicates error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch duplicate contacts',
      details: error.message 
    });
  }
});

/**
 * @route   POST /api/contacts/:id/merge
 * @desc    Manually merge a duplicate contact into another contact
 * @access  Private - Manager+ only
 */
router.post('/:id/merge', auth, requireBusiness, requireBusinessOwnership, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { mergeIntoId } = req.body;

    if (!mergeIntoId) {
      return res.status(400).json({ 
        error: 'mergeIntoId is required' 
      });
    }

    const duplicateId = req.params.id;

    // Verify both contacts exist and belong to business
    const [duplicate, master] = await Promise.all([
      Contact.findOne({ _id: duplicateId, businessId: req.businessId }),
      Contact.findOne({ _id: mergeIntoId, businessId: req.businessId })
    ]);

    if (!duplicate) {
      return res.status(404).json({ error: 'Duplicate contact not found' });
    }

    if (!master) {
      return res.status(404).json({ error: 'Master contact not found' });
    }

    if (duplicate._id.toString() === master._id.toString()) {
      return res.status(400).json({ error: 'Cannot merge contact into itself' });
    }

    // Perform merge
    const result = await mergeContacts(master._id, duplicate._id, req.businessId);

    res.json({
      message: 'Contacts merged successfully',
      master: result.master,
      mergedData: result.mergedData
    });
  } catch (error) {
    console.error('Merge contacts error:', error);
    res.status(500).json({ 
      error: 'Failed to merge contacts',
      details: error.message 
    });
  }
});

/**
 * @route   POST /api/contacts/:id/unmark-duplicate
 * @desc    Unmark a contact as duplicate
 * @access  Private - Manager+ only
 */
router.post('/:id/unmark-duplicate', auth, requireBusiness, requireBusinessOwnership, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const contact = await Contact.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    contact.isDuplicate = false;
    contact.duplicateScore = 0;
    await contact.save();

    res.json({
      message: 'Contact unmarked as duplicate',
      contact
    });
  } catch (error) {
    console.error('Unmark duplicate error:', error);
    res.status(500).json({ 
      error: 'Failed to unmark contact',
      details: error.message 
    });
  }
});

/**
 * Helper: Find duplicate groups based on similarity
 */
function findDuplicateGroups(contacts, fields, threshold) {
  const groups = [];
  const processed = new Set();

  for (let i = 0; i < contacts.length; i++) {
    if (processed.has(contacts[i]._id.toString())) continue;

    const duplicates = [contacts[i]];
    processed.add(contacts[i]._id.toString());

    for (let j = i + 1; j < contacts.length; j++) {
      if (processed.has(contacts[j]._id.toString())) continue;

      const similarity = calculateSimilarity(contacts[i], contacts[j], fields);
      
      if (similarity.score >= threshold) {
        contacts[j].duplicateScore = similarity.score;
        duplicates.push(contacts[j]);
        processed.add(contacts[j]._id.toString());
      }
    }

    if (duplicates.length > 1) {
      // Sort by creation date (oldest first as master)
      duplicates.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      const avgScore = duplicates.reduce((sum, d) => sum + (d.duplicateScore || 100), 0) / duplicates.length;
      
      groups.push({
        contacts: duplicates,
        score: Math.round(avgScore),
        reason: getSimilarityReason(duplicates[0], duplicates[1], fields)
      });
    }
  }

  return groups;
}

/**
 * Helper: Calculate similarity between two contacts
 */
function calculateSimilarity(contact1, contact2, fields) {
  let score = 0;
  let maxScore = 0;
  const reasons = [];

  if (fields.includes('phoneNumber')) {
    maxScore += 50;
    const phone1 = normalizePhone(contact1.phoneNumber);
    const phone2 = normalizePhone(contact2.phoneNumber);
    
    if (phone1 === phone2) {
      score += 50;
      reasons.push('exact phone match');
    } else if (phone1.endsWith(phone2.slice(-10)) || phone2.endsWith(phone1.slice(-10))) {
      score += 40;
      reasons.push('similar phone numbers');
    }
  }

  if (fields.includes('name') && contact1.name && contact2.name) {
    maxScore += 30;
    const name1 = contact1.name.toLowerCase().trim();
    const name2 = contact2.name.toLowerCase().trim();
    
    if (name1 === name2) {
      score += 30;
      reasons.push('exact name match');
    } else if (name1.includes(name2) || name2.includes(name1)) {
      score += 20;
      reasons.push('partial name match');
    } else {
      // Calculate Levenshtein distance
      const similarity = stringSimilarity(name1, name2);
      if (similarity > 0.8) {
        score += 25;
        reasons.push('very similar names');
      } else if (similarity > 0.6) {
        score += 15;
        reasons.push('similar names');
      }
    }
  }

  if (fields.includes('email') && contact1.email && contact2.email) {
    maxScore += 20;
    const email1 = contact1.email.toLowerCase().trim();
    const email2 = contact2.email.toLowerCase().trim();
    
    if (email1 === email2) {
      score += 20;
      reasons.push('exact email match');
    } else if (email1.split('@')[0] === email2.split('@')[0]) {
      score += 10;
      reasons.push('similar email addresses');
    }
  }

  // Normalize score to 0-100
  const normalizedScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return {
    score: normalizedScore,
    reasons
  };
}

/**
 * Helper: Normalize phone number
 */
function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
}

/**
 * Helper: Calculate string similarity (Levenshtein)
 */
function stringSimilarity(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

/**
 * Helper: Get similarity reason string
 */
function getSimilarityReason(contact1, contact2, fields) {
  const reasons = [];

  if (fields.includes('phoneNumber')) {
    const phone1 = normalizePhone(contact1.phoneNumber);
    const phone2 = normalizePhone(contact2.phoneNumber);
    if (phone1 === phone2) reasons.push('same phone');
  }

  if (fields.includes('name') && contact1.name && contact2.name) {
    if (contact1.name.toLowerCase() === contact2.name.toLowerCase()) {
      reasons.push('same name');
    }
  }

  if (fields.includes('email') && contact1.email && contact2.email) {
    if (contact1.email.toLowerCase() === contact2.email.toLowerCase()) {
      reasons.push('same email');
    }
  }

  return reasons.length > 0 ? reasons.join(', ') : 'similar data';
}

/**
 * Helper: Merge duplicate contact into master
 */
async function mergeContacts(masterId, duplicateId, businessId) {
  const Conversation = require('../../../core/database/models/Conversation');

  // Get both contacts
  const [master, duplicate] = await Promise.all([
    Contact.findById(masterId),
    Contact.findById(duplicateId)
  ]);

  // Merge data (keep non-empty fields from duplicate)
  const updates = {};

  if (!master.name && duplicate.name) updates.name = duplicate.name;
  if (!master.email && duplicate.email) updates.email = duplicate.email;
  
  // Merge tags (unique)
  if (duplicate.tags && duplicate.tags.length > 0) {
    const mergedTags = [...new Set([...(master.tags || []), ...duplicate.tags])];
    updates.tags = mergedTags;
  }

  // Merge custom fields
  if (duplicate.customFields) {
    updates.customFields = {
      ...(master.customFields || {}),
      ...duplicate.customFields
    };
  }

  // Combine notes
  if (duplicate.notes) {
    updates.notes = master.notes 
      ? `${master.notes}\n\n--- Merged from duplicate ---\n${duplicate.notes}`
      : duplicate.notes;
  }

  // Update message stats
  updates.messageCount = (master.messageCount || 0) + (duplicate.messageCount || 0);

  // Keep earliest contact date
  if (duplicate.createdAt < master.createdAt) {
    updates.createdAt = duplicate.createdAt;
  }

  // Update conversations (change phone number to master's)
  await Conversation.updateMany(
    { 
      businessId,
      phoneNumber: duplicate.phoneNumber 
    },
    { 
      $set: { phoneNumber: master.phoneNumber } 
    }
  );

  // Mark duplicate as merged
  duplicate.isDuplicate = true;
  duplicate.mergedInto = masterId;
  duplicate.duplicateScore = 100;
  await duplicate.save();

  // Update master
  Object.assign(master, updates);
  await master.save();

  return {
    master,
    mergedData: {
      conversationsMigrated: true,
      fieldsMerged: Object.keys(updates)
    }
  };
}

module.exports = router;
