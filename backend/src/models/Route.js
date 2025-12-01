const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Route = sequelize.define('Route', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Route name (e.g., "North Zone Monday")'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  scheduledDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'scheduled'
  },
  truckId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'trucks',
      key: 'id'
    }
  },
  optimizedOrder: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of customer IDs in optimized order'
  },
  totalDistance: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Total route distance in miles'
  },
  estimatedDuration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated duration in minutes'
  },
  actualStartTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actualEndTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'routes',
  indexes: [
    { fields: ['scheduledDate'] },
    { fields: ['status'] },
    { fields: ['truckId'] }
  ]
});

module.exports = Route;
