const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ServicePlan = sequelize.define('ServicePlan', {
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
  planName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  planType: {
    type: DataTypes.ENUM('weekly', 'bi-weekly', 'monthly', 'seasonal', 'custom'),
    defaultValue: 'monthly'
  },
  servicesIncluded: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of services included in the plan'
  },
  recurringAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  billingCycle: {
    type: DataTypes.ENUM('weekly', 'monthly', 'quarterly', 'annually'),
    defaultValue: 'monthly'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'paused', 'cancelled', 'expired'),
    defaultValue: 'active'
  },
  autoRenew: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  nextBillingDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'service_plans',
  indexes: [
    { fields: ['customerId'] },
    { fields: ['status'] },
    { fields: ['startDate'] },
    { fields: ['nextBillingDate'] }
  ]
});

module.exports = ServicePlan;
