const express = require('express');
const router = express.Router();

const {
  getAllTrucks,
  getTruckById,
  createTruck,
  updateTruck,
  deleteTruck,
  assignEmployeesToTruck,
  getTruckAssignments
} = require('../controllers/truckController');

const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get all trucks (all authenticated users)
router.get('/', getAllTrucks);

// Get truck by ID
router.get('/:id', getTruckById);

// Create truck (manager, admin only)
router.post('/', authorize('manager', 'admin'), createTruck);

// Update truck (manager, admin only)
router.put('/:id', authorize('manager', 'admin'), updateTruck);

// Delete truck (admin only)
router.delete('/:id', authorize('admin'), deleteTruck);

// Assign employees to truck (manager, admin only)
router.post('/:id/assign', authorize('manager', 'admin'), assignEmployeesToTruck);

// Get truck assignments
router.get('/:id/assignments', getTruckAssignments);

module.exports = router;
