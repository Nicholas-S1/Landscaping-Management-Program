const { Op } = require('sequelize');
const { sequelize, Inventory } = require('../models');
const { wrap, httpError, pick, sendList, findOr404 } = require('../utils/crud');

const FIELDS = [
  'name', 'sku', 'category', 'currentQuantity', 'unit', 'reorderLevel', 'reorderQuantity',
  'unitCost', 'supplier', 'location', 'notes'
];

const lowStockWhere = {
  reorderLevel: { [Op.ne]: null },
  currentQuantity: { [Op.lte]: sequelize.col('reorder_level') }
};

const listInventory = wrap(async (req, res) => {
  const where = req.query.low === 'true' ? { ...lowStockWhere } : {};
  if (req.query.category) where.category = req.query.category;
  await sendList(Inventory, req, res, { where, order: [['name', 'ASC']] });
});

const createInventory = wrap(async (req, res) => {
  const item = await Inventory.create(pick(req.body, FIELDS));
  res.status(201).json({ success: true, message: 'Inventory item created', data: { item } });
});

const updateInventory = wrap(async (req, res) => {
  const item = await findOr404(Inventory, req.params.id);
  await item.update(pick(req.body, FIELDS));
  res.json({ success: true, message: 'Inventory item updated', data: { item } });
});

const adjustInventory = wrap(async (req, res) => {
  const delta = Number(req.body.delta);
  if (!Number.isFinite(delta) || delta === 0) throw httpError(400, 'delta must be a non-zero number');
  const item = await findOr404(Inventory, req.params.id);
  if (item.currentQuantity + delta < 0) throw httpError(400, 'Quantity cannot go below zero');
  await item.update({ currentQuantity: item.currentQuantity + delta });
  res.json({ success: true, message: 'Quantity adjusted', data: { item } });
});

const deleteInventory = wrap(async (req, res) => {
  const item = await findOr404(Inventory, req.params.id);
  await item.destroy();
  res.json({ success: true, message: 'Inventory item deleted' });
});

module.exports = { listInventory, createInventory, updateInventory, adjustInventory, deleteInventory, lowStockWhere };
