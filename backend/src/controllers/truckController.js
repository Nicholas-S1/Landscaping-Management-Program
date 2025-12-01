const { Truck, TruckAssignment, User } = require('../models');
const { Op } = require('sequelize');

/**
 * @route   GET /api/trucks
 * @desc    Get all trucks
 * @access  Private (Employee, Manager, Admin)
 */
const getAllTrucks = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const where = {};
    if (status) where.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: trucks } = await Truck.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: {
        trucks,
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
 * @route   GET /api/trucks/:id
 * @desc    Get truck by ID
 * @access  Private
 */
const getTruckById = async (req, res, next) => {
  try {
    const truck = await Truck.findByPk(req.params.id, {
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
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
            }
          ]
        }
      ]
    });

    if (!truck) {
      return res.status(404).json({
        success: false,
        message: 'Truck not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { truck }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/trucks
 * @desc    Create new truck
 * @access  Private (Manager, Admin)
 */
const createTruck = async (req, res, next) => {
  try {
    const {
      name,
      licensePlate,
      make,
      model,
      year,
      vin,
      capacity,
      currentMileage,
      notes
    } = req.body;

    const truck = await Truck.create({
      name,
      licensePlate,
      make,
      model,
      year,
      vin,
      capacity,
      currentMileage,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Truck created successfully',
      data: { truck }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/trucks/:id
 * @desc    Update truck
 * @access  Private (Manager, Admin)
 */
const updateTruck = async (req, res, next) => {
  try {
    const truck = await Truck.findByPk(req.params.id);

    if (!truck) {
      return res.status(404).json({
        success: false,
        message: 'Truck not found'
      });
    }

    const {
      name,
      licensePlate,
      make,
      model,
      year,
      vin,
      capacity,
      status,
      currentMileage,
      lastMaintenanceDate,
      nextMaintenanceDate,
      notes
    } = req.body;

    await truck.update({
      name: name || truck.name,
      licensePlate: licensePlate !== undefined ? licensePlate : truck.licensePlate,
      make: make || truck.make,
      model: model || truck.model,
      year: year || truck.year,
      vin: vin || truck.vin,
      capacity: capacity || truck.capacity,
      status: status || truck.status,
      currentMileage: currentMileage !== undefined ? currentMileage : truck.currentMileage,
      lastMaintenanceDate: lastMaintenanceDate || truck.lastMaintenanceDate,
      nextMaintenanceDate: nextMaintenanceDate || truck.nextMaintenanceDate,
      notes: notes !== undefined ? notes : truck.notes
    });

    res.status(200).json({
      success: true,
      message: 'Truck updated successfully',
      data: { truck }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/trucks/:id
 * @desc    Delete truck (set to retired)
 * @access  Private (Admin)
 */
const deleteTruck = async (req, res, next) => {
  try {
    const truck = await Truck.findByPk(req.params.id);

    if (!truck) {
      return res.status(404).json({
        success: false,
        message: 'Truck not found'
      });
    }

    await truck.update({ status: 'retired' });

    res.status(200).json({
      success: true,
      message: 'Truck retired successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/trucks/:id/assign
 * @desc    Assign employees to truck
 * @access  Private (Manager, Admin)
 */
const assignEmployeesToTruck = async (req, res, next) => {
  try {
    const { employeeIds, date, roles } = req.body;
    const truckId = req.params.id;

    const truck = await Truck.findByPk(truckId);
    if (!truck) {
      return res.status(404).json({
        success: false,
        message: 'Truck not found'
      });
    }

    // Deactivate existing assignments for this truck on this date
    await TruckAssignment.update(
      { isActive: false },
      {
        where: {
          truckId,
          assignedDate: date || new Date().toISOString().split('T')[0]
        }
      }
    );

    // Create new assignments
    const assignments = await Promise.all(
      employeeIds.map((employeeId, index) =>
        TruckAssignment.create({
          truckId,
          employeeId,
          assignedDate: date || new Date().toISOString().split('T')[0],
          role: roles ? roles[index] : 'crew',
          isActive: true
        })
      )
    );

    res.status(201).json({
      success: true,
      message: 'Employees assigned successfully',
      data: { assignments }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/trucks/:id/assignments
 * @desc    Get truck assignments
 * @access  Private
 */
const getTruckAssignments = async (req, res, next) => {
  try {
    const { date } = req.query;
    const truckId = req.params.id;

    const where = { truckId, isActive: true };
    if (date) {
      where.assignedDate = date;
    }

    const assignments = await TruckAssignment.findAll({
      where,
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'role']
        }
      ],
      order: [['assignedDate', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: { assignments }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTrucks,
  getTruckById,
  createTruck,
  updateTruck,
  deleteTruck,
  assignEmployeesToTruck,
  getTruckAssignments
};
