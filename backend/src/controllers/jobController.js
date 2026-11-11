const { Op } = require('sequelize');
const { sequelize, Job, User, Route, Invoice, Inventory } = require('../models');
const { wrap, httpError, isManager, pick, sendList, findOr404 } = require('../utils/crud');
const { createInvoice } = require('../services/invoiceService');

const MANAGER_FIELDS = [
  'customerId', 'routeId', 'assignedToId', 'title', 'description', 'jobType', 'status', 'priority',
  'scheduledDate', 'scheduledStartTime', 'scheduledEndTime', 'estimatedDuration', 'estimatedCost',
  'actualCost', 'customerNotes', 'internalNotes', 'checklist', 'materialsUsed', 'beforePhotos', 'afterPhotos'
];
const EMPLOYEE_FIELDS = ['checklist', 'materialsUsed', 'beforePhotos', 'afterPhotos', 'internalNotes'];
const CUSTOMER_FIELDS = ['title', 'description', 'jobType', 'scheduledDate', 'customerNotes'];

const include = [
  { model: User, as: 'customer', attributes: ['id', 'firstName', 'lastName', 'phone', 'propertyAddress'] },
  { model: User, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName'] },
  { model: Route, as: 'route', attributes: ['id', 'name', 'scheduledDate'] }
];

// Customers never see internal notes or material costs.
const forViewer = (user) => (job) => {
  const data = job.toJSON();
  if (user.role === 'customer') {
    delete data.internalNotes;
    delete data.materialsUsed;
  }
  return data;
};

const assertCustomer = async (customerId) => {
  const customer = customerId && (await User.findByPk(customerId));
  if (!customer || customer.role !== 'customer') throw httpError(400, 'A valid customer is required');
};

const loadForUser = async (req) => {
  const job = await findOr404(Job, req.params.id, { include });
  if (req.user.role === 'customer' && job.customerId !== req.user.id) throw httpError(403, 'Access denied');
  return job;
};

const listJobs = wrap(async (req, res) => {
  const { status, customerId, assignedToId, routeId, date, from, to, mine } = req.query;
  const where = {};
  if (status) where.status = status;
  if (routeId) where.routeId = routeId;
  if (date) where.scheduledDate = date;
  if (from || to) {
    where.scheduledDate = {};
    if (from) where.scheduledDate[Op.gte] = from;
    if (to) where.scheduledDate[Op.lte] = to;
  }
  if (req.user.role === 'customer') {
    where.customerId = req.user.id;
  } else {
    if (customerId) where.customerId = customerId;
    if (assignedToId) where.assignedToId = assignedToId;
    if (mine === 'true') where.assignedToId = req.user.id;
  }
  await sendList(Job, req, res, {
    where,
    include,
    order: [['scheduledDate', 'DESC'], ['createdAt', 'DESC']],
    map: forViewer(req.user)
  });
});

const getJob = wrap(async (req, res) => {
  const job = await loadForUser(req);
  res.json({ success: true, data: { item: forViewer(req.user)(job) } });
});

const createJob = wrap(async (req, res) => {
  let data;
  if (req.user.role === 'customer') {
    // A customer creating a job is a service request for their own property.
    data = { ...pick(req.body, CUSTOMER_FIELDS), customerId: req.user.id, status: 'pending' };
  } else if (isManager(req.user)) {
    data = pick(req.body, MANAGER_FIELDS);
    await assertCustomer(data.customerId);
  } else {
    throw httpError(403, 'Only managers can create jobs');
  }
  const job = await Job.create(data);
  res.status(201).json({ success: true, message: 'Job created', data: { item: await Job.findByPk(job.id, { include }) } });
});

const updateJob = wrap(async (req, res) => {
  const job = await loadForUser(req);
  let data;
  if (isManager(req.user)) {
    data = pick(req.body, MANAGER_FIELDS);
    if (data.customerId) await assertCustomer(data.customerId);
  } else if (req.user.role === 'employee') {
    data = pick(req.body, EMPLOYEE_FIELDS);
  } else {
    if (job.status !== 'pending') throw httpError(400, 'Only pending requests can be changed');
    data = pick(req.body, CUSTOMER_FIELDS);
    if (req.body.status === 'cancelled') data.status = 'cancelled';
  }
  await job.update(data);
  res.json({ success: true, message: 'Job updated', data: { item: forViewer(req.user)(await job.reload({ include })) } });
});

const startJob = wrap(async (req, res) => {
  const job = await findOr404(Job, req.params.id);
  if (job.status !== 'pending') throw httpError(400, `Job is already ${job.status}`);
  await job.update({
    status: 'in_progress',
    actualStartTime: new Date(),
    assignedToId: job.assignedToId || req.user.id
  });
  res.json({ success: true, message: 'Job started', data: { item: await job.reload({ include }) } });
});

// Deducts used materials from inventory and fills in each material's name and unit cost.
const consumeMaterials = async (materials, transaction) => {
  const used = [];
  for (const material of materials) {
    const quantity = Number(material.quantity) || 0;
    const entry = { ...material, quantity };
    if (material.inventoryId) {
      const item = await Inventory.findByPk(material.inventoryId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!item) throw httpError(400, 'Material not found in inventory');
      await item.update({ currentQuantity: Math.max(item.currentQuantity - quantity, 0) }, { transaction });
      entry.name = item.name;
      entry.unit = item.unit;
      entry.unitCost = Number(item.unitCost) || 0;
    }
    used.push(entry);
  }
  return used;
};

const completeJob = wrap(async (req, res) => {
  const job = await findOr404(Job, req.params.id);
  if (['completed', 'cancelled'].includes(job.status)) throw httpError(400, `Job is already ${job.status}`);

  const now = new Date();
  const startedAt = job.actualStartTime || now;
  const changes = {
    ...pick(req.body, ['afterPhotos', 'beforePhotos', 'checklist', 'internalNotes']),
    status: 'completed',
    actualStartTime: startedAt,
    actualEndTime: now,
    actualDuration: Math.round((now - new Date(startedAt)) / 60000),
    completedBy: req.user.id,
    completedAt: now
  };
  if (isManager(req.user) && req.body.actualCost !== undefined) changes.actualCost = req.body.actualCost;

  await sequelize.transaction(async (transaction) => {
    if (Array.isArray(req.body.materialsUsed)) {
      changes.materialsUsed = await consumeMaterials(req.body.materialsUsed, transaction);
    }
    await job.update(changes, { transaction });
  });

  // Bill the job automatically when it has a price and has not been invoiced yet.
  let invoice = null;
  const price = Number(job.actualCost ?? job.estimatedCost) || 0;
  if (price > 0 && !(await Invoice.findOne({ where: { jobId: job.id } }))) {
    invoice = await createInvoice({
      customerId: job.customerId,
      jobId: job.id,
      lineItems: [{ description: job.title, quantity: 1, rate: price }],
      status: 'sent'
    });
  }

  res.json({ success: true, message: 'Job completed', data: { item: await job.reload({ include }), invoice } });
});

const deleteJob = wrap(async (req, res) => {
  const job = await findOr404(Job, req.params.id);
  if (await Invoice.findOne({ where: { jobId: job.id } })) {
    throw httpError(400, 'This job has an invoice; cancel the job instead of deleting it');
  }
  await job.destroy();
  res.json({ success: true, message: 'Job deleted' });
});

module.exports = { listJobs, getJob, createJob, updateJob, startJob, completeJob, deleteJob };
