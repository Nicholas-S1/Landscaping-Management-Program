const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MaintenanceLog = sequelize.define('MaintenanceLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  equipmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'equipment',
      key: 'id'
    }
  },
  performedById: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  maintenanceType: {
    type: DataTypes.ENUM('routine', 'repair', 'inspection', 'cleaning', 'parts_replacement'),
    defaultValue: 'routine'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  partsReplaced: {
    type: DataTypes.JSON,
    allowNull: true
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  hoursAtMaintenance: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  maintenanceDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  nextMaintenanceDue: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'maintenance_logs',
  indexes: [
    { fields: ['equipmentId'] },
    { fields: ['performedById'] },
    { fields: ['maintenanceDate'] }
  ]
});

module.exports = MaintenanceLog;
