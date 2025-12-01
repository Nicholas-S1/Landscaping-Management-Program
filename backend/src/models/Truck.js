const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Truck = sequelize.define('Truck', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Truck name/identifier (e.g., "Truck 1", "Red F-150")'
  },
  licensePlate: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  make: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Vehicle make (e.g., Ford, Chevy)'
  },
  model: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Vehicle model (e.g., F-150, Silverado)'
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  vin: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Number of crew members this truck can hold'
  },
  status: {
    type: DataTypes.ENUM('active', 'maintenance', 'retired'),
    defaultValue: 'active'
  },
  currentMileage: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  lastMaintenanceDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  nextMaintenanceDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'trucks',
  indexes: [
    { fields: ['status'] },
    { fields: ['licensePlate'] }
  ]
});

module.exports = Truck;
