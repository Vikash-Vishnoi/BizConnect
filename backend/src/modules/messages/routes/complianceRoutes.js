/**
 * Template Compliance Check Routes
 * @module routes/templates/compliance
 * 
 * Validates message templates against WhatsApp Business Policy
 * Checks templates BEFORE submission to reduce rejection rate
 */

const express = require('express');
const router = express.Router();
const Template = require('../../../core/database/models/Template');
const { authenticate: auth } = require('../../../core/middlewares/auth');
const { requireBusiness, requirePermission, requireBusinessPermission, requireManager, requireOwnerOrAdmin } = require('../../../core/middlewares/authorization');
const { asyncHandler } = require('../../../core/middlewares/errorHandler');
const { ValidationError, NotFoundError } = require('../../../common/helpers/errorCodes');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');

// Constants for compliance checking
const TEMPLATE_MIN_COMPLIANCE_SCORE = 70; // Minimum score to pass compliance (0-100)
const MAX_TEMPLATE_NAME_LENGTH = 512; // WhatsApp limit
const MAX_HEADER_LENGTH = 60; // WhatsApp header character limit
const MAX_BODY_LENGTH = 1024; // WhatsApp body character limit
const MAX_FOOTER_LENGTH = 60; // WhatsApp footer character limit
const MAX_BUTTON_TEXT_LENGTH = 25; // WhatsApp button text limit
const MAX_BUTTONS_PER_TEMPLATE = 10; // Maximum buttons allowed
   
/**
 * @route   POST /api/templates/validate
 * @desc    Validate template before submission (comprehensive check)
 * @access  Private - Manager+ only
 */
router.post('/validate', auth, requireBusiness, requireManager, requireOwnerOrAdmin, requireBusinessPermission('manage', 'templates'), asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { templateId, name, category, language, components } = req.body;

  let template;
  
  // Check if validating existing template or new template data
  if (templateId) {
    template = await Template.findOne({
      _id: templateId,
      businessId: req.businessId
    });

    if (!template) {
      throw new NotFoundError('Template not found');
    }
  } else if (name && category && language && components) {
    // Validate new template data without saving
    template = {
      name,
      category,
      language,
      components,
      businessId: req.businessId
    };
  } else {
    throw new ValidationError('Either templateId or template data (name, category, language, components) is required');
  }

  // Run comprehensive compliance checks
  const complianceResult = await performComplianceCheck(template, req.business);

  // Update template with compliance results if it's an existing template
  if (templateId && template.save) {
    template.complianceCheck = {
      passed: complianceResult.passed,
      checks: complianceResult.checks,
      lastCheckedAt: new Date()
    };
    await template.save();
  }

  const minComplianceScore = TEMPLATE_MIN_COMPLIANCE_SCORE;
  const processingTime = Date.now() - startTime;
  
  logger.info('Template compliance check completed', {
    templateId: templateId || null,
    businessId: req.businessId?.toString(),
    passed: complianceResult.passed,
    score: complianceResult.score,
    processingTime
  });

  return res.success({
    passed: complianceResult.passed,
    score: complianceResult.score,
    checks: complianceResult.checks,
    summary: complianceResult.summary,
    recommendations: complianceResult.recommendations,
    canSubmit: complianceResult.passed && complianceResult.score >= minComplianceScore,
    templateId: templateId || null,
    processingTime,
    checkedAt: new Date()
  }, complianceResult.passed ? 'Template passed compliance check' : 'Template failed compliance check');
}));

/**
 * @route   GET /api/templates/compliance-rules
 * @desc    Get WhatsApp compliance rules and guidelines
 * @access  Private - All authenticated users
 */
