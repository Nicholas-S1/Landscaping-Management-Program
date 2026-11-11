import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getData, listItems } from '../services/resource';
import { Badge, DataTable, Empty, Loading, Notice, PageHeader, Stat, fmtDate, money, personName, useLoad, ymd } from '../components/ui';

const sum = (counts: Record<string, number> = {}) => Object.values(counts).reduce((total, count) => total + count, 0);

// Manager and owner home page: what is happening today and what needs attention.
export const OverviewPage: React.FC = () => {
  const { user } = useAuth();
  const ops = useLoad(() => getData('/reports/operations'), []);
  const routes = useLoad(() => listItems('/routes', { date: ymd() }, 'routes'), []);
  const requests = useLoad(() => listItems('/jobs', { status: 'pending' }), []);
  const unscheduled = (requests.data || []).filter((job) => !job.assignedTo || !job.scheduledDate);
  const data = ops.data;

  return (
    <div>
      <PageHeader title={`Welcome, ${user?.firstName}`} subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} />
      <Notice kind="error">{ops.error || routes.error}</Notice>
      {!data ? (
        <Loading />
      ) : (
        <>
          <div className="stats">
            <Stat label="Jobs today" value={sum(data.jobsToday)} />
            <Stat label="Completed today" value={data.jobsToday.completed || 0} />
            <Stat label="In progress" value={data.jobsToday.in_progress || 0} />
            <Stat label="People clocked in" value={data.activeCrews} />
          </div>
          <div className="stats">
            <Stat label="Equipment needing maintenance" value={data.maintenanceDue} tone={data.maintenanceDue ? 'warn' : undefined} />
            <Stat label="Low-stock supplies" value={data.lowStock} tone={data.lowStock ? 'warn' : undefined} />
            <Stat label="Time-off requests waiting" value={data.pendingTimeOff} tone={data.pendingTimeOff ? 'warn' : undefined} />
            <Stat label="Active customers" value={data.customers} />
          </div>
        </>
      )}

      <div className="grid">
        <div className="card">
          <div className="card-head">
            <h2>Today's routes</h2>
            <Link to="/routes">Manage routes</Link>
          </div>
          {!routes.data ? (
            <Loading />
          ) : routes.data.length === 0 ? (
            <Empty>No routes scheduled today.</Empty>
          ) : (
            <ul className="list">
              {routes.data.map((route) => {
                const stops = route.customers || [];
                return (
                  <li key={route.id} className="spread">
                    <div>
                      <strong>{route.name}</strong>
                      <div className="muted small">
                        {route.truck ? route.truck.name : 'No truck assigned'} · {stops.filter((stop: any) => stop.status === 'completed').length} of {stops.length} stops done
                      </div>
                    </div>
                    <Badge value={route.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="card">
          <div className="card-head">
            <h2>Needs scheduling</h2>
            <Link to="/jobs">All jobs</Link>
          </div>
          {!requests.data ? (
            <Loading />
          ) : unscheduled.length === 0 ? (
            <Empty>Every pending job has a date and a person assigned.</Empty>
          ) : (
            <ul className="list">
              {unscheduled.slice(0, 8).map((job) => (
                <li key={job.id}>
                  <strong>{job.title}</strong>
                  <div className="muted small">
                    {personName(job.customer)} · {job.scheduledDate ? fmtDate(job.scheduledDate) : 'no date'} · {job.assignedTo ? personName(job.assignedTo) : 'unassigned'}
                    {job.customerNotes && ' · customer request'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

const useRange = () => {
  const [end, setEnd] = useState(ymd());
  const [start, setStart] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return ymd(date);
  });
  const picker = (
    <>
      <label className="row small">
        From <input type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} />
      </label>
      <label className="row small">
        To <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
      </label>
    </>
  );
  return { start, end, picker };
};

export const ReportsPage: React.FC = () => {
  const { start, end, picker } = useRange();
  const { data, error } = useLoad(() => getData('/reports/operations', { start, end }), [start, end]);

  return (
    <div>
      <PageHeader title="Reports" subtitle="Employee productivity, route completion and equipment status">
        {picker}
      </PageHeader>
      <Notice kind="error">{error}</Notice>
      {!data ? (
        <Loading />
      ) : (
        <>
          <div className="stats">
            <Stat label="Jobs completed (all time)" value={data.jobsByStatus.completed || 0} />
            <Stat label="Jobs pending" value={data.jobsByStatus.pending || 0} />
            <Stat label="Team members" value={data.employees} />
            <Stat label="Equipment in maintenance" value={data.equipmentByStatus.maintenance || 0} />
          </div>
          <div className="card">
            <h2>Employee productivity</h2>
            <DataTable
              empty="No employees."
              rows={data.productivity}
              columns={[
                { header: 'Employee', render: (row) => personName(row) },
                { header: 'Hours worked', align: 'right', render: (row) => row.hoursWorked.toFixed(2) },
                { header: 'Jobs completed', align: 'right', render: (row) => row.jobsCompleted },
                { header: 'Hours per job', align: 'right', render: (row) => (row.jobsCompleted ? (row.hoursWorked / row.jobsCompleted).toFixed(2) : '—') }
              ]}
            />
          </div>
          <div className="card">
            <h2>Routes</h2>
            <DataTable
              empty="No routes in this period."
              rows={data.routes}
              columns={[
                { header: 'Date', render: (route) => fmtDate(route.scheduledDate) },
                { header: 'Route', render: (route) => route.name },
                { header: 'Stops completed', render: (route) => `${route.stopsCompleted} of ${route.stops}` },
                { header: 'Time taken', align: 'right', render: (route) => (route.actualMinutes != null ? `${route.actualMinutes} min` : '—') },
                { header: 'Status', render: (route) => <Badge value={route.status} /> }
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
};

export const FinancesPage: React.FC = () => {
  const { start, end, picker } = useRange();
  const { data, error } = useLoad(() => getData('/reports/finances', { start, end }), [start, end]);

  return (
    <div>
      <PageHeader title="Finances" subtitle="Money in, money owed and what the work cost. Visible to the owner only.">
        {picker}
      </PageHeader>
      <Notice kind="error">{error}</Notice>
      {!data ? (
        <Loading />
      ) : (
        <>
          <div className="stats">
            <Stat label="Collected in period" value={money(data.collected)} />
            <Stat label="Invoiced in period" value={money(data.invoiced)} />
            <Stat label="Owed to you now" value={money(data.outstanding)} />
            <Stat label="Overdue now" value={money(data.overdue)} tone={data.overdue > 0 ? 'warn' : undefined} />
          </div>
          <div className="grid">
            <div className="card">
              <h2>Costs in period</h2>
              <table>
                <tbody>
                  <tr><td>Labor ({data.laborHours.toFixed(1)} hours at each person's hourly rate)</td><td className="right">{money(data.laborCost)}</td></tr>
                  <tr><td>Materials used on jobs</td><td className="right">{money(data.materialsCost)}</td></tr>
                  <tr><td>Equipment maintenance</td><td className="right">{money(data.maintenanceCost)}</td></tr>
                  <tr><td><strong>Total tracked costs</strong></td><td className="right"><strong>{money(data.expenses)}</strong></td></tr>
                  <tr><td><strong>Collected minus tracked costs</strong></td><td className="right"><strong>{money(data.net)}</strong></td></tr>
                </tbody>
              </table>
              <p className="muted small" style={{ marginTop: 10 }}>
                Only costs recorded in this system are included (no fuel, insurance, taxes or other overhead), so this is not a profit figure.
              </p>
            </div>
            <div className="card">
              <h2>Business</h2>
              <table>
                <tbody>
                  <tr><td>Active service plans</td><td className="right">{data.activePlans}</td></tr>
                  <tr><td>Recurring plan billing (per cycle)</td><td className="right">{money(data.planRecurringTotal)}</td></tr>
                  <tr><td>New customers in period</td><td className="right">{data.newCustomers}</td></tr>
                  <tr><td>Value of supplies on hand</td><td className="right">{money(data.inventoryValue)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="card" style={{ marginTop: 18 }}>
            <h2>Payments received by month</h2>
            <DataTable
              empty="No payments recorded in the last 12 months."
              rows={data.revenueByMonth.map((row: any) => ({ ...row, id: row.month }))}
              columns={[
                { header: 'Month', render: (row) => new Date(`${row.month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) },
                { header: 'Received', align: 'right', render: (row) => money(row.revenue) }
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
};
