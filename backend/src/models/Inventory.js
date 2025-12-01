const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Inventory = sequelize.define('Inventory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  category: {
    type: DataTypes.ENUM('fertilizer', 'seed', 'mulch', 'soil', 'chemicals', 'fuel', 'parts', 'tools', 'other'),
    defaultValue: 'other'
  },
  currentQuantity: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'units'
  },
  reorderLevel: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Quantity at which to reorder'
  },
  reorderQuantity: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Quantity to reorder'
  },
  unitCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  supplier: {
    type: DataTypes.STRING,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Storage location'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'inventory',
  indexes: [
    { fields: ['category'] },
    { fields: ['sku'] }
  ]
});

module.exports = Inventory;
