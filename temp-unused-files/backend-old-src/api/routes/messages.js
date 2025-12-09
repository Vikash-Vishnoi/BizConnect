const express = require('express');
const router = express.Router();

// Message routes
router.use('/inbox', require('./messages/messageRoutes'));
router.use('/inbox/conversations', require('./messages/conversationRoutes'));
router.use('/inbox/interactive', require('./messages/interactiveMessageRoutes'));
router.use('/inbox/location', require('./messages/locationRoutes'));
router.use('/inbox/window', require('./messages/conversationWindowRoutes'));
router.use('/templates', require('./messages/index'));
router.use('/templates/compliance', require('./messages/complianceRoutes'));
router.use('/templates/rejection', require('./messages/templateRejectionRoutes'));
router.use('/reactions', require('./messages/index'));
router.use('/saved-replies', require('./messages/index'));

module.exports = router;
