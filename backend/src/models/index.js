const { sequelize } = require('../config/database');
const User = require('./User');
const Truck = require('./Truck');
const Route = require('./Route');
const RouteCustomer = require('./RouteCustomer');
const TimeEntry = require('./TimeEntry');
const PropertyNote = require('./PropertyNote');
const Message = require('./Message');
const TruckAssignment = require('./TruckAssignment');

// Define associations
const initAssociations = () => {
  // User associations
  User.hasMany(TimeEntry, { foreignKey: 'userId', as: 'timeEntries' });
  User.hasMany(PropertyNote, { foreignKey: 'customerId', as: 'propertyNotes' });
  User.hasMany(PropertyNote, { foreignKey: 'authorId', as: 'authoredNotes' });
  User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
  User.hasMany(Message, { foreignKey: 'recipientId', as: 'receivedMessages' });
  User.hasMany(TruckAssignment, { foreignKey: 'employeeId', as: 'truckAssignments' });
  User.hasMany(RouteCustomer, { foreignKey: 'customerId', as: 'routeAssignments' });

  // Truck associations
  Truck.hasMany(Route, { foreignKey: 'truckId', as: 'routes' });
  Truck.hasMany(TruckAssignment, { foreignKey: 'truckId', as: 'assignments' });

  // Route associations
  Route.belongsTo(Truck, { foreignKey: 'truckId', as: 'truck' });
  Route.hasMany(TimeEntry, { foreignKey: 'routeId', as: 'timeEntries' });
  Route.hasMany(RouteCustomer, { foreignKey: 'routeId', as: 'customers' });

  // RouteCustomer associations
  RouteCustomer.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });
  RouteCustomer.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });

  // TimeEntry associations
  TimeEntry.belongsTo(User, { foreignKey: 'userId', as: 'employee' });
  TimeEntry.belongsTo(User, { foreignKey: 'adjustedBy', as: 'adjuster' });
  TimeEntry.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });

  // PropertyNote associations
  PropertyNote.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });
  PropertyNote.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

  // Message associations
  Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
  Message.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });
  Message.belongsTo(User, { foreignKey: 'relatedCustomerId', as: 'relatedCustomer' });

  // TruckAssignment associations
  TruckAssignment.belongsTo(Truck, { foreignKey: 'truckId', as: 'truck' });
  TruckAssignment.belongsTo(User, { foreignKey: 'employeeId', as: 'employee' });
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
  Truck,
  Route,
  RouteCustomer,
  TimeEntry,
  PropertyNote,
  Message,
  TruckAssignment,
  syncDatabase,
};
