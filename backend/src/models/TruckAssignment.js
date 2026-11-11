const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TruckAssignment = sequelize.define('TruckAssignment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  truckId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'trucks',
      key: 'id'
    }
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  assignedDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('driver', 'crew'),
    defaultValue: 'crew'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'truck_assignments',
  indexes: [
    { fields: ['truck_id'] },
    { fields: ['employee_id'] },
    { fields: ['assigned_date'] },
    { fields: ['is_active'] }
  ]
});

module.exports = TruckAssignment;
