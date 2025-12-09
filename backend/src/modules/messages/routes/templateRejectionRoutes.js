/**
 * Template Rejection Tracking Routes
 * Handles template rejection history and pre-submission validation
 * @module routes/templates/templateRejectionRoutes
 */

const express = require('express');
const router = express.Router();
const { Template } = require('../../../core/database/models');

/**
 * GET /:id/rejections - Get rejection history for a template
 */  
router.get('/:id/rejections', async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const rejectionHistory = template.rejectionHistory || [];
    
    // Calculate rejection statistics
    const stats = {
      totalRejections: rejectionHistory.length,
      byCategory: {},
      mostRecentRejection: rejectionHistory.length > 0 ? rejectionHistory[rejectionHistory.length - 1] : null,
      averageTimeBetweenRejections: null
    };

    // Count by category
    rejectionHistory.forEach(rejection => {
      const category = rejection.category || 'OTHER';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    });

    // Calculate average time between rejections
    if (rejectionHistory.length >= 2) {
      const times = [];
      for (let i = 1; i < rejectionHistory.length; i++) {
        const timeDiff = new Date(rejectionHistory[i].rejectedAt) - new Date(rejectionHistory[i - 1].rejectedAt);
        times.push(timeDiff);
      }
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      stats.averageTimeBetweenRejections = Math.round(avgTime / (1000 * 60 * 60 * 24)); // days
    }

    res.json({
      success: true,
      template: {
        id: template._id,
        name: template.name,
        status: template.status,
        currentRejectionReason: template.rejectionReason
      },
      rejectionHistory,
      stats
    });

  } catch (error) {
    console.error('Error getting rejection history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get rejection history',
      error: error.message
    });
  }
});

/**
 * POST /:id/analyze - Pre-validate template before submission
 * Analyzes template content for potential policy violations and format issues
 */
