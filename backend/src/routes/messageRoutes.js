const express = require('express');
const router = express.Router();

const {
  getMessages,
  getMessageById,
  sendMessage,
  markAsRead,
  deleteMessage,
  getUnreadCount
} = require('../controllers/messageController');

const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get unread count
router.get('/unread/count', getUnreadCount);

// Get all messages
router.get('/', getMessages);

// Get message by ID
router.get('/:id', getMessageById);

// Send message
router.post('/', sendMessage);

// Mark as read
router.put('/:id/read', markAsRead);

// Delete message
router.delete('/:id', deleteMessage);

module.exports = router;
