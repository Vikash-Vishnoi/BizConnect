/**
 * Response Formatter Usage Examples
 * 
 * This file demonstrates how to use the new standardized response helpers
 * across different route scenarios.
 */

// ============================================
// EXAMPLE 1: Success Responses
// ============================================

// Simple success with data
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    return res.success(users, 'Users retrieved successfully');
    // Output: { success: true, message: "Users retrieved successfully", data: [...], timestamp: "..." }
  } catch (error) {
    return res.serverError('Failed to fetch users', error.message);
  }
});

// Success without data
router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    return res.success(null, 'User deleted successfully');
    // Output: { success: true, message: "User deleted successfully", timestamp: "..." }
  } catch (error) {
    return res.serverError('Failed to delete user', error.message);
  }
});

// Success with custom status code
router.post('/users', async (req, res) => {
  try {
    const user = await User.create(req.body);
    return res.created(user, 'User created successfully');
    // Output: 201 status with { success: true, message: "...", data: {...}, timestamp: "..." }
  } catch (error) {
    return res.serverError('Failed to create user', error.message);
  }
});

// ============================================
// EXAMPLE 2: Paginated Responses
// ============================================

router.get('/campaigns', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (page - 1) * limit;
    const campaigns = await Campaign.find()
      .skip(skip)
      .limit(limit);
    
    const total = await Campaign.countDocuments();
    
    return res.paginated(campaigns, page, limit, total, {
      filters: { status: 'active' }, // Optional metadata
      sortBy: 'createdAt'
    });
    
    // Output:
    // {
    //   success: true,
    //   data: [...],
    //   pagination: {
    //     page: 1,
    //     limit: 20,
    //     total: 150,
    //     totalPages: 8,
    //     hasMore: true,
    //     hasPrevious: false
    //   },
    //   meta: { filters: {...}, sortBy: "..." },
    //   timestamp: "..."
    // }
  } catch (error) {
    return res.serverError('Failed to fetch campaigns', error.message);
  }
});

// ============================================
// EXAMPLE 3: Error Responses
// ============================================

// Bad Request (400)
router.post('/contacts', async (req, res) => {
  try {
    const { phoneNumber, name } = req.body;
    
    if (!phoneNumber) {
      return res.badRequest('Phone number is required', {
        field: 'phoneNumber',
        received: undefined
      });
    }
    
    const contact = await Contact.create({ phoneNumber, name });
    return res.created(contact);
  } catch (error) {
    return res.serverError('Failed to create contact', error.message);
  }
});

// Unauthorized (401)
router.get('/admin/users', auth, (req, res) => {
  if (!req.user) {
    return res.unauthorized('Authentication required');
  }
  // ... rest of handler
});

// Forbidden (403)
router.delete('/business/:id', auth, (req, res) => {
  if (req.user.userType !== 'super_admin') {
    return res.forbidden('Only super admins can delete businesses');
  }
  // ... rest of handler
});

// Not Found (404)
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.notFound('User not found');
    }
    
    return res.success(user);
  } catch (error) {
    return res.serverError('Failed to fetch user', error.message);
  }
});

// Server Error (500)
router.get('/analytics', async (req, res) => {
  try {
    const analytics = await Analytics.aggregate([...]);
    return res.success(analytics);
  } catch (error) {
    console.error('Analytics error:', error);
    return res.serverError('Failed to generate analytics', error.message);
    // In production, error.message won't be included in response
  }
});

// ============================================
// EXAMPLE 4: Custom Error with Error Code
// ============================================

router.post('/campaigns/:id/start', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.notFound('Campaign not found');
    }
    
    if (campaign.status !== 'draft') {
      return res.error(
        'Campaign must be in draft status to start',
        400,
        { currentStatus: campaign.status },
        'CAMPAIGN_INVALID_STATUS'
      );
      // Output: 
      // {
      //   success: false,
      //   error: "Campaign must be in draft status to start",
      //   errorCode: "CAMPAIGN_INVALID_STATUS",
      //   timestamp: "..."
      // }
    }
    
    campaign.status = 'active';
    await campaign.save();
    
    return res.success(campaign, 'Campaign started successfully');
  } catch (error) {
    return res.serverError('Failed to start campaign', error.message);
  }
});

// ============================================
// EXAMPLE 5: No Content Response (204)
// ============================================

router.put('/messages/:id/mark-read', async (req, res) => {
  try {
    await Message.findByIdAndUpdate(req.params.id, { read: true });
    return res.noContent(); // 204 with no body
  } catch (error) {
    return res.serverError('Failed to mark message as read', error.message);
  }
});

// ============================================
// MIGRATION GUIDE
// ============================================

// ❌ OLD WAY
router.get('/old-style', async (req, res) => {
  try {
    const data = await Model.find();
    res.status(200).json({
      success: true,
      data,
      message: 'Success'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ NEW WAY
router.get('/new-style', async (req, res) => {
  try {
    const data = await Model.find();
    return res.success(data, 'Success');
  } catch (error) {
    return res.serverError('Operation failed', error.message);
  }
});

// ============================================
// BENEFITS
// ============================================

/*
1. CONSISTENCY
   - All responses follow the same format
   - Frontend can rely on predictable structure
   
2. LESS CODE
   - No need to manually construct response objects
   - Automatic timestamp addition
   - Automatic error logging
   
3. BETTER DX
   - Intellisense/autocomplete for response methods
   - Self-documenting (method names indicate status codes)
   - Less chance of mistakes
   
4. SECURITY
   - Error details automatically hidden in production
   - Consistent error handling prevents information leakage
   
5. MAINTAINABILITY
   - Change response format in one place (responseFormatter.js)
   - All routes automatically updated
*/

// ============================================
// AVAILABLE METHODS
// ============================================

/*
res.success(data, message, statusCode)
  → Default 200, can customize

res.created(data, message)
  → 201 Created

res.noContent()
  → 204 No Content

res.badRequest(message, details)
  → 400 Bad Request

res.unauthorized(message)
  → 401 Unauthorized

res.forbidden(message)
  → 403 Forbidden

res.notFound(message)
  → 404 Not Found

res.serverError(message, details)
  → 500 Server Error

res.error(message, statusCode, details, errorCode)
  → Custom error with any status code

res.paginated(items, page, limit, total, meta)
  → Paginated data with pagination metadata
*/

module.exports = { 
  // This file is for documentation only
  // The actual middleware is in src/core/middlewares/responseFormatter.js
};
