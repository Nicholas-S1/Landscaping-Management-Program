const User = require('../models/User');
const { Op } = require('sequelize');

/**
 * @route   GET /api/users
 * @desc    Get all users (with filtering and pagination)
 * @access  Private (Manager, Admin)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 10, isActive } = req.query;

    // Build where clause
    const where = {};

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Query users
    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpire'] },
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: {
        users,
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
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpire'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/users
 * @desc    Create new user (Manager/Admin only)
 * @access  Private (Manager, Admin)
 */
const createUser = async (req, res, next) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      address,
      role,
      hourlyRate,
      propertyAddress
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Only admins can create admin accounts
    if (role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create admin accounts'
      });
    }

    // Create user
    const userData = {
      email,
      password,
      firstName,
      lastName,
      phone,
      address,
      role: role || 'customer'
    };

    // Add employee-specific fields
    if (['employee', 'manager'].includes(role)) {
      userData.hourlyRate = hourlyRate;
      userData.hireDate = new Date();
    }

    // Add customer-specific fields
    if (role === 'customer') {
      userData.propertyAddress = propertyAddress;
    }

    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: user.getPublicProfile() }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Manager, Admin)
 */
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const {
      firstName,
      lastName,
      phone,
      address,
      role,
      hourlyRate,
      isActive,
      propertyAddress,
      propertyNotes
    } = req.body;

    // Only admins can change roles or modify admin accounts
    if ((role && role !== user.role) || user.role === 'admin') {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can change user roles or modify admin accounts'
        });
      }
    }

    const updateData = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Employee-specific updates
    if (['employee', 'manager'].includes(user.role)) {
      if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate;
    }

    // Customer-specific updates
    if (user.role === 'customer') {
      if (propertyAddress !== undefined) updateData.propertyAddress = propertyAddress;
      if (propertyNotes !== undefined) updateData.propertyNotes = propertyNotes;
    }

    await user.update(updateData);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user: user.getPublicProfile() }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete - set isActive to false)
 * @access  Private (Admin only)
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting yourself
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Soft delete
    await user.update({ isActive: false });

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/users/role/:role
 * @desc    Get users by role
 * @access  Private (Manager, Admin)
 */
const getUsersByRole = async (req, res, next) => {
  try {
    const { role } = req.params;
    const validRoles = ['customer', 'employee', 'manager', 'admin'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const users = await User.findAll({
      where: { role, isActive: true },
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpire'] },
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: { users, count: users.length }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUsersByRole
};
