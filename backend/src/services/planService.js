const { Op } = require('sequelize');
const { ServicePlan, Job } = require('../models');
const { createInvoice } = require('./invoiceService');
const { localDate, addDays, addMonths } = require('../utils/dates');

const advanceBillingDate = (date, cycle) => {
  if (cycle === 'weekly') return addDays(date, 7);
  if (cycle === 'quarterly') return addMonths(date, 3);
  if (cycle === 'annually') return addMonths(date, 12);
  return addMonths(date, 1);
};

// 'custom' plans have no fixed cadence, so no jobs are generated for them.
const advanceServiceDate = (date, planType) => {
  if (planType === 'weekly') return addDays(date, 7);
  if (planType === 'bi-weekly') return addDays(date, 14);
  if (planType === 'monthly') return addMonths(date, 1);
  if (planType === 'seasonal') return addMonths(date, 3);
  return null;
};

const parseDateOnly = (value) => new Date(`${value}T00:00:00`);

const runPlanBilling = async () => {
  const now = new Date();
  const plans = await ServicePlan.findAll({ where: { status: 'active' } });
  let invoicesCreated = 0;
  let plansExpired = 0;

  for (const plan of plans) {
    if (plan.endDate && new Date(plan.endDate) < now && !plan.autoRenew) {
      await plan.update({ status: 'expired' });
      plansExpired += 1;
      continue;
    }

    let billingDate = new Date(plan.nextBillingDate || plan.startDate);
    while (billingDate <= now) {
      await createInvoice({
        customerId: plan.customerId,
        lineItems: [{ description: `${plan.planName} (${plan.billingCycle} service plan)`, quantity: 1, rate: plan.recurringAmount }],
        dueDate: addDays(now, 14),
        status: 'sent',
        notes: `Service plan billing for ${localDate(billingDate)}`
      });
      invoicesCreated += 1;
      billingDate = advanceBillingDate(billingDate, plan.billingCycle);
    }
    if (!plan.nextBillingDate || new Date(plan.nextBillingDate).getTime() !== billingDate.getTime()) {
      await plan.update({ nextBillingDate: billingDate });
    }
  }

  return { invoicesCreated, plansExpired };
};

// Creates pending jobs one week ahead for every active recurring plan.
const generatePlanJobs = async () => {
  const horizon = addDays(new Date(), 7);
  const plans = await ServicePlan.findAll({ where: { status: 'active', planType: { [Op.ne]: 'custom' } } });
  let jobsCreated = 0;

  for (const plan of plans) {
    const start = plan.nextServiceDate || localDate(new Date(plan.startDate));
    let serviceDate = parseDateOnly(start);
    const planEnd = plan.endDate && !plan.autoRenew ? new Date(plan.endDate) : null;

    while (serviceDate && serviceDate <= horizon && (!planEnd || serviceDate <= planEnd)) {
      await Job.create({
        customerId: plan.customerId,
        title: plan.planName,
        description: Array.isArray(plan.servicesIncluded) ? plan.servicesIncluded.join(', ') : plan.description,
        scheduledDate: localDate(serviceDate),
        status: 'pending',
        internalNotes: 'Generated from service plan (billed through the plan, not per job)'
      });
      jobsCreated += 1;
      serviceDate = advanceServiceDate(serviceDate, plan.planType);
    }
    if (serviceDate && localDate(serviceDate) !== plan.nextServiceDate) {
      await plan.update({ nextServiceDate: localDate(serviceDate) });
    }
  }

  return { jobsCreated };
};

module.exports = { runPlanBilling, generatePlanJobs };
