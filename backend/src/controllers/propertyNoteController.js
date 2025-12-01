const { PropertyNote, User } = require('../models');
const { Op } = require('sequelize');

/**
 * @route   GET /api/property-notes
 * @desc    Get property notes with filters
 * @access  Private
 */
const getPropertyNotes = async (req, res, next) => {
  try {
    const { customerId, noteType, page = 1, limit = 20 } = req.query;

    const where = {};

    // Customers can only see their own notes (non-private)
    if (req.user.role === 'customer') {
      where.customerId = req.user.id;
      where.isPrivate = false;
    } else {
      // Employees/managers can see all notes
      if (customerId) {
        where.customerId = customerId;
      }
    }

    if (noteType) {
      where.noteType = noteType;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: propertyNotes } = await PropertyNote.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'propertyAddress']
        },
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'role']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: {
        propertyNotes,
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
 * @route   GET /api/property-notes/:id
 * @desc    Get property note by ID
 * @access  Private
 */
const getPropertyNoteById = async (req, res, next) => {
  try {
    const propertyNote = await PropertyNote.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'propertyAddress']
        },
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'role']
        }
      ]
    });

    if (!propertyNote) {
      return res.status(404).json({
        success: false,
        message: 'Property note not found'
      });
    }

    // Check permissions
    if (req.user.role === 'customer') {
      if (propertyNote.customerId !== req.user.id || propertyNote.isPrivate) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: { propertyNote }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/property-notes
 * @desc    Create property note
 * @access  Private
 */
const createPropertyNote = async (req, res, next) => {
  try {
    const { customerId, content, noteType, priority, isPrivate, images } = req.body;

    // Customers can only create notes for themselves
    let targetCustomerId = customerId;
    if (req.user.role === 'customer') {
      targetCustomerId = req.user.id;
    }

    // Validate customer exists
    const customer = await User.findByPk(targetCustomerId);
    if (!customer || customer.role !== 'customer') {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    const propertyNote = await PropertyNote.create({
      customerId: targetCustomerId,
      authorId: req.user.id,
      content,
      noteType: noteType || 'general',
      priority: priority || 'medium',
      isPrivate: req.user.role === 'customer' ? false : (isPrivate || false),
      images: images || null
    });

    // Fetch the created note with associations
    const createdNote = await PropertyNote.findByPk(propertyNote.id, {
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'role']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Property note created successfully',
      data: { propertyNote: createdNote }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/property-notes/:id
 * @desc    Update property note
 * @access  Private
 */
const updatePropertyNote = async (req, res, next) => {
  try {
    const propertyNote = await PropertyNote.findByPk(req.params.id);

    if (!propertyNote) {
      return res.status(404).json({
        success: false,
        message: 'Property note not found'
      });
    }

    // Only author or manager/admin can update
    if (propertyNote.authorId !== req.user.id && !['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own notes'
      });
    }

    const { content, noteType, priority, isPrivate, images } = req.body;

    await propertyNote.update({
      content: content || propertyNote.content,
      noteType: noteType || propertyNote.noteType,
      priority: priority || propertyNote.priority,
      isPrivate: isPrivate !== undefined ? isPrivate : propertyNote.isPrivate,
      images: images !== undefined ? images : propertyNote.images
    });

    res.status(200).json({
      success: true,
      message: 'Property note updated successfully',
      data: { propertyNote }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/property-notes/:id
 * @desc    Delete property note
 * @access  Private
 */
const deletePropertyNote = async (req, res, next) => {
  try {
    const propertyNote = await PropertyNote.findByPk(req.params.id);

    if (!propertyNote) {
      return res.status(404).json({
        success: false,
        message: 'Property note not found'
      });
    }

    // Only author or admin can delete
    if (propertyNote.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own notes'
      });
    }

    await propertyNote.destroy();

    res.status(200).json({
      success: true,
      message: 'Property note deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPropertyNotes,
  getPropertyNoteById,
  createPropertyNote,
  updatePropertyNote,
  deletePropertyNote
};
