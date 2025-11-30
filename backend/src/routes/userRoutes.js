const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUsersByRole
} = require('../controllers/userController');

const { authenticate, authorize, authorizeOwnerOrElevated } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Validation rules
const createUserValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('role')
    .isIn(['customer', 'employee', 'manager', 'admin'])
    .withMessage('Invalid role'),
  handleValidationErrors
];

// All routes require authentication
router.use(authenticate);

// Get all users (managers and admins only)
router.get('/', authorize('manager', 'admin'), getAllUsers);

// Get users by role (managers and admins only)
router.get('/role/:role', authorize('manager', 'admin'), getUsersByRole);

// Get user by ID (owner or elevated privileges)
router.get('/:id', authorizeOwnerOrElevated, getUserById);

// Create user (managers and admins only)
router.post('/', authorize('manager', 'admin'), createUserValidation, createUser);

// Update user (managers and admins only)
router.put('/:id', authorize('manager', 'admin'), updateUser);

// Delete user (admins only)
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
