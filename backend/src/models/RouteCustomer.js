const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RouteCustomer = sequelize.define('RouteCustomer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  routeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'routes',
      key: 'id'
    }
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  orderIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Order in which to visit this customer on the route'
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'skipped'),
    defaultValue: 'pending'
  },
  estimatedArrival: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actualArrival: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actualDeparture: {
    type: DataTypes.DATE,
    allowNull: true
  },
  servicesPerformed: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of services performed at this location'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'route_customers',
  indexes: [
    { fields: ['routeId'] },
    { fields: ['customerId'] },
    { fields: ['status'] }
  ]
});

module.exports = RouteCustomer;
