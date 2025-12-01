const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PropertyNote = sequelize.define('PropertyNote', {
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
    },
    comment: 'Customer whose property this note is about'
  },
  authorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Employee/Manager who created the note'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  noteType: {
    type: DataTypes.ENUM('general', 'service', 'issue', 'maintenance', 'customer_request'),
    defaultValue: 'general'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium'
  },
  isPrivate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'If true, only visible to employees/managers, not customers'
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of image URLs'
  }
}, {
  tableName: 'property_notes',
  indexes: [
    { fields: ['customerId'] },
    { fields: ['authorId'] },
    { fields: ['noteType'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = PropertyNote;
