const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Equipment = sequelize.define('Equipment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('mower', 'trimmer', 'blower', 'edger', 'chainsaw', 'tiller', 'trailer', 'other'),
    defaultValue: 'other'
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: true
  },
  model: {
    type: DataTypes.STRING,
    allowNull: true
  },
  serialNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  purchaseDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  purchasePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('available', 'in_use', 'maintenance', 'retired'),
    defaultValue: 'available'
  },
  currentHours: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Current operating hours'
  },
  lastMaintenanceDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  nextMaintenanceDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  maintenanceIntervalHours: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Hours between maintenance'
  },
  assignedToId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Employee currently assigned to this equipment'
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'equipment',
  indexes: [
    { fields: ['status'] },
    { fields: ['category'] },
    { fields: ['assignedToId'] }
  ]
});

module.exports = Equipment;
