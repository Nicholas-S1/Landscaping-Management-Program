const { Op } = require('sequelize');
const User = require('../models/User');
const { wrap, httpError, pick, paginate } = require('../utils/crud');

const SAFE_ATTRIBUTES = { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpire'] };
const ROLES = ['customer', 'employee', 'manager', 'admin'];

/**
 * @route   GET /api/users
 * @access  Manager, Admin
 */
const getAllUsers = wrap(async (req, res) => {
  const { role, search, isActive } = req.query;
  const { page, limit, offset } = paginate(req.query);

  const where = {};
  if (role) where.role = role;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (search) {
    where[Op.or] = ['firstName', 'lastName', 'email'].map((field) => ({ [field]: { [Op.iLike]: `%${search}%` } }));
  }

  const { count, rows: users } = await User.findAndCountAll({
    where,
    attributes: SAFE_ATTRIBUTES,
    limit,
    offset,
    order: [['lastName', 'ASC'], ['firstName', 'ASC']]
  });

  res.json({
    success: true,
    data: { users, pagination: { total: count, page, limit, pages: Math.ceil(count / limit) } }
  });
});

/**
 * @route   GET /api/users/contacts
 * @desc    People the current user may message (names and roles only)
 * @access  Any signed-in user
 */
const getContacts = wrap(async (req, res) => {
  const roles = {
    customer: ['manager', 'admin'],
    employee: ['employee', 'manager', 'admin'],
    manager: ROLES,
    admin: ROLES
  }[req.user.role];

  const users = await User.findAll({
    where: { role: { [Op.in]: roles }, isActive: true, id: { [Op.ne]: req.user.id } },
    attributes: ['id', 'firstName', 'lastName', 'role'],
    order: [['lastName', 'ASC'], ['firstName', 'ASC']]
  });
  res.json({ success: true, data: { users } });
});

/**
 * @route   GET /api/users/customers
 * @desc    Customer directory for staff (what a crew needs on site, nothing more)
 * @access  Employee, Manager, Admin
 */
const getCustomerDirectory = wrap(async (req, res) => {
  const users = await User.findAll({
    where: { role: 'customer', isActive: true },
    attributes: ['id', 'firstName', 'lastName', 'phone', 'propertyAddress', 'propertyNotes'],
    order: [['lastName', 'ASC'], ['firstName', 'ASC']]
  });
  res.json({ success: true, data: { users } });
});

/**
 * @route   GET /api/users/:id
 * @access  The user themselves, Manager, Admin
 */
const getUserById = wrap(async (req, res) => {
  const user = await User.findByPk(req.params.id, { attributes: SAFE_ATTRIBUTES });
  if (!user) throw httpError(404, 'User not found');
  res.json({ success: true, data: { user } });
});

/**
 * @route   POST /api/users
 * @desc    Managers can add customers; hiring staff is reserved for the owner (admin)
 * @access  Manager, Admin
 */
const createUser = wrap(async (req, res) => {
  const role = ROLES.includes(req.body.role) ? req.body.role : 'customer';
  if (role !== 'customer' && req.user.role !== 'admin') {
    throw httpError(403, 'Only the owner can add employees, managers or admins');
  }
  if (await User.findOne({ where: { email: req.body.email } })) {
    throw httpError(400, 'User with this email already exists');
  }

  const data = { ...pick(req.body, ['email', 'password', 'firstName', 'lastName', 'phone', 'address']), role };
  if (role === 'customer') {
    Object.assign(data, pick(req.body, ['propertyAddress', 'propertyNotes']));
  } else {
    Object.assign(data, pick(req.body, ['hourlyRate']), { hireDate: req.body.hireDate || new Date() });
  }

  const user = await User.create(data);
  res.status(201).json({ success: true, message: 'User created successfully', data: { user: user.getPublicProfile() } });
});

/**
 * @route   PUT /api/users/:id
 * @desc    Managers edit customer and employee details; roles, activation and manager/admin accounts are owner-only
 * @access  Manager, Admin
 */
const updateUser = wrap(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw httpError(404, 'User not found');

  const isAdmin = req.user.role === 'admin';
  const { role, isActive } = req.body;
  const changesRole = role !== undefined && role !== user.role;
  const changesActive = isActive !== undefined && isActive !== user.isActive;

  if (!isAdmin && (changesRole || changesActive || ['manager', 'admin'].includes(user.role))) {
    throw httpError(403, 'Only the owner can change roles, activate or deactivate accounts, or edit managers and admins');
  }
  if (user.id === req.user.id && (changesRole || changesActive)) {
    throw httpError(400, 'You cannot change your own role or deactivate your own account');
  }
  if (changesRole && !ROLES.includes(role)) throw httpError(400, 'Invalid role');

  const data = pick(req.body, ['firstName', 'lastName', 'phone', 'address']);
  if (changesRole) data.role = role;
  if (changesActive) data.isActive = isActive;
  const effectiveRole = data.role || user.role;
  if (effectiveRole === 'customer') {
    Object.assign(data, pick(req.body, ['propertyAddress', 'propertyNotes']));
  } else {
    Object.assign(data, pick(req.body, ['hourlyRate', 'hireDate']));
  }
  if (isAdmin && req.body.password) data.password = req.body.password;

  await user.update(data);
  res.json({ success: true, message: 'User updated successfully', data: { user: user.getPublicProfile() } });
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Deactivate an account (the record and its history are kept)
 * @access  Admin
 */
const deleteUser = wrap(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw httpError(404, 'User not found');
  if (user.id === req.user.id) throw httpError(400, 'You cannot deactivate your own account');
  await user.update({ isActive: false });
  res.json({ success: true, message: 'User deactivated successfully' });
});

/**
 * @route   GET /api/users/role/:role
 * @access  Manager, Admin
 */
const getUsersByRole = wrap(async (req, res) => {
  if (!ROLES.includes(req.params.role)) throw httpError(400, 'Invalid role');
  const users = await User.findAll({
    where: { role: req.params.role, isActive: true },
    attributes: SAFE_ATTRIBUTES,
    order: [['lastName', 'ASC'], ['firstName', 'ASC']]
  });
  res.json({ success: true, data: { users, count: users.length } });
});

module.exports = {
  getAllUsers, getContacts, getCustomerDirectory, getUserById, createUser, updateUser, deleteUser, getUsersByRole
};
