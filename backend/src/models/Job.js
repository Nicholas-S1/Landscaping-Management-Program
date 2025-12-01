const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  routeId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'routes',
      key: 'id'
    }
  },
  assignedToId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Employee assigned to this job'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  jobType: {
    type: DataTypes.ENUM('mowing', 'trimming', 'cleanup', 'planting', 'mulching', 'fertilizing', 'other'),
    defaultValue: 'other'
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  scheduledDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  scheduledStartTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  scheduledEndTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  actualStartTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actualEndTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  estimatedDuration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated duration in minutes'
  },
  actualDuration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Actual duration in minutes'
  },
  beforePhotos: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of photo URLs taken before job'
  },
  afterPhotos: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of photo URLs taken after job'
  },
  materialsUsed: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of materials/supplies used'
  },
  estimatedCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  actualCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  customerNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  internalNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  completedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'jobs',
  indexes: [
    { fields: ['customerId'] },
    { fields: ['status'] },
    { fields: ['scheduledDate'] },
    { fields: ['assignedToId'] },
    { fields: ['routeId'] }
  ]
});

module.exports = Job;