router.post('/:id/analyze', async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const validation = {
      passedChecks: [],
      warnings: [],
      errors: [],
      score: 100,
      submissionRecommended: true,
      lastValidatedAt: new Date()
    };

    // Get body text for analysis
    const bodyComponent = template.components?.find(c => c.type === 'BODY');
    const bodyText = bodyComponent?.text || '';
    const headerComponent = template.components?.find(c => c.type === 'HEADER');
    const footerComponent = template.components?.find(c => c.type === 'FOOTER');
    const buttons = template.components?.filter(c => c.type === 'BUTTONS') || [];

    // CHECK 1: Template Name Format
    if (/^[a-z0-9_]+$/.test(template.name)) {
      validation.passedChecks.push('Template name format is valid (lowercase, numbers, underscores only)');
    } else {
      validation.errors.push('Template name must contain only lowercase letters, numbers, and underscores');
      validation.score -= 10;
    }

    // CHECK 2: Body Text Length
    if (bodyText.length > 0 && bodyText.length <= 1024) {
      validation.passedChecks.push('Body text length is within limits (1-1024 characters)');
    } else if (bodyText.length === 0) {
      validation.errors.push('Body text is required');
      validation.score -= 20;
    } else {
      validation.errors.push('Body text exceeds 1024 character limit');
      validation.score -= 15;
    }

    // CHECK 3: Variable Format
    const variableRegex = /\{\{(\d+)\}\}/g;
    const variables = [...bodyText.matchAll(variableRegex)];
    const variableNumbers = variables.map(m => parseInt(m[1]));
    
    if (variableNumbers.length === 0 || (variableNumbers.length > 0 && variableNumbers[0] === 1)) {
      validation.passedChecks.push('Variable numbering is correct (starts from {{1}})');
    } else {
      validation.errors.push('Variables must start from {{1}} and increment sequentially');
      validation.score -= 10;
    }

    // Check for sequential variables
    if (variableNumbers.length > 1) {
      const isSequential = variableNumbers.every((num, idx) => idx === 0 || num === variableNumbers[idx - 1] + 1);
      if (isSequential) {
        validation.passedChecks.push('Variables are numbered sequentially');
      } else {
        validation.warnings.push('Variables should be numbered sequentially ({{1}}, {{2}}, {{3}}, etc.)');
        validation.score -= 5;
      }
    }

    // CHECK 4: Prohibited Content
    const prohibitedPatterns = [
      { pattern: /cannabis|marijuana|cbd oil/i, reason: 'Drugs and controlled substances' },
      { pattern: /viagra|cialis|prescription drug/i, reason: 'Pharmaceutical products' },
      { pattern: /get rich quick|make money fast|guaranteed income/i, reason: 'Get-rich-quick schemes' },
      { pattern: /click here|click now/i, reason: 'Clickbait phrases (use descriptive text instead)', severity: 'warning' },
      { pattern: /free money|cash prize|you've won/i, reason: 'Potentially misleading offers' },
      { pattern: /sex|adult content|xxx/i, reason: 'Adult content' },
      { pattern: /weapon|gun|ammunition/i, reason: 'Weapons-related content' },
      { pattern: /gambling|casino|betting/i, reason: 'Gambling-related content' }
    ];

    let foundProhibited = false;
    prohibitedPatterns.forEach(({ pattern, reason, severity = 'error' }) => {
      if (pattern.test(bodyText)) {
        if (severity === 'warning') {
          validation.warnings.push(`Potential issue: ${reason}`);
          validation.score -= 5;
        } else {
          validation.errors.push(`Prohibited content detected: ${reason}`);
          validation.score -= 20;
          foundProhibited = true;
        }
      }
    });

    if (!foundProhibited) {
      validation.passedChecks.push('No prohibited content detected');
    }

    // CHECK 5: Spam Indicators
    const spamIndicators = [
      { pattern: /!!!+/, reason: 'Excessive exclamation marks' },
      { pattern: /[A-Z]{10,}/, reason: 'Excessive capitalization' },
      { pattern: /(.)(\\1{4,})/, reason: 'Repeated characters (e.g., "!!!!" or "???")' },
      { pattern: /(urgent|hurry|limited time|act now|don\\'t miss)/gi, reason: 'High-pressure language' }
    ];

    let spamScore = 0;
    spamIndicators.forEach(({ pattern, reason }) => {
      const matches = bodyText.match(pattern);
      if (matches && matches.length > 0) {
        validation.warnings.push(`Spam indicator detected: ${reason}`);
        spamScore += 5;
      }
    });

    if (spamScore === 0) {
      validation.passedChecks.push('No spam indicators detected');
    } else {
      validation.score -= spamScore;
    }

    // CHECK 6: Formatting Issues
    if (bodyText.includes('\\n\\n\\n')) {
      validation.warnings.push('Excessive line breaks detected (use maximum 2 consecutive line breaks)');
      validation.score -= 3;
    }

    if (bodyText.includes('  ')) {
      validation.warnings.push('Multiple consecutive spaces detected');
      validation.score -= 2;
    }

    // CHECK 7: Header Validation
    if (headerComponent) {
      if (headerComponent.format === 'TEXT' && headerComponent.text) {
        if (headerComponent.text.length <= 60) {
          validation.passedChecks.push('Header text length is within limits (60 characters)');
        } else {
          validation.errors.push('Header text exceeds 60 character limit');
          validation.score -= 10;
        }
      } else if (headerComponent.format === 'MEDIA') {
        validation.passedChecks.push('Header media format is valid');
      }
    }

    // CHECK 8: Footer Validation
    if (footerComponent && footerComponent.text) {
      if (footerComponent.text.length <= 60) {
        validation.passedChecks.push('Footer text length is within limits (60 characters)');
      } else {
        validation.errors.push('Footer text exceeds 60 character limit');
        validation.score -= 5;
      }
    }

    // CHECK 9: Buttons Validation
    if (buttons.length > 0) {
      const buttonComponent = buttons[0];
      if (buttonComponent.buttons && buttonComponent.buttons.length <= 3) {
        validation.passedChecks.push('Button count is within limits (maximum 3)');
      } else {
        validation.errors.push('Maximum 3 buttons allowed per template');
        validation.score -= 10;
      }

      // Check button text length
      buttonComponent.buttons?.forEach((button, idx) => {
        if (button.text && button.text.length > 25) {
          validation.warnings.push(`Button ${idx + 1} text exceeds recommended 25 character limit`);
          validation.score -= 3;
        }
      });
    }

    // CHECK 10: Language Appropriateness
    const language = template.language || 'en';
    const languageSpecificChecks = {
      'en': {
        greeting: ['hi', 'hello', 'dear', 'greetings'],
        closing: ['thanks', 'regards', 'sincerely', 'best']
      }
    };

    if (languageSpecificChecks[language]) {
      const hasGreeting = languageSpecificChecks[language].greeting.some(word => 
        bodyText.toLowerCase().includes(word)
      );
      if (hasGreeting) {
        validation.passedChecks.push('Template includes appropriate greeting');
      } else {
        validation.warnings.push('Consider adding a greeting (Hi, Hello, Dear, etc.)');
        validation.score -= 2;
      }
    }

    // CHECK 11: Category-specific validation
    if (template.category === 'MARKETING') {
      if (!bodyText.toLowerCase().includes('opt out') && !bodyText.toLowerCase().includes('stop')) {
        validation.warnings.push('Marketing messages should include opt-out instructions');
        validation.score -= 5;
      } else {
        validation.passedChecks.push('Opt-out instructions included');
      }
    }

    // CHECK 12: Business name consistency
    if (template.businessId) {
      const Business = require('../../../core/database/models/Business');
      const business = await Business.findById(template.businessId);
      if (business && business.name) {
        if (bodyText.toLowerCase().includes(business.name.toLowerCase())) {
          validation.passedChecks.push('Business name is mentioned in template');
        } else {
          validation.warnings.push('Consider mentioning your business name for brand recognition');
          validation.score -= 3;
        }
      }
    }

    // Final score and recommendation
    validation.score = Math.max(0, validation.score);
    validation.submissionRecommended = validation.score >= 70 && validation.errors.length === 0;

    // Generate recommendation message
    if (validation.score >= 90) {
      validation.recommendation = 'Excellent! Your template has a high chance of approval.';
      validation.confidence = 'HIGH';
    } else if (validation.score >= 70) {
      validation.recommendation = 'Good template. Address warnings to improve approval chances.';
      validation.confidence = 'MEDIUM';
    } else if (validation.score >= 50) {
      validation.recommendation = 'Template needs improvement. Fix errors before submitting.';
      validation.confidence = 'LOW';
    } else {
      validation.recommendation = 'Template has significant issues. Please review and revise.';
      validation.confidence = 'VERY_LOW';
    }

    // Update template validation field
    template.validation = validation;
    await template.save();

    res.json({
      success: true,
      validation,
      template: {
        id: template._id,
        name: template.name,
        status: template.status
      }
    });

  } catch (error) {
    console.error('Error analyzing template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze template',
      error: error.message
    });
  }
});

