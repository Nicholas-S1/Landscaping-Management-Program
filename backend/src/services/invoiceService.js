const { Op } = require('sequelize');
const { Invoice } = require('../models');
const { addDays } = require('../utils/dates');

const round2 = (value) => Math.round(Number(value) * 100) / 100;

const normalizeLineItems = (lineItems = []) =>
  lineItems.map((item) => {
    const quantity = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    return { description: item.description || '', quantity, rate, amount: round2(quantity * rate) };
  });

const computeTotals = ({ lineItems = [], taxRate = 0, discountAmount = 0 }) => {
  const items = normalizeLineItems(lineItems);
  const subtotal = round2(items.reduce((sum, item) => sum + item.amount, 0));
  const taxAmount = round2((subtotal * (Number(taxRate) || 0)) / 100);
  const discount = round2(discountAmount || 0);
  return {
    lineItems: items,
    subtotal,
    taxRate: Number(taxRate) || 0,
    taxAmount,
    discountAmount: discount,
    totalAmount: round2(Math.max(subtotal + taxAmount - discount, 0))
  };
};

const nextInvoiceNumber = async () => {
  const prefix = `INV-${new Date().getFullYear()}-`;
  const latest = await Invoice.findOne({
    where: { invoiceNumber: { [Op.like]: `${prefix}%` } },
    order: [['invoiceNumber', 'DESC']]
  });
  const sequence = latest ? parseInt(latest.invoiceNumber.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(sequence).padStart(5, '0')}`;
};

const createInvoice = async ({ customerId, jobId = null, lineItems, taxRate, discountAmount, dueDate, status = 'draft', notes = null, termsAndConditions = null }) => {
  const totals = computeTotals({ lineItems, taxRate, discountAmount });
  // Two invoices created at the same moment can pick the same number; the unique index rejects one, so retry.
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await Invoice.create({
        ...totals,
        invoiceNumber: await nextInvoiceNumber(),
        customerId,
        jobId,
        dueDate: dueDate || addDays(new Date(), 30),
        status,
        notes,
        termsAndConditions
      });
    } catch (error) {
      if (error.name !== 'SequelizeUniqueConstraintError' || attempt >= 4) throw error;
    }
  }
};

const markOverdueInvoices = async () => {
  const [count] = await Invoice.update(
    { status: 'overdue' },
    { where: { status: 'sent', dueDate: { [Op.lt]: new Date() } } }
  );
  return count;
};

module.exports = { computeTotals, createInvoice, markOverdueInvoices, round2 };
