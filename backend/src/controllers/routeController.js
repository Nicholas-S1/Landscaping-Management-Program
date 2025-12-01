const { Route, RouteCustomer, Truck, User, TruckAssignment } = require('../models');
const { Op } = require('sequelize');

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
      order: [['scheduledDate', 'DESC'], ['startTime', 'ASC']]
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
          ],
          order: [['orderIndex', 'ASC']]
        }
      ]
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

    await routeCustomer.update({
      status: status || routeCustomer.status,
      actualArrival: actualArrival !== undefined ? actualArrival : routeCustomer.actualArrival,
      actualDeparture: actualDeparture !== undefined ? actualDeparture : routeCustomer.actualDeparture,
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
    const today = new Date().toISOString().split('T')[0];

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
          ],
          order: [['orderIndex', 'ASC']]
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: { route }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
  addCustomersToRoute,
  updateRouteCustomerStatus,
  getMyTodayRoute
};
