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
  reorderRouteCustomers,
  removeCustomerFromRoute,
  getMyTodayRoute
} = require('../controllers/routeController');

const { authenticate, authorize } = require('../middleware/auth');

// Routes list customer addresses, so they are staff only
router.use(authenticate, authorize('employee', 'manager', 'admin'));

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

// Set the stop order (manager, admin only)
router.put('/:id/order', authorize('manager', 'admin'), reorderRouteCustomers);

// Remove a stop (manager, admin only)
router.delete('/:routeId/customers/:customerId', authorize('manager', 'admin'), removeCustomerFromRoute);

// Update customer status on route
router.put('/:routeId/customers/:customerId', authorize('employee', 'manager', 'admin'), updateRouteCustomerStatus);

module.exports = router;