/**
 * GET /rejection-patterns - Get common rejection patterns across all templates
 */
router.get('/rejection-patterns', async (req, res) => {
  try {
    const templates = await Template.find({
      businessId: req.businessId,
      'rejectionHistory.0': { $exists: true }
    });

    const patterns = {
      totalRejectedTemplates: templates.length,
      byCategory: {},
      commonReasons: {},
      recentRejections: []
    };

    templates.forEach(template => {
      template.rejectionHistory.forEach(rejection => {
        // Count by category
        const category = rejection.category || 'OTHER';
        patterns.byCategory[category] = (patterns.byCategory[category] || 0) + 1;

        // Count by reason
        const reason = rejection.reason || 'Unknown';
        if (!patterns.commonReasons[reason]) {
          patterns.commonReasons[reason] = {
            count: 0,
            examples: []
          };
        }
        patterns.commonReasons[reason].count++;
        if (patterns.commonReasons[reason].examples.length < 3) {
          patterns.commonReasons[reason].examples.push(template.name);
        }

        // Collect recent rejections
        if (rejection.rejectedAt) {
          patterns.recentRejections.push({
            templateName: template.name,
            reason: rejection.reason,
            category: rejection.category,
            rejectedAt: rejection.rejectedAt
          });
        }
      });
    });

    // Sort recent rejections by date
    patterns.recentRejections.sort((a, b) => 
      new Date(b.rejectedAt) - new Date(a.rejectedAt)
    );
    patterns.recentRejections = patterns.recentRejections.slice(0, 10);

    // Generate insights
    patterns.insights = [];
    
    const mostCommonCategory = Object.entries(patterns.byCategory)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (mostCommonCategory) {
      patterns.insights.push({
        type: 'CATEGORY',
        message: `Most rejections are due to ${mostCommonCategory[0]} (${mostCommonCategory[1]} templates)`,
        recommendation: getCategoryRecommendation(mostCommonCategory[0])
      });
    }

    const mostCommonReason = Object.entries(patterns.commonReasons)
      .sort((a, b) => b[1].count - a[1].count)[0];
    
    if (mostCommonReason) {
      patterns.insights.push({
        type: 'REASON',
        message: `Most common reason: "${mostCommonReason[0]}" (${mostCommonReason[1].count} times)`,
        recommendation: getReasonRecommendation(mostCommonReason[0])
      });
    }

    res.json({
      success: true,
      patterns
    });

  } catch (error) {
    console.error('Error getting rejection patterns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get rejection patterns',
      error: error.message
    });
  }
});

// Helper function: Get category-specific recommendation
function getCategoryRecommendation(category) {
  const recommendations = {
    'POLICY_VIOLATION': 'Review WhatsApp Business Policy carefully. Avoid prohibited content like adult material, weapons, or misleading claims.',
    'CONTENT_ISSUE': 'Ensure your message content is clear, professional, and provides value. Avoid spam-like language.',
    'FORMAT_ERROR': 'Check template formatting: proper variable syntax {{1}}, correct character limits, valid button URLs.',
    'OTHER': 'Review recent rejection feedback carefully and address specific issues mentioned.'
  };
  return recommendations[category] || 'Review WhatsApp template guidelines and improve content quality.';
}

// Helper function: Get reason-specific recommendation
function getReasonRecommendation(reason) {
  const lowerReason = reason.toLowerCase();
  
  if (lowerReason.includes('policy')) {
    return 'Ensure compliance with WhatsApp Business Policy. Avoid prohibited content and misleading claims.';
  } else if (lowerReason.includes('spam')) {
    return 'Remove spam indicators: excessive caps, exclamation marks, urgent language, clickbait phrases.';
  } else if (lowerReason.includes('variable') || lowerReason.includes('format')) {
    return 'Fix variable formatting: use {{1}}, {{2}} syntax, ensure sequential numbering, check character limits.';
  } else if (lowerReason.includes('content')) {
    return 'Improve content quality: be specific, provide value, use professional language, include opt-out for marketing.';
  }
  
  return 'Review rejection feedback and make necessary corrections before resubmitting.';
}

module.exports = router;
