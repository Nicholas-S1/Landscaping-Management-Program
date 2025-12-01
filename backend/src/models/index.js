const { sequelize } = require('../config/database');
const User = require('./User');
const Truck = require('./Truck');
const Route = require('./Route');
const RouteCustomer = require('./RouteCustomer');
const TimeEntry = require('./TimeEntry');
const PropertyNote = require('./PropertyNote');
const Message = require('./Message');
const TruckAssignment = require('./TruckAssignment');
const Job = require('./Job');
const Equipment = require('./Equipment');
const MaintenanceLog = require('./MaintenanceLog');
const Invoice = require('./Invoice');
const ServicePlan = require('./ServicePlan');
const Appointment = require('./Appointment');
const Inventory = require('./Inventory');

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
  User.hasMany(Job, { foreignKey: 'customerId', as: 'customerJobs' });
  User.hasMany(Job, { foreignKey: 'assignedToId', as: 'assignedJobs' });
  User.hasMany(Equipment, { foreignKey: 'assignedToId', as: 'assignedEquipment' });
  User.hasMany(Invoice, { foreignKey: 'customerId', as: 'invoices' });
  User.hasMany(ServicePlan, { foreignKey: 'customerId', as: 'servicePlans' });
  User.hasMany(Appointment, { foreignKey: 'customerId', as: 'appointments' });

  // Truck associations
  Truck.hasMany(Route, { foreignKey: 'truckId', as: 'routes' });
  Truck.hasMany(TruckAssignment, { foreignKey: 'truckId', as: 'assignments' });

  // Route associations
  Route.belongsTo(Truck, { foreignKey: 'truckId', as: 'truck' });
  Route.hasMany(TimeEntry, { foreignKey: 'routeId', as: 'timeEntries' });
  Route.hasMany(RouteCustomer, { foreignKey: 'routeId', as: 'customers' });
  Route.hasMany(Job, { foreignKey: 'routeId', as: 'jobs' });

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

  // Job associations
  Job.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });
  Job.belongsTo(User, { foreignKey: 'assignedToId', as: 'assignedTo' });
  Job.belongsTo(User, { foreignKey: 'completedBy', as: 'completedByUser' });
  Job.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });
  Job.hasMany(Invoice, { foreignKey: 'jobId', as: 'invoices' });
  Job.hasMany(Appointment, { foreignKey: 'jobId', as: 'appointments' });

  // Equipment associations
  Equipment.belongsTo(User, { foreignKey: 'assignedToId', as: 'assignedTo' });
  Equipment.hasMany(MaintenanceLog, { foreignKey: 'equipmentId', as: 'maintenanceLogs' });

  // MaintenanceLog associations
  MaintenanceLog.belongsTo(Equipment, { foreignKey: 'equipmentId', as: 'equipment' });
  MaintenanceLog.belongsTo(User, { foreignKey: 'performedById', as: 'performedBy' });

  // Invoice associations
  Invoice.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });
  Invoice.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });

  // ServicePlan associations
  ServicePlan.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });

  // Appointment associations
  Appointment.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });
  Appointment.belongsTo(User, { foreignKey: 'assignedToId', as: 'assignedTo' });
  Appointment.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });
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
  Job,
  Equipment,
  MaintenanceLog,
  Invoice,
  ServicePlan,
  Appointment,
  Inventory,
  syncDatabase,
};
