const { ServicePlan, User } = require('../models');
const { wrap, httpError, isManager, pick, sendList, findOr404 } = require('../utils/crud');
const { runPlanBilling, generatePlanJobs } = require('../services/planService');
const { localDate } = require('../utils/dates');

const FIELDS = [
  'customerId', 'planName', 'description', 'planType', 'servicesIncluded', 'recurringAmount', 'billingCycle',
  'startDate', 'endDate', 'status', 'autoRenew', 'nextBillingDate', 'nextServiceDate', 'notes'
];
const include = [{ model: User, as: 'customer', attributes: ['id', 'firstName', 'lastName', 'propertyAddress'] }];

const listPlans = wrap(async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (isManager(req.user)) {
    if (req.query.customerId) where.customerId = req.query.customerId;
  } else {
    where.customerId = req.user.id;
  }
  await sendList(ServicePlan, req, res, { where, include });
});

const createPlan = wrap(async (req, res) => {
  const data = pick(req.body, FIELDS);
  const customer = data.customerId && (await User.findByPk(data.customerId));
  if (!customer || customer.role !== 'customer') throw httpError(400, 'A valid customer is required');
  if (!data.startDate) throw httpError(400, 'Start date is required');

  // Billing and job generation begin at the start date, or today for a plan that has already started,
  // so entering an existing contract does not back-bill every past period.
  const start = new Date(data.startDate);
  const firstRun = start > new Date() ? start : new Date();
  if (!data.nextBillingDate) data.nextBillingDate = firstRun;
  if (!data.nextServiceDate) data.nextServiceDate = localDate(firstRun);

  const plan = await ServicePlan.create(data);
  res.status(201).json({ success: true, message: 'Service plan created', data: { item: await plan.reload({ include }) } });
});

const updatePlan = wrap(async (req, res) => {
  const plan = await findOr404(ServicePlan, req.params.id);
  await plan.update(pick(req.body, FIELDS.filter((field) => field !== 'customerId')));
  res.json({ success: true, message: 'Service plan updated', data: { item: await plan.reload({ include }) } });
});

const deletePlan = wrap(async (req, res) => {
  const plan = await findOr404(ServicePlan, req.params.id);
  await plan.update({ status: 'cancelled' });
  res.json({ success: true, message: 'Service plan cancelled' });
});

const runBilling = wrap(async (req, res) => {
  const billing = await runPlanBilling();
  const jobs = await generatePlanJobs();
  res.json({ success: true, data: { ...billing, ...jobs } });
});

module.exports = { listPlans, createPlan, updatePlan, deletePlan, runBilling };
