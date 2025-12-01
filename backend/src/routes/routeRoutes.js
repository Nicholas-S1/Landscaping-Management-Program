const express = require('express');
const router = express.Router();

const {
  getAllRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
  addCustomersToRoute,
  updateRouteCustomerStatus,
  getMyTodayRoute
} = require('../controllers/routeController');

const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get today's route for current employee
router.get('/today/my-route', authorize('employee', 'manager', 'admin'), getMyTodayRoute);

// Get all routes
router.get('/', getAllRoutes);

// Get route by ID
router.get('/:id', getRouteById);

// Create route (manager, admin only)
router.post('/', authorize('manager', 'admin'), createRoute);

// Update route (manager, admin only)
router.put('/:id', authorize('manager', 'admin'), updateRoute);

// Delete route (admin only)
router.delete('/:id', authorize('admin'), deleteRoute);

// Add customers to route (manager, admin only)
router.post('/:id/customers', authorize('manager', 'admin'), addCustomersToRoute);

// Update customer status on route
router.put('/:routeId/customers/:customerId', authorize('employee', 'manager', 'admin'), updateRouteCustomerStatus);

module.exports = router;
