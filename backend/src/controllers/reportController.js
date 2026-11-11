const { Op, QueryTypes } = require('sequelize');
const { sequelize, Job, User, TimeEntry, Equipment, Inventory, TimeOffRequest } = require('../models');
const { wrap } = require('../utils/crud');
const { localDate, addDays } = require('../utils/dates');
const { lowStockWhere } = require('./inventoryController');

const select = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

// Reports cover the last 30 days unless ?start=YYYY-MM-DD&end=YYYY-MM-DD is given.
const getRange = (query) => {
  const end = query.end ? new Date(`${query.end}T23:59:59`) : new Date();
  const start = query.start ? new Date(`${query.start}T00:00:00`) : addDays(end, -30);
  return { start, end };
};

const countByStatus = async (Model, where = {}) => {
  const rows = await Model.findAll({
    where,
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    group: ['status'],
    raw: true
  });
  return rows.reduce((result, row) => ({ ...result, [row.status]: Number(row.count) }), {});
};

const operationsReport = wrap(async (req, res) => {
  const { start, end } = getRange(req.query);
  const today = localDate();

  const [
    jobsByStatus, jobsToday, activeCrews, employees, customers, equipmentByStatus,
    maintenanceDue, lowStock, pendingTimeOff, productivity, routes
  ] = await Promise.all([
    countByStatus(Job),
    countByStatus(Job, { scheduledDate: today }),
    TimeEntry.count({ where: { clockOut: null } }),
    User.count({ where: { role: { [Op.in]: ['employee', 'manager'] }, isActive: true } }),
    User.count({ where: { role: 'customer', isActive: true } }),
    countByStatus(Equipment),
    Equipment.count({
      where: {
        status: { [Op.ne]: 'retired' },
        [Op.or]: [{ status: 'maintenance' }, { nextMaintenanceDate: { [Op.lte]: addDays(new Date(), 7) } }]
      }
    }),
    Inventory.count({ where: lowStockWhere }),
    TimeOffRequest.count({ where: { status: 'pending' } }),
    select(
      `SELECT u.id, u.first_name AS "firstName", u.last_name AS "lastName",
              COALESCE(t.hours, 0)::float AS "hoursWorked",
              COALESCE(j.completed, 0)::int AS "jobsCompleted"
         FROM users u
         LEFT JOIN (SELECT user_id, SUM(total_hours) AS hours FROM time_entries
                     WHERE clock_in BETWEEN :start AND :end GROUP BY user_id) t ON t.user_id = u.id
         LEFT JOIN (SELECT completed_by, COUNT(*) AS completed FROM jobs
                     WHERE completed_at BETWEEN :start AND :end GROUP BY completed_by) j ON j.completed_by = u.id
        WHERE u.role IN ('employee', 'manager') AND u.is_active
        ORDER BY "hoursWorked" DESC, u.last_name`,
      { start, end }
    ),
    select(
      `SELECT r.id, r.name, r.scheduled_date AS "scheduledDate", r.status,
              COUNT(rc.id)::int AS "stops",
              COUNT(rc.id) FILTER (WHERE rc.status = 'completed')::int AS "stopsCompleted",
              ROUND(EXTRACT(EPOCH FROM (r.actual_end_time - r.actual_start_time)) / 60)::int AS "actualMinutes",
              r.estimated_duration AS "estimatedMinutes"
         FROM routes r LEFT JOIN route_customers rc ON rc.route_id = r.id
        WHERE r.scheduled_date BETWEEN :startDate AND :endDate
        GROUP BY r.id ORDER BY r.scheduled_date DESC LIMIT 50`,
      { startDate: localDate(start), endDate: localDate(end) }
    )
  ]);

  res.json({
    success: true,
    data: {
      range: { start, end },
      jobsByStatus, jobsToday, activeCrews, employees, customers, equipmentByStatus,
      maintenanceDue, lowStock, pendingTimeOff, productivity, routes
    }
  });
});

const financeReport = wrap(async (req, res) => {
  const { start, end } = getRange(req.query);

  const [revenueByMonth, [invoiceTotals], [labor], [maintenance], [inventory], [plans], [newCustomers], completedJobs] =
    await Promise.all([
      select(
        `SELECT to_char(date_trunc('month', COALESCE(paid_at, updated_at)), 'YYYY-MM') AS month,
                SUM(paid_amount)::float AS revenue
           FROM invoices
          WHERE paid_amount > 0 AND COALESCE(paid_at, updated_at) >= date_trunc('month', NOW()) - INTERVAL '11 months'
          GROUP BY 1 ORDER BY 1`
      ),
      select(
        `SELECT COALESCE(SUM(total_amount) FILTER (WHERE status <> 'cancelled' AND status <> 'draft'
                                                    AND invoice_date BETWEEN :start AND :end), 0)::float AS invoiced,
                COALESCE(SUM(paid_amount) FILTER (WHERE COALESCE(paid_at, updated_at) BETWEEN :start AND :end), 0)::float AS collected,
                COALESCE(SUM(total_amount - paid_amount) FILTER (WHERE status IN ('sent', 'overdue')), 0)::float AS outstanding,
                COALESCE(SUM(total_amount - paid_amount) FILTER (WHERE status = 'overdue'), 0)::float AS overdue
           FROM invoices`,
        { start, end }
      ),
      select(
        `SELECT COALESCE(SUM(t.total_hours), 0)::float AS hours,
                COALESCE(SUM(t.total_hours * COALESCE(u.hourly_rate, 0)), 0)::float AS cost
           FROM time_entries t JOIN users u ON u.id = t.user_id
          WHERE t.clock_in BETWEEN :start AND :end`,
        { start, end }
      ),
      select(
        `SELECT COALESCE(SUM(cost), 0)::float AS cost FROM maintenance_logs WHERE maintenance_date BETWEEN :start AND :end`,
        { start, end }
      ),
      select(`SELECT COALESCE(SUM(current_quantity * COALESCE(unit_cost, 0)), 0)::float AS value FROM inventory`),
      select(
        `SELECT COUNT(*)::int AS active, COALESCE(SUM(recurring_amount), 0)::float AS "recurringTotal"
           FROM service_plans WHERE status = 'active'`
      ),
      select(
        `SELECT COUNT(*)::int AS count FROM users WHERE role = 'customer' AND created_at BETWEEN :start AND :end`,
        { start, end }
      ),
      Job.findAll({
        where: { status: 'completed', completedAt: { [Op.between]: [start, end] } },
        attributes: ['materialsUsed']
      })
    ]);

  const materialsCost = completedJobs.reduce(
    (total, job) =>
      total + (job.materialsUsed || []).reduce((sum, m) => sum + (Number(m.quantity) || 0) * (Number(m.unitCost) || 0), 0),
    0
  );
  const expenses = labor.cost + maintenance.cost + materialsCost;

  res.json({
    success: true,
    data: {
      range: { start, end },
      revenueByMonth,
      invoiced: invoiceTotals.invoiced,
      collected: invoiceTotals.collected,
      outstanding: invoiceTotals.outstanding,
      overdue: invoiceTotals.overdue,
      laborHours: labor.hours,
      laborCost: labor.cost,
      maintenanceCost: maintenance.cost,
      materialsCost: Math.round(materialsCost * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      net: Math.round((invoiceTotals.collected - expenses) * 100) / 100,
      inventoryValue: inventory.value,
      activePlans: plans.active,
      planRecurringTotal: plans.recurringTotal,
      newCustomers: newCustomers.count
    }
  });
});

module.exports = { operationsReport, financeReport };
