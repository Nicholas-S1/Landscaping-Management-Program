const { Op } = require('sequelize');
const { Appointment, User } = require('../models');
const { wrap, httpError, isStaff, isManager, pick, sendList, findOr404 } = require('../utils/crud');

const MANAGER_FIELDS = [
  'customerId', 'jobId', 'title', 'description', 'appointmentDate', 'startTime', 'endTime', 'status', 'assignedToId', 'notes'
];
const CUSTOMER_FIELDS = ['title', 'description', 'appointmentDate', 'startTime', 'notes'];
const include = [
  { model: User, as: 'customer', attributes: ['id', 'firstName', 'lastName', 'phone', 'propertyAddress'] },
  { model: User, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName'] }
];

const listAppointments = wrap(async (req, res) => {
  const { status, customerId, from, to, mine } = req.query;
  const where = {};
  if (status) where.status = status;
  if (from || to) {
    where.appointmentDate = {};
    if (from) where.appointmentDate[Op.gte] = from;
    if (to) where.appointmentDate[Op.lte] = to;
  }
  if (!isStaff(req.user)) {
    where.customerId = req.user.id;
  } else {
    if (customerId) where.customerId = customerId;
    if (mine === 'true') where.assignedToId = req.user.id;
  }
  await sendList(Appointment, req, res, { where, include, order: [['appointmentDate', 'ASC'], ['startTime', 'ASC']] });
});

const createAppointment = wrap(async (req, res) => {
  let data;
  if (isManager(req.user)) {
    data = pick(req.body, MANAGER_FIELDS);
    const customer = data.customerId && (await User.findByPk(data.customerId));
    if (!customer || customer.role !== 'customer') throw httpError(400, 'A valid customer is required');
  } else if (req.user.role === 'customer') {
    data = { ...pick(req.body, CUSTOMER_FIELDS), customerId: req.user.id, status: 'scheduled' };
  } else {
    throw httpError(403, 'Only managers and customers can book appointments');
  }
  const appointment = await Appointment.create(data);
  res.status(201).json({ success: true, message: 'Appointment booked', data: { item: await appointment.reload({ include }) } });
});

const updateAppointment = wrap(async (req, res) => {
  const appointment = await findOr404(Appointment, req.params.id);
  let data;
  if (isManager(req.user)) {
    data = pick(req.body, MANAGER_FIELDS.filter((field) => field !== 'customerId'));
  } else if (req.user.role === 'customer' && appointment.customerId === req.user.id) {
    if (['completed', 'cancelled', 'in_progress'].includes(appointment.status)) {
      throw httpError(400, `A ${appointment.status} appointment cannot be changed`);
    }
    data = pick(req.body, CUSTOMER_FIELDS);
    const moved = (data.appointmentDate && data.appointmentDate !== appointment.appointmentDate) ||
      (data.startTime && data.startTime !== appointment.startTime);
    if (req.body.status === 'cancelled') data.status = 'cancelled';
    else if (moved) data.status = 'rescheduled';
  } else {
    throw httpError(403, 'Access denied');
  }
  await appointment.update(data);
  res.json({ success: true, message: 'Appointment updated', data: { item: await appointment.reload({ include }) } });
});

const deleteAppointment = wrap(async (req, res) => {
  const appointment = await findOr404(Appointment, req.params.id);
  await appointment.destroy();
  res.json({ success: true, message: 'Appointment deleted' });
});

module.exports = { listAppointments, createAppointment, updateAppointment, deleteAppointment };