router.get('/compliance-rules', auth, requireBusiness, requireOwnerOrAdmin, asyncHandler(async (req, res) => {
  const rules = {
    categories: {
      MARKETING: {
        description: 'Promotional messages, offers, updates about products/services',
        requirements: [
          'Must include opt-out instructions (e.g., "Reply STOP to unsubscribe")',
          'Cannot be sent after user opt-out',
          'Must be relevant to your business',
          'Cannot contain misleading claims'
        ],
          restrictions: [
            'No get-rich-quick schemes',
            'No adult content or explicit material',
            'No weapons or controlled substances',
            'No gambling or betting promotions',
            'No cryptocurrency investments'
          ],
          bestPractices: [
            'Use clear, concise language',
            'Include business name',
            'Personalize with customer name',
            'Provide clear call-to-action',
            'Respect 24-hour messaging window'
          ]
        },
        UTILITY: {
          description: 'Transactional messages, account updates, notifications',
          requirements: [
            'Must be transaction-related or account updates',
            'Must be relevant to user\'s interaction with your business',
            'Cannot be promotional in nature',
            'Must be timely and expected'
          ],
          restrictions: [
            'No promotional content disguised as utility',
            'No upselling or cross-selling',
            'No marketing messages'
          ],
          bestPractices: [
            'Include order/transaction numbers',
            'Provide specific details',
            'Include relevant dates and amounts',
            'Keep messages brief and informative'
          ]
        },
        AUTHENTICATION: {
          description: 'One-time passwords, verification codes',
          requirements: [
            'Must be for authentication purposes only',
            'Must include security disclaimer',
            'Code should have expiration time',
            'Must be triggered by user action'
          ],
          restrictions: [
            'Cannot include promotional content',
            'Cannot be used for marketing',
            'Cannot include URLs except callback URL',
            'Cannot include buttons'
          ],
          bestPractices: [
            'Use security button for OTP autofill',
            'Include expiration time (e.g., "Valid for 10 minutes")',
            'Warn against sharing code',
            'Use standard format for codes'
          ]
        }
      },
      
      contentPolicies: {
        prohibited: [
          {
            category: 'Adult Content',
            description: 'Sexually explicit content, pornography, adult services',
            severity: 'critical'
          },
          {
            category: 'Drugs & Substances',
            description: 'Illegal drugs, cannabis, prescription drugs, drug paraphernalia',
            severity: 'critical'
          },
          {
            category: 'Weapons',
            description: 'Firearms, ammunition, explosives, weapon sales',
            severity: 'critical'
          },
          {
            category: 'Gambling',
            description: 'Online gambling, betting, casinos, lotteries',
            severity: 'critical'
          },
          {
            category: 'Financial Schemes',
            description: 'Get-rich-quick schemes, pyramid schemes, multi-level marketing',
            severity: 'high'
          },
          {
            category: 'Misleading Content',
            description: 'False claims, fake news, clickbait, deceptive practices',
            severity: 'high'
          },
          {
            category: 'Hate Speech',
            description: 'Discriminatory content based on race, religion, gender, etc.',
            severity: 'critical'
          }
        ],
        
        spam: [
          'Excessive use of CAPITAL LETTERS',
          'Multiple exclamation marks (!!!)',
          'Repeated characters or words',
          'Urgent language (URGENT!!!, ACT NOW!!!)',
          'Too many emojis',
          'Excessive line breaks or spacing'
        ],
        
        formatting: [
          'Template name: lowercase, numbers, underscores only',
          'Template name: max 512 characters',
          'Body text: 1-1024 characters',
          'Header text: max 60 characters',
          'Footer text: max 60 characters',
          'Buttons: max 3 buttons',
          'Button text: max 25 characters each',
          'Variables: sequential numbering {{1}}, {{2}}, etc.',
          'Variables: max 1024 characters when filled'
        ]
      },
      
      qualityGuidelines: {
        doUse: [
          'Clear, professional language',
          'Proper grammar and spelling',
          'Relevant content for recipients',
          'Accurate information',
          'Proper opt-out mechanisms',
          'Business name in greeting',
          'Call-to-action that matches category',
          'Personalization with variables'
        ],
        
        dontUse: [
          'All caps messages',
          'Excessive punctuation',
          'Clickbait phrases',
          'False urgency',
          'Misleading subject lines',
          'Hidden fees or terms',
          'Aggressive language',
          'Spam trigger words'
        ]
      },
      
      variableGuidelines: {
        rules: [
          'Variables must be sequential: {{1}}, {{2}}, {{3}}',
          'Cannot skip numbers in sequence',
          'Provide examples for all variables',
          'Variable content must match template category',
          'Keep variable names descriptive in backend'
        ],
        
        examples: {
          good: [
            '{{1}}: customer name',
            '{{2}}: order number',
            '{{3}}: delivery date'
          ],
          bad: [
            'Missing {{1}}, starting with {{2}}',
            'Random numbering: {{1}}, {{5}}, {{3}}',
            'No examples provided'
          ]
        }
      },
      
      rejectionReasons: {
        common: [
          {
            reason: 'Prohibited Content',
            description: 'Template contains content that violates WhatsApp policies',
            solution: 'Review content policies and remove prohibited material'
          },
          {
            reason: 'Misleading Information',
            description: 'Template contains false, misleading, or deceptive claims',
            solution: 'Use accurate, truthful statements only'
          },
          {
            reason: 'Spam Indicators',
            description: 'Template contains spam-like characteristics',
            solution: 'Remove excessive caps, punctuation, or urgency words'
          },
          {
            reason: 'Incorrect Category',
            description: 'Template content doesn\'t match selected category',
            solution: 'Ensure category matches actual use case'
          },
          {
            reason: 'Variable Issues',
            description: 'Variables not sequential or missing examples',
            solution: 'Fix variable numbering and provide examples'
          },
          {
            reason: 'Format Violations',
            description: 'Template doesn\'t follow format requirements',
            solution: 'Check character limits and formatting rules'
          },
          {
            reason: 'Missing Opt-Out',
            description: 'Marketing template missing opt-out instructions',
            solution: 'Add opt-out text (e.g., "Reply STOP to unsubscribe")'
          }
        ]
      }
    };

    return res.success({
      rules,
      version: '1.0',
      lastUpdated: '2025-01-15',
      documentation: 'https://developers.facebook.com/docs/whatsapp/message-templates/guidelines'
    }, 'Compliance rules retrieved successfully');
}));

