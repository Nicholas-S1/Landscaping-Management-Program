const { TimeEntry, User, Route } = require('../models');
const { Op } = require('sequelize');

/**
 * @route   POST /api/time-entries/clock-in
 * @desc    Clock in
 * @access  Private (Employee, Manager)
 */
const clockIn = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { routeId, notes } = req.body;

    // Check if user is already clocked in
    const existingEntry = await TimeEntry.findOne({
      where: {
        userId,
        clockOut: null
      }
    });

    if (existingEntry) {
      return res.status(400).json({
        success: false,
        message: 'You are already clocked in. Please clock out first.'
      });
    }

    const timeEntry = await TimeEntry.create({
      userId,
      clockIn: new Date(),
      routeId: routeId || null,
      notes: notes || null
    });

    res.status(201).json({
      success: true,
      message: 'Clocked in successfully',
      data: { timeEntry }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/time-entries/clock-out
 * @desc    Clock out
 * @access  Private (Employee, Manager)
 */
const clockOut = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { notes } = req.body;

    const timeEntry = await TimeEntry.findOne({
      where: {
        userId,
        clockOut: null
      },
      order: [['clockIn', 'DESC']]
    });

    if (!timeEntry) {
      return res.status(400).json({
        success: false,
        message: 'No active clock-in found. Please clock in first.'
      });
    }

    await timeEntry.update({
      clockOut: new Date(),
      notes: notes || timeEntry.notes
    });

    res.status(200).json({
      success: true,
      message: 'Clocked out successfully',
      data: { timeEntry }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/time-entries/current
 * @desc    Get current active time entry
 * @access  Private
 */
const getCurrentTimeEntry = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const timeEntry = await TimeEntry.findOne({
      where: {
        userId,
        clockOut: null
      },
      include: [
        {
          model: Route,
          as: 'route',
          attributes: ['id', 'name', 'scheduledDate']
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: { timeEntry }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/time-entries
 * @desc    Get time entries with filters
 * @access  Private
 */
const getTimeEntries = async (req, res, next) => {
  try {
    const { userId, startDate, endDate, page = 1, limit = 20 } = req.query;

    // Only allow users to see their own entries unless they're manager/admin
    let targetUserId = req.user.id;
    if (['manager', 'admin'].includes(req.user.role) && userId) {
      targetUserId = userId;
    }

    const where = { userId: targetUserId };

    if (startDate && endDate) {
      where.clockIn = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      where.clockIn = {
        [Op.gte]: new Date(startDate)
      };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: timeEntries } = await TimeEntry.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Route,
          as: 'route',
          attributes: ['id', 'name', 'scheduledDate']
        },
        {
          model: User,
          as: 'adjuster',
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['clockIn', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: {
        timeEntries,
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
 * @route   PUT /api/time-entries/:id
 * @desc    Adjust time entry (Manager/Admin only)
 * @access  Private (Manager, Admin)
 */
const adjustTimeEntry = async (req, res, next) => {
  try {
    const timeEntry = await TimeEntry.findByPk(req.params.id);

    if (!timeEntry) {
      return res.status(404).json({
        success: false,
        message: 'Time entry not found'
      });
    }

    const { clockIn, clockOut, breakStart, breakEnd, adjustmentReason } = req.body;

    await timeEntry.update({
      clockIn: clockIn || timeEntry.clockIn,
      clockOut: clockOut !== undefined ? clockOut : timeEntry.clockOut,
      breakStart: breakStart !== undefined ? breakStart : timeEntry.breakStart,
      breakEnd: breakEnd !== undefined ? breakEnd : timeEntry.breakEnd,
      adjustedBy: req.user.id,
      adjustmentReason: adjustmentReason || timeEntry.adjustmentReason
    });

    res.status(200).json({
      success: true,
      message: 'Time entry adjusted successfully',
      data: { timeEntry }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/time-entries/summary
 * @desc    Get time entry summary for a period
 * @access  Private
 */
const getTimeEntrySummary = async (req, res, next) => {
  try {
    const { userId, startDate, endDate } = req.query;

    // Only allow users to see their own summary unless they're manager/admin
    let targetUserId = req.user.id;
    if (['manager', 'admin'].includes(req.user.role) && userId) {
      targetUserId = userId;
    }

    const where = {
      userId: targetUserId,
      clockOut: { [Op.ne]: null }
    };

    if (startDate && endDate) {
      where.clockIn = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const timeEntries = await TimeEntry.findAll({
      where,
      attributes: ['totalHours', 'clockIn', 'clockOut']
    });

    const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);
    const totalDays = timeEntries.length;

    res.status(200).json({
      success: true,
      data: {
        totalHours: Math.round(totalHours * 100) / 100,
        totalDays,
        averageHoursPerDay: totalDays > 0 ? Math.round((totalHours / totalDays) * 100) / 100 : 0
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  clockIn,
  clockOut,
  getCurrentTimeEntry,
  getTimeEntries,
  adjustTimeEntry,
  getTimeEntrySummary
};
