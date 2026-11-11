// Creates starter accounts and sample data: `npm run seed`. Safe to run more than once.
require('dotenv').config();
const {
  sequelize, syncDatabase, User, Truck, TruckAssignment, Route, RouteCustomer, Job, Equipment, Inventory, ServicePlan
} = require('../models');
const { createInvoice } = require('../services/invoiceService');
const { localDate } = require('../utils/dates');

const password = process.env.SEED_PASSWORD || 'ChangeMe123!';

const ensureUser = async (data) => {
  const [user] = await User.findOrCreate({ where: { email: data.email }, defaults: { ...data, password } });
  return user;
};

const seed = async () => {
  await syncDatabase();

  const admin = await ensureUser({ email: 'owner@example.com', firstName: 'Olivia', lastName: 'Owner', role: 'admin', phone: '555-0100' });
  const manager = await ensureUser({ email: 'manager@example.com', firstName: 'Marcus', lastName: 'Manager', role: 'manager', hourlyRate: 32, hireDate: new Date() });
  const employee = await ensureUser({ email: 'employee@example.com', firstName: 'Evan', lastName: 'Employee', role: 'employee', hourlyRate: 21, hireDate: new Date() });
  const customer = await ensureUser({ email: 'customer@example.com', firstName: 'Casey', lastName: 'Customer', role: 'customer', phone: '555-0142', propertyAddress: '128 Maple Street, Springfield', propertyNotes: 'Gate code 4411. Dog in the back yard.' });
  const customer2 = await ensureUser({ email: 'customer2@example.com', firstName: 'Riley', lastName: 'Rivera', role: 'customer', propertyAddress: '77 Oak Avenue, Springfield' });

  if ((await Truck.count()) === 0) {
    const today = localDate();
    const truck = await Truck.create({ name: 'Truck 1', licensePlate: 'LAWN-001', make: 'Ford', model: 'F-250', year: 2021, capacity: 3 });
    await TruckAssignment.create({ truckId: truck.id, employeeId: employee.id, assignedDate: today, role: 'driver' });

    const route = await Route.create({ name: 'Springfield North', scheduledDate: today, startTime: '08:00', truckId: truck.id });
    await RouteCustomer.bulkCreate([
      { routeId: route.id, customerId: customer.id, orderIndex: 0 },
      { routeId: route.id, customerId: customer2.id, orderIndex: 1 }
    ]);

    await Job.bulkCreate([
      { customerId: customer.id, routeId: route.id, assignedToId: employee.id, title: 'Weekly mowing', jobType: 'mowing', scheduledDate: today, estimatedCost: 55, checklist: [{ label: 'Mow front and back', done: false }, { label: 'Edge walkways', done: false }, { label: 'Blow off clippings', done: false }] },
      { customerId: customer2.id, routeId: route.id, assignedToId: employee.id, title: 'Hedge trimming', jobType: 'trimming', scheduledDate: today, estimatedCost: 90 }
    ]);

    await Equipment.bulkCreate([
      { name: 'Zero-turn mower', category: 'mower', brand: 'Toro', status: 'available', currentHours: 310, maintenanceIntervalHours: 50 },
      { name: 'String trimmer', category: 'trimmer', brand: 'Stihl', status: 'available' }
    ]);

    await Inventory.bulkCreate([
      { name: 'Lawn fertilizer 16-4-8', category: 'fertilizer', currentQuantity: 12, unit: 'bags', reorderLevel: 5, reorderQuantity: 20, unitCost: 24.5 },
      { name: 'Hardwood mulch', category: 'mulch', currentQuantity: 3, unit: 'cubic yards', reorderLevel: 4, reorderQuantity: 10, unitCost: 32 },
      { name: 'Gasoline', category: 'fuel', currentQuantity: 40, unit: 'gallons', reorderLevel: 15, unitCost: 3.6 }
    ]);

    await ServicePlan.create({ customerId: customer.id, planName: 'Weekly lawn care', planType: 'weekly', servicesIncluded: ['Mowing', 'Edging', 'Blowing'], recurringAmount: 180, billingCycle: 'monthly', startDate: new Date(), nextBillingDate: new Date(), nextServiceDate: today });

    await createInvoice({ customerId: customer.id, lineItems: [{ description: 'Spring cleanup', quantity: 1, rate: 240 }], status: 'sent' });
  }

  console.log('Seed complete. Sign in with any of these accounts:');
  for (const user of [admin, manager, employee, customer]) console.log(`  ${user.role.padEnd(8)} ${user.email}`);
  console.log(`Password: ${password}  (change it after first sign-in; set SEED_PASSWORD to choose your own)`);
};

seed()
  .then(() => sequelize.close())
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