/**
 * Helper: Perform comprehensive compliance check
 */
async function performComplianceCheck(template, business) {
  const checks = [];
  let score = 100;
  const recommendations = [];

  // 1. Template name validation
  const nameCheck = {
    rule: 'Template Name Format',
    passed: true,
    message: '',
    severity: 'error'
  };

  const namePattern = /^[a-z0-9_]+$/;
  if (!template.name || !namePattern.test(template.name)) {
    nameCheck.passed = false;
    nameCheck.message = 'Template name must contain only lowercase letters, numbers, and underscores';
    score -= 15;
  } else if (template.name.length > 512) {
    nameCheck.passed = false;
    nameCheck.message = 'Template name must be 512 characters or less';
    score -= 10;
  } else {
    nameCheck.message = 'Template name format is valid';
  }
  checks.push(nameCheck);

  // 2. Body component validation
  const bodyComponent = template.components?.find(c => c.type === 'BODY');
  const bodyCheck = {
    rule: 'Body Text Content',
    passed: true,
    message: '',
    severity: 'error'
  };

  if (!bodyComponent || !bodyComponent.text) {
    bodyCheck.passed = false;
    bodyCheck.message = 'Body text is required';
    score -= 20;
  } else {
    const bodyText = bodyComponent.text;
    
    if (bodyText.length < 1 || bodyText.length > 1024) {
      bodyCheck.passed = false;
      bodyCheck.message = 'Body text must be between 1 and 1024 characters';
      score -= 15;
    } else {
      bodyCheck.message = `Body text length is valid (${bodyText.length} characters)`;
    }
  }
  checks.push(bodyCheck);

  // 3. Variable validation
  const variableCheck = {
    rule: 'Variable Format',
    passed: true,
    message: '',
    severity: 'error'
  };

  if (bodyComponent && bodyComponent.text) {
    const variableMatches = bodyComponent.text.match(/\{\{(\d+)\}\}/g);
    if (variableMatches) {
      const numbers = variableMatches.map(m => parseInt(m.match(/\d+/)[0]));
      numbers.sort((a, b) => a - b);
      
      // Check sequential
      const isSequential = numbers.every((num, idx) => num === idx + 1);
      if (!isSequential) {
        variableCheck.passed = false;
        variableCheck.message = 'Variables must be sequential ({{1}}, {{2}}, {{3}}, etc.)';
        score -= 10;
      } else {
        variableCheck.message = `Variables are sequential (${numbers.length} variables)`;
      }
    } else {
      variableCheck.message = 'No variables used';
    }
  }
  checks.push(variableCheck);

  // 4. Prohibited content check
  const prohibitedCheck = {
    rule: 'Prohibited Content',
    passed: true,
    message: '',
    severity: 'error'
  };

  const bodyText = bodyComponent?.text?.toLowerCase() || '';
  const prohibitedPatterns = [
    { pattern: /cannabis|marijuana|cbd oil|weed/i, reason: 'Drugs and controlled substances' },
    { pattern: /viagra|cialis|prescription drug|pharmacy/i, reason: 'Pharmaceutical products' },
    { pattern: /get rich quick|make money fast|guaranteed income/i, reason: 'Get-rich-quick schemes' },
    { pattern: /sex|adult content|xxx|porn/i, reason: 'Adult content' },
    { pattern: /weapon|gun|ammunition|firearm/i, reason: 'Weapons-related content' },
    { pattern: /gambling|casino|betting|lottery/i, reason: 'Gambling-related content' },
    { pattern: /crypto invest|bitcoin profit|forex trading/i, reason: 'High-risk investments' },
    { pattern: /click here now|limited time only|act now/i, reason: 'Aggressive urgency', severity: 'warning' }
  ];

  const violations = [];
  for (const { pattern, reason, severity } of prohibitedPatterns) {
    if (pattern.test(bodyText)) {
      violations.push(reason);
      if (severity !== 'warning') {
        prohibitedCheck.passed = false;
        score -= 20;
      } else {
        score -= 5;
      }
    }
  }

  if (violations.length > 0) {
    prohibitedCheck.message = `Potential violations: ${violations.join(', ')}`;
    prohibitedCheck.severity = violations.some(v => !v.includes('urgency')) ? 'error' : 'warning';
  } else {
    prohibitedCheck.message = 'No prohibited content detected';
  }
  checks.push(prohibitedCheck);

  // 5. Spam indicators
  const spamCheck = {
    rule: 'Spam Indicators',
    passed: true,
    message: '',
    severity: 'warning'
  };

  const spamIndicators = [];
  
  // Excessive caps
  const capsRatio = (bodyText.match(/[A-Z]/g) || []).length / bodyText.length;
  if (capsRatio > 0.3) {
    spamIndicators.push('excessive capitalization');
    score -= 5;
  }

  // Repeated punctuation
  if (/!{3,}|\.{4,}|\?{3,}/.test(bodyText)) {
    spamIndicators.push('excessive punctuation');
    score -= 5;
  }

  // Repeated characters
  if (/(.)\1{4,}/.test(bodyText)) {
    spamIndicators.push('repeated characters');
    score -= 5;
  }

  if (spamIndicators.length > 0) {
    spamCheck.passed = false;
    spamCheck.message = `Spam indicators found: ${spamIndicators.join(', ')}`;
  } else {
    spamCheck.message = 'No spam indicators detected';
  }
  checks.push(spamCheck);

  // 6. Category-specific requirements
  const categoryCheck = {
    rule: 'Category Requirements',
    passed: true,
    message: '',
    severity: 'error'
  };

  if (template.category === 'MARKETING') {
    // Check for opt-out instructions
    const hasOptOut = /stop|unsubscribe|opt.?out/i.test(bodyText);
    if (!hasOptOut) {
      categoryCheck.passed = false;
      categoryCheck.message = 'Marketing templates must include opt-out instructions (e.g., "Reply STOP to unsubscribe")';
      score -= 15;
      recommendations.push('Add opt-out instructions to footer');
    } else {
      categoryCheck.message = 'Opt-out instructions found';
    }
  } else if (template.category === 'AUTHENTICATION') {
    // Check that it's not promotional
    const hasPromo = /buy|offer|discount|sale|promotion/i.test(bodyText);
    if (hasPromo) {
      categoryCheck.passed = false;
      categoryCheck.message = 'Authentication templates cannot contain promotional content';
      score -= 20;
    } else {
      categoryCheck.message = 'Authentication template format is correct';
    }
  } else {
    categoryCheck.message = `Category ${template.category} requirements met`;
  }
  checks.push(categoryCheck);

  // 7. Header validation (if present)
  const headerComponent = template.components?.find(c => c.type === 'HEADER');
  if (headerComponent && headerComponent.text) {
    const headerCheck = {
      rule: 'Header Format',
      passed: true,
      message: '',
      severity: 'warning'
    };

    if (headerComponent.text.length > 60) {
      headerCheck.passed = false;
      headerCheck.message = 'Header text must be 60 characters or less';
      score -= 5;
    } else {
      headerCheck.message = 'Header format is valid';
    }
    checks.push(headerCheck);
  }

  // 8. Footer validation (if present)
  const footerComponent = template.components?.find(c => c.type === 'FOOTER');
  if (footerComponent && footerComponent.text) {
    const footerCheck = {
      rule: 'Footer Format',
      passed: true,
      message: '',
      severity: 'warning'
    };

    if (footerComponent.text.length > 60) {
      footerCheck.passed = false;
      footerCheck.message = 'Footer text must be 60 characters or less';
      score -= 5;
    } else {
      footerCheck.message = 'Footer format is valid';
    }
    checks.push(footerCheck);
  }

  // 9. Buttons validation (if present)
  const buttonsComponent = template.components?.find(c => c.type === 'BUTTONS');
  if (buttonsComponent && buttonsComponent.buttons) {
    const buttonsCheck = {
      rule: 'Buttons Format',
      passed: true,
      message: '',
      severity: 'warning'
    };

    if (buttonsComponent.buttons.length > 3) {
      buttonsCheck.passed = false;
      buttonsCheck.message = 'Maximum 3 buttons allowed';
      score -= 5;
    }

    const longButtons = buttonsComponent.buttons.filter(b => b.text && b.text.length > 25);
    if (longButtons.length > 0) {
      buttonsCheck.passed = false;
      buttonsCheck.message = 'Button text must be 25 characters or less';
      score -= 5;
    }

    if (buttonsCheck.passed) {
      buttonsCheck.message = `Buttons format is valid (${buttonsComponent.buttons.length} buttons)`;
    }
    checks.push(buttonsCheck);
  }

  // 10. Business name check (recommended)
  if (business && business.name) {
    const hasBusinessName = bodyText.includes(business.name.toLowerCase());
    if (!hasBusinessName) {
      recommendations.push(`Consider including your business name "${business.name}" for better recognition`);
      score -= 2;
    }
  }

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  // Generate summary
  const errorCount = checks.filter(c => !c.passed && c.severity === 'error').length;
  const warningCount = checks.filter(c => !c.passed && c.severity === 'warning').length;

  const summary = {
    errors: errorCount,
    warnings: warningCount,
    passed: errorCount === 0,
    status: errorCount === 0 ? (warningCount === 0 ? 'excellent' : 'good') : 'needs_work',
    message: errorCount === 0 
      ? 'Template meets all compliance requirements'
      : `Template has ${errorCount} critical issue(s) that must be fixed`
  };

  // Add general recommendations
  if (score < 90) {
    if (spamIndicators.length > 0) {
      recommendations.push('Reduce spam indicators for better deliverability');
    }
    if (template.category === 'MARKETING' && !recommendations.some(r => r.includes('opt-out'))) {
      recommendations.push('Ensure opt-out instructions are clear and easy to understand');
    }
  }

  return {
    passed: errorCount === 0,
    score,
    checks,
    summary,
    recommendations: recommendations.length > 0 ? recommendations : ['Template looks good! Consider testing with a small audience first.']
  };
}

module.exports = router;
