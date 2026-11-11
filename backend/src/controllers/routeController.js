const { Route, RouteCustomer, Truck, User, TruckAssignment, Job } = require('../models');
const { Op } = require('sequelize');
const { localDate } = require('../utils/dates');

const STOP_ORDER = [{ model: RouteCustomer, as: 'customers' }, 'orderIndex', 'ASC'];

/**
 * @route   GET /api/routes
 * @desc    Get all routes
 * @access  Private (Employee, Manager, Admin)
 */
const getAllRoutes = async (req, res, next) => {
  try {
    const { status, date, truckId, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (date) where.scheduledDate = date;
    if (truckId) where.truckId = truckId;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: routes } = await Route.findAndCountAll({
      where,
      include: [
        {
          model: Truck,
          as: 'truck',
          attributes: ['id', 'name', 'licensePlate']
        },
        {
          model: RouteCustomer,
          as: 'customers',
          include: [
            {
              model: User,
              as: 'customer',
              attributes: ['id', 'firstName', 'lastName', 'propertyAddress']
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset,
      distinct: true,
      order: [['scheduledDate', 'DESC'], ['startTime', 'ASC'], STOP_ORDER]
    });

    res.status(200).json({
      success: true,
      data: {
        routes,
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
 * @route   GET /api/routes/:id
 * @desc    Get route by ID
 * @access  Private
 */
const getRouteById = async (req, res, next) => {
  try {
    const route = await Route.findByPk(req.params.id, {
      include: [
        {
          model: Truck,
          as: 'truck',
          attributes: ['id', 'name', 'licensePlate', 'make', 'model'],
          include: [
            {
              model: TruckAssignment,
              as: 'assignments',
              where: { isActive: true },
              required: false,
              include: [
                {
                  model: User,
                  as: 'employee',
                  attributes: ['id', 'firstName', 'lastName', 'phone']
                }
              ]
            }
          ]
        },
        {
          model: RouteCustomer,
          as: 'customers',
          include: [
            {
              model: User,
              as: 'customer',
              attributes: ['id', 'firstName', 'lastName', 'propertyAddress', 'phone', 'propertyNotes']
            }
          ]
        }
      ],
      order: [STOP_ORDER]
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { route }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/routes
 * @desc    Create new route
 * @access  Private (Manager, Admin)
 */
const createRoute = async (req, res, next) => {
  try {
    const {
      name,
      description,
      scheduledDate,
      startTime,
      endTime,
      truckId,
      customerIds,
      notes
    } = req.body;

    // Validate truck if provided
    if (truckId) {
      const truck = await Truck.findByPk(truckId);
      if (!truck) {
        return res.status(404).json({
          success: false,
          message: 'Truck not found'
        });
      }
    }

    const route = await Route.create({
      name,
      description: description || null,
      scheduledDate,
      startTime: startTime || null,
      endTime: endTime || null,
      truckId: truckId || null,
      notes: notes || null
    });

    // Add customers to route if provided
    if (customerIds && customerIds.length > 0) {
      const routeCustomers = customerIds.map((customerId, index) => ({
        routeId: route.id,
        customerId,
        orderIndex: index
      }));

      await RouteCustomer.bulkCreate(routeCustomers);
    }

    // Fetch the created route with associations
    const createdRoute = await Route.findByPk(route.id, {
      include: [
        {
          model: Truck,
          as: 'truck'
        },
        {
          model: RouteCustomer,
          as: 'customers',
          include: [
            {
              model: User,
              as: 'customer',
              attributes: ['id', 'firstName', 'lastName', 'propertyAddress']
            }
          ]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Route created successfully',
      data: { route: createdRoute }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/routes/:id
 * @desc    Update route
 * @access  Private (Manager, Admin)
 */
const updateRoute = async (req, res, next) => {
  try {
    const route = await Route.findByPk(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    const {
      name,
      description,
      scheduledDate,
      startTime,
      endTime,
      status,
      truckId,
      notes,
      actualStartTime,
      actualEndTime
    } = req.body;

    // Moving a route (for example a weather delay) moves its unfinished jobs with it.
    if (scheduledDate && scheduledDate !== route.scheduledDate) {
      await Job.update(
        { scheduledDate },
        { where: { routeId: route.id, status: { [Op.in]: ['pending', 'in_progress'] } } }
      );
    }

    await route.update({
      name: name || route.name,
      description: description !== undefined ? description : route.description,
      scheduledDate: scheduledDate || route.scheduledDate,
      startTime: startTime !== undefined ? startTime : route.startTime,
      endTime: endTime !== undefined ? endTime : route.endTime,
      status: status || route.status,
      truckId: truckId !== undefined ? truckId : route.truckId,
      notes: notes !== undefined ? notes : route.notes,
      actualStartTime: actualStartTime !== undefined ? actualStartTime : route.actualStartTime,
      actualEndTime: actualEndTime !== undefined ? actualEndTime : route.actualEndTime
    });

    res.status(200).json({
      success: true,
      message: 'Route updated successfully',
      data: { route }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/routes/:id
 * @desc    Delete route
 * @access  Private (Admin)
 */
const deleteRoute = async (req, res, next) => {
  try {
    const route = await Route.findByPk(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Delete associated route customers
    await RouteCustomer.destroy({ where: { routeId: route.id } });

    await route.destroy();

    res.status(200).json({
      success: true,
      message: 'Route deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/routes/:id/customers
 * @desc    Add customers to route
 * @access  Private (Manager, Admin)
 */
const addCustomersToRoute = async (req, res, next) => {
  try {
    const { customerIds } = req.body;
    const routeId = req.params.id;

    const route = await Route.findByPk(routeId);
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Get current max orderIndex
    const maxOrder = await RouteCustomer.max('orderIndex', {
      where: { routeId }
    }) || 0;

    // Create route customers
    const routeCustomers = customerIds.map((customerId, index) => ({
      routeId,
      customerId,
      orderIndex: maxOrder + index + 1
    }));

    await RouteCustomer.bulkCreate(routeCustomers);

    res.status(201).json({
      success: true,
      message: 'Customers added to route successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/routes/:id/customers/:customerId
 * @desc    Update customer status on route
 * @access  Private (Employee, Manager, Admin)
 */
const updateRouteCustomerStatus = async (req, res, next) => {
  try {
    const { routeId, customerId } = req.params;
    const { status, actualArrival, actualDeparture, servicesPerformed, notes } = req.body;

    const routeCustomer = await RouteCustomer.findOne({
      where: { routeId, customerId }
    });

    if (!routeCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found on this route'
      });
    }

    // Arrival and departure are stamped automatically when a crew starts and finishes a stop.
    const arrival = actualArrival !== undefined
      ? actualArrival
      : routeCustomer.actualArrival || (['in_progress', 'completed'].includes(status) ? new Date() : null);
    const departure = actualDeparture !== undefined
      ? actualDeparture
      : routeCustomer.actualDeparture || (status === 'completed' ? new Date() : null);

    await routeCustomer.update({
      status: status || routeCustomer.status,
      actualArrival: arrival,
      actualDeparture: departure,
      servicesPerformed: servicesPerformed !== undefined ? servicesPerformed : routeCustomer.servicesPerformed,
      notes: notes !== undefined ? notes : routeCustomer.notes
    });

    res.status(200).json({
      success: true,
      message: 'Customer status updated successfully',
      data: { routeCustomer }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/routes/today/my-route
 * @desc    Get today's route for current employee
 * @access  Private (Employee)
 */
const getMyTodayRoute = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = localDate();

    // Find truck assignment for today
    const assignment = await TruckAssignment.findOne({
      where: {
        employeeId: userId,
        assignedDate: today,
        isActive: true
      }
    });

    if (!assignment) {
      return res.status(200).json({
        success: true,
        data: { route: null },
        message: 'No truck assignment for today'
      });
    }

    // Find route for this truck
    const route = await Route.findOne({
      where: {
        truckId: assignment.truckId,
        scheduledDate: today
      },
      include: [
        {
          model: Truck,
          as: 'truck'
        },
        {
          model: RouteCustomer,
          as: 'customers',
          include: [
            {
              model: User,
              as: 'customer',
              attributes: ['id', 'firstName', 'lastName', 'propertyAddress', 'phone', 'propertyNotes']
            }
          ]
        }
      ],
      order: [STOP_ORDER]
    });

    res.status(200).json({
      success: true,
      data: { route }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/routes/:id/order
 * @desc    Set the order stops are visited in
 * @access  Private (Manager, Admin)
 */
const reorderRouteCustomers = async (req, res, next) => {
  try {
    const { customerIds } = req.body;
    if (!Array.isArray(customerIds)) {
      return res.status(400).json({ success: false, message: 'customerIds must be an array' });
    }
    await Promise.all(
      customerIds.map((customerId, index) =>
        RouteCustomer.update({ orderIndex: index }, { where: { routeId: req.params.id, customerId } })
      )
    );
    res.status(200).json({ success: true, message: 'Stop order updated' });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/routes/:routeId/customers/:customerId
 * @desc    Remove a stop from a route
 * @access  Private (Manager, Admin)
 */
const removeCustomerFromRoute = async (req, res, next) => {
  try {
    const { routeId, customerId } = req.params;
    const removed = await RouteCustomer.destroy({ where: { routeId, customerId } });
    if (!removed) {
      return res.status(404).json({ success: false, message: 'Customer not found on this route' });
    }
    res.status(200).json({ success: true, message: 'Stop removed' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  reorderRouteCustomers,
  removeCustomerFromRoute,
  getAllRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
  addCustomersToRoute,
  updateRouteCustomerStatus,
  getMyTodayRoute
};
