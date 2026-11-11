const { TimeOffRequest, User } = require('../models');
const { wrap, httpError, isManager, pick, sendList, findOr404 } = require('../utils/crud');

const include = [
  { model: User, as: 'employee', attributes: ['id', 'firstName', 'lastName'] },
  { model: User, as: 'reviewedBy', attributes: ['id', 'firstName', 'lastName'] }
];

const listRequests = wrap(async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (!isManager(req.user) || req.query.mine === 'true') where.userId = req.user.id;
  else if (req.query.userId) where.userId = req.query.userId;
  await sendList(TimeOffRequest, req, res, { where, include, order: [['startDate', 'DESC']] });
});

const createRequest = wrap(async (req, res) => {
  const data = pick(req.body, ['startDate', 'endDate', 'type', 'reason']);
  if (!data.startDate || !data.endDate) throw httpError(400, 'Start and end dates are required');
  if (data.endDate < data.startDate) throw httpError(400, 'End date cannot be before the start date');
  const request = await TimeOffRequest.create({ ...data, userId: req.user.id });
  res.status(201).json({ success: true, message: 'Time-off request submitted', data: { item: await request.reload({ include }) } });
});

const reviewRequest = wrap(async (req, res) => {
  const request = await findOr404(TimeOffRequest, req.params.id);
  if (!['approved', 'denied'].includes(req.body.status)) throw httpError(400, 'status must be approved or denied');
  if (request.userId === req.user.id) throw httpError(403, 'You cannot review your own request');
  await request.update({
    status: req.body.status,
    reviewNote: req.body.reviewNote || null,
    reviewedById: req.user.id,
    reviewedAt: new Date()
  });
  res.json({ success: true, message: `Request ${req.body.status}`, data: { item: await request.reload({ include }) } });
});

const cancelRequest = wrap(async (req, res) => {
  const request = await findOr404(TimeOffRequest, req.params.id);
  if (request.userId !== req.user.id) throw httpError(403, 'Access denied');
  if (request.status !== 'pending') throw httpError(400, 'Only pending requests can be withdrawn');
  await request.destroy();
  res.json({ success: true, message: 'Request withdrawn' });
});

module.exports = { listRequests, createRequest, reviewRequest, cancelRequest };
