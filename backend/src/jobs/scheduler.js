const cron = require('node-cron');
const { markOverdueInvoices } = require('../services/invoiceService');
const { runPlanBilling, generatePlanJobs } = require('../services/planService');

const runDailyTasks = async () => {
  try {
    const overdue = await markOverdueInvoices();
    const billing = await runPlanBilling();
    const jobs = await generatePlanJobs();
    console.log(`Scheduled tasks: ${overdue} invoices marked overdue, ${billing.invoicesCreated} plan invoices, ${jobs.jobsCreated} plan jobs`);
  } catch (error) {
    console.error('Scheduled tasks failed:', error);
  }
};

const startScheduler = () => {
  runDailyTasks();
  cron.schedule('15 2 * * *', runDailyTasks);
  cron.schedule('0 * * * *', () => markOverdueInvoices().catch((error) => console.error('Overdue check failed:', error)));
};

module.exports = { startScheduler, runDailyTasks };
