const { Op } = require('sequelize');
const { Invoice, User, Job, Message } = require('../models');
const { wrap, httpError, isManager, pick, sendList, findOr404 } = require('../utils/crud');
const { computeTotals, createInvoice, markOverdueInvoices, round2 } = require('../services/invoiceService');

const include = [
  { model: User, as: 'customer', attributes: ['id', 'firstName', 'lastName', 'email', 'propertyAddress'] },
  { model: Job, as: 'job', attributes: ['id', 'title', 'scheduledDate'] }
];

const loadForUser = async (req) => {
  const invoice = await findOr404(Invoice, req.params.id, { include });
  if (!isManager(req.user) && (invoice.customerId !== req.user.id || invoice.status === 'draft')) {
    throw httpError(403, 'Access denied');
  }
  return invoice;
};

const listInvoices = wrap(async (req, res) => {
  await markOverdueInvoices();
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (isManager(req.user)) {
    if (req.query.customerId) where.customerId = req.query.customerId;
  } else {
    // Customers see only their own invoices, and never unsent drafts.
    where.customerId = req.user.id;
    where.status = req.query.status && req.query.status !== 'draft' ? req.query.status : { [Op.ne]: 'draft' };
  }
  await sendList(Invoice, req, res, { where, include, order: [['invoiceDate', 'DESC']] });
});

const getInvoice = wrap(async (req, res) => {
  res.json({ success: true, data: { item: await loadForUser(req) } });
});

const createInvoiceHandler = wrap(async (req, res) => {
  const { customerId, lineItems } = req.body;
  const customer = customerId && (await User.findByPk(customerId));
  if (!customer || customer.role !== 'customer') throw httpError(400, 'A valid customer is required');
  if (!Array.isArray(lineItems) || lineItems.length === 0) throw httpError(400, 'At least one line item is required');

  const invoice = await createInvoice({
    ...pick(req.body, ['customerId', 'jobId', 'lineItems', 'taxRate', 'discountAmount', 'dueDate', 'notes', 'termsAndConditions']),
    status: req.body.status === 'sent' ? 'sent' : 'draft'
  });
  res.status(201).json({ success: true, message: 'Invoice created', data: { item: await invoice.reload({ include }) } });
});

const updateInvoice = wrap(async (req, res) => {
  const invoice = await findOr404(Invoice, req.params.id);
  if (invoice.status === 'paid') throw httpError(400, 'Paid invoices cannot be changed');

  const changes = pick(req.body, ['dueDate', 'notes', 'termsAndConditions']);
  if (['draft', 'sent', 'cancelled'].includes(req.body.status)) changes.status = req.body.status;
  if (req.body.lineItems || req.body.taxRate !== undefined || req.body.discountAmount !== undefined) {
    Object.assign(changes, computeTotals({
      lineItems: req.body.lineItems || invoice.lineItems || [],
      taxRate: req.body.taxRate ?? invoice.taxRate,
      discountAmount: req.body.discountAmount ?? invoice.discountAmount
    }));
  }
  await invoice.update(changes);
  res.json({ success: true, message: 'Invoice updated', data: { item: await invoice.reload({ include }) } });
});

const recordPayment = wrap(async (req, res) => {
  const invoice = await findOr404(Invoice, req.params.id);
  if (['paid', 'cancelled', 'draft'].includes(invoice.status)) throw httpError(400, `Invoice is ${invoice.status}`);

  const amount = Number(req.body.amount);
  const balance = round2(Number(invoice.totalAmount) - Number(invoice.paidAmount));
  if (!(amount > 0)) throw httpError(400, 'Payment amount must be greater than zero');
  if (amount > balance) throw httpError(400, `Payment exceeds the balance due (${balance.toFixed(2)})`);

  const paidAmount = round2(Number(invoice.paidAmount) + amount);
  const paidInFull = paidAmount >= Number(invoice.totalAmount);
  await invoice.update({
    paidAmount,
    paymentMethod: req.body.paymentMethod || invoice.paymentMethod || 'cash',
    ...(paidInFull ? { status: 'paid', paidAt: new Date() } : {})
  });
  res.json({ success: true, message: paidInFull ? 'Invoice paid in full' : 'Partial payment recorded', data: { item: await invoice.reload({ include }) } });
});

const sendReminder = wrap(async (req, res) => {
  const invoice = await findOr404(Invoice, req.params.id);
  if (!['sent', 'overdue'].includes(invoice.status)) throw httpError(400, 'Reminders can only be sent for unpaid invoices');
  const balance = round2(Number(invoice.totalAmount) - Number(invoice.paidAmount));
  await Message.create({
    senderId: req.user.id,
    recipientId: invoice.customerId,
    subject: `Payment reminder: invoice ${invoice.invoiceNumber}`,
    content: `This is a reminder that invoice ${invoice.invoiceNumber} has a balance of $${balance.toFixed(2)} due ${new Date(invoice.dueDate).toLocaleDateString()}.`
  });
  res.json({ success: true, message: 'Reminder sent' });
});

// Card payments need a payment processor account; until one is connected, payments are recorded by staff.
const payOnline = wrap(async (req, res) => {
  await loadForUser(req);
  throw httpError(501, 'Online card payments are not set up yet. Please contact the office to pay this invoice.');
});

module.exports = { listInvoices, getInvoice, createInvoiceHandler, updateInvoice, recordPayment, sendReminder, payOnline };
