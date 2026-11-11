const { Op } = require('sequelize');
const { Equipment, MaintenanceLog, User } = require('../models');
const { wrap, isManager, pick, sendList, findOr404 } = require('../utils/crud');
const { addDays } = require('../utils/dates');

const FIELDS = [
  'name', 'category', 'brand', 'model', 'serialNumber', 'purchaseDate', 'purchasePrice', 'status',
  'currentHours', 'lastMaintenanceDate', 'nextMaintenanceDate', 'maintenanceIntervalHours',
  'assignedToId', 'location', 'notes'
];
const include = [{ model: User, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName'] }];

const listEquipment = wrap(async (req, res) => {
  const { status, category, mine, due } = req.query;
  const where = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (mine === 'true') where.assignedToId = req.user.id;
  if (due === 'true') {
    where.status = { [Op.ne]: 'retired' };
    where[Op.or] = [{ status: 'maintenance' }, { nextMaintenanceDate: { [Op.lte]: addDays(new Date(), 7) } }];
  }
  await sendList(Equipment, req, res, { where, include, order: [['name', 'ASC']] });
});

const getEquipment = wrap(async (req, res) => {
  const item = await findOr404(Equipment, req.params.id, { include });
  res.json({ success: true, data: { item } });
});

const createEquipment = wrap(async (req, res) => {
  const item = await Equipment.create(pick(req.body, FIELDS));
  res.status(201).json({ success: true, message: 'Equipment created', data: { item } });
});

const updateEquipment = wrap(async (req, res) => {
  const item = await findOr404(Equipment, req.params.id);
  await item.update(pick(req.body, FIELDS));
  res.json({ success: true, message: 'Equipment updated', data: { item: await item.reload({ include }) } });
});

const deleteEquipment = wrap(async (req, res) => {
  const item = await findOr404(Equipment, req.params.id);
  await item.update({ status: 'retired', assignedToId: null });
  res.json({ success: true, message: 'Equipment retired' });
});

const listMaintenance = wrap(async (req, res) => {
  await findOr404(Equipment, req.params.id);
  await sendList(MaintenanceLog, req, res, {
    where: { equipmentId: req.params.id },
    include: [{ model: User, as: 'performedBy', attributes: ['id', 'firstName', 'lastName'] }],
    order: [['maintenanceDate', 'DESC']]
  });
});

const logMaintenance = wrap(async (req, res) => {
  const equipment = await findOr404(Equipment, req.params.id);
  const data = pick(req.body, [
    'maintenanceType', 'description', 'partsReplaced', 'cost', 'hoursAtMaintenance', 'maintenanceDate', 'nextMaintenanceDue'
  ]);
  const log = await MaintenanceLog.create({
    ...data,
    equipmentId: equipment.id,
    performedById: isManager(req.user) && req.body.performedById ? req.body.performedById : req.user.id
  });

  const changes = { lastMaintenanceDate: log.maintenanceDate };
  if (log.nextMaintenanceDue) changes.nextMaintenanceDate = log.nextMaintenanceDue;
  if (log.hoursAtMaintenance != null) changes.currentHours = log.hoursAtMaintenance;
  if (req.body.returnToService) changes.status = 'available';
  await equipment.update(changes);

  res.status(201).json({ success: true, message: 'Maintenance logged', data: { item: log, equipment } });
});

module.exports = {
  listEquipment, getEquipment, createEquipment, updateEquipment, deleteEquipment, listMaintenance, logMaintenance
};
