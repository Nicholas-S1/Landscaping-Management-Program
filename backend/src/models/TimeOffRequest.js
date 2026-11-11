const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TimeOffRequest = sequelize.define('TimeOffRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('vacation', 'sick', 'personal', 'other'),
    defaultValue: 'vacation'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'denied'),
    defaultValue: 'pending'
  },
  reviewedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reviewNote: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'time_off_requests',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['start_date'] }
  ]
});

module.exports = TimeOffRequest;
