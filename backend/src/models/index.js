const { sequelize } = require('../config/database');
const User = require('./User');

// Import other models here as we create them
// const Customer = require('./Customer');
// const Employee = require('./Employee');
// const Truck = require('./Truck');
// const Route = require('./Route');
// etc...

// Define associations here
const initAssociations = () => {
  // Example: User.hasMany(PropertyNote);
  // PropertyNote.belongsTo(User);

  // We'll add associations as we create more models
};

// Initialize all associations
initAssociations();

// Sync database (create tables if they don't exist)
const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log('✅ Database synchronized successfully.');
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  syncDatabase,
  // Export other models here as we create them
};
