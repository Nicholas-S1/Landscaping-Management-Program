const { Message, User } = require('../models');
const { Op } = require('sequelize');

/**
 * @route   GET /api/messages
 * @desc    Get messages (inbox/sent)
 * @access  Private
 */
const getMessages = async (req, res, next) => {
  try {
    const { type = 'inbox', isRead, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    const where = {};

    if (type === 'inbox') {
      where.recipientId = userId;
    } else if (type === 'sent') {
      where.senderId = userId;
    }

    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: messages } = await Message.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: User,
          as: 'relatedCustomer',
          attributes: ['id', 'firstName', 'lastName', 'propertyAddress'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/messages/:id
 * @desc    Get message by ID
 * @access  Private
 */
const getMessageById = async (req, res, next) => {
  try {
    const message = await Message.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: User,
          as: 'relatedCustomer',
          attributes: ['id', 'firstName', 'lastName', 'propertyAddress'],
          required: false
        }
      ]
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is sender or recipient
    if (message.senderId !== req.user.id && message.recipientId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Mark as read if recipient is viewing
    if (message.recipientId === req.user.id && !message.isRead) {
      await message.update({
        isRead: true,
        readAt: new Date()
      });
    }

    res.status(200).json({
      success: true,
      data: { message }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/messages
 * @desc    Send a message
 * @access  Private
 */
const sendMessage = async (req, res, next) => {
  try {
    const { recipientId, subject, content, relatedCustomerId, attachments } = req.body;

    // Validate recipient exists
    const recipient = await User.findByPk(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    const message = await Message.create({
      senderId: req.user.id,
      recipientId,
      subject: subject || null,
      content,
      relatedCustomerId: relatedCustomerId || null,
      attachments: attachments || null
    });

    // Fetch the created message with associations
    const createdMessage = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: createdMessage }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/messages/:id/read
 * @desc    Mark message as read
 * @access  Private
 */
const markAsRead = async (req, res, next) => {
  try {
    const message = await Message.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Only recipient can mark as read
    if (message.recipientId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the recipient can mark this message as read'
      });
    }

    await message.update({
      isRead: true,
      readAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Message marked as read',
      data: { message }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/messages/:id
 * @desc    Delete message
 * @access  Private
 */
const deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Only sender or recipient can delete
    if (message.senderId !== req.user.id && message.recipientId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await message.destroy();

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/messages/unread/count
 * @desc    Get unread message count
 * @access  Private
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Message.count({
      where: {
        recipientId: req.user.id,
        isRead: false
      }
    });

    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMessages,
  getMessageById,
  sendMessage,
  markAsRead,
  deleteMessage,
  getUnreadCount
};
