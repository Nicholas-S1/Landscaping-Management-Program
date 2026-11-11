import React, { useState } from 'react';
import { listItems } from '../services/resource';
import { Badge, Empty, Loading, Notice, PageHeader, fmtTime, personName, useLoad, ymd } from '../components/ui';
import JobCard from './JobCard';

const TABS = [
  { key: 'open', label: 'To do' },
  { key: 'completed', label: 'Completed' }
];

export const MyJobsPage: React.FC = () => {
  const [tab, setTab] = useState('open');
  const { data: jobs, loading, error, reload } = useLoad(() => listItems('/jobs', { mine: true }), []);
  const visible = (jobs || [])
    .filter((job) => (tab === 'open' ? ['pending', 'in_progress'].includes(job.status) : job.status === 'completed'))
    .sort((a, b) => (tab === 'open' ? String(a.scheduledDate).localeCompare(String(b.scheduledDate)) : 0));

  return (
    <div>
      <PageHeader title="My jobs" subtitle="Jobs assigned to you" />
      <div className="tabs" role="tablist">
        {TABS.map((item) => (
          <button key={item.key} role="tab" aria-selected={tab === item.key} className={`tab ${tab === item.key ? 'active' : ''}`} onClick={() => setTab(item.key)}>
            {item.label}
          </button>
        ))}
      </div>
      <Notice kind="error">{error}</Notice>
      {loading && !jobs ? (
        <Loading />
      ) : visible.length === 0 ? (
        <div className="card">
          <Empty>{tab === 'open' ? 'Nothing assigned to you right now.' : 'No completed jobs yet.'}</Empty>
        </div>
      ) : (
        visible.map((job) => <JobCard key={job.id} job={job} onChange={reload} />)
      )}
    </div>
  );
};

const startOfWeek = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
};

// One week of routes, jobs and appointments, day by day.
export const SchedulePage: React.FC = () => {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + index);
    return day;
  });
  const range = { from: ymd(days[0]), to: ymd(days[6]) };

  const { data, loading, error } = useLoad(
    async () => {
      const [routes, jobs, appointments] = await Promise.all([
        listItems('/routes', range, 'routes'),
        listItems('/jobs', range),
        listItems('/appointments', range)
      ]);
      return { routes, jobs, appointments };
    },
    [range.from]
  );

  const shift = (weeks: number) => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + weeks * 7);
    setWeekStart(next);
  };

  return (
    <div>
      <PageHeader
        title="Schedule"
        subtitle={`${days[0].toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} – ${days[6].toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`}
      >
        <button className="button button-secondary" onClick={() => shift(-1)}>
          ← Previous
        </button>
        <button className="button button-secondary" onClick={() => setWeekStart(startOfWeek(new Date()))}>
          This week
        </button>
        <button className="button button-secondary" onClick={() => shift(1)}>
          Next →
        </button>
      </PageHeader>
      <Notice kind="error">{error}</Notice>
      <div className="card">
        {loading && !data ? (
          <Loading />
        ) : (
          days.map((day) => {
            const key = ymd(day);
            const routes = (data?.routes || []).filter((route) => route.scheduledDate === key);
            const jobs = (data?.jobs || []).filter((job) => job.scheduledDate === key);
            const appointments = (data?.appointments || []).filter((appointment) => appointment.appointmentDate === key);
            const empty = routes.length + jobs.length + appointments.length === 0;
            return (
              <div key={key} className={`day ${key === ymd() ? 'today' : ''}`}>
                <div>
                  <div className="day-name">{day.toLocaleDateString(undefined, { weekday: 'long' })}</div>
                  <div className="muted small">{day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                </div>
                <div>
                  {empty && <Empty>Nothing scheduled</Empty>}
                  {routes.map((route) => (
                    <div key={route.id} className="day-item">
                      <span className="kind">Route</span>
                      <strong>{route.name}</strong>
                      <span className="muted">
                        {route.truck ? route.truck.name : 'No truck assigned'} · {route.customers?.length || 0} stops
                        {route.startTime && ` · ${fmtTime(route.startTime)}`}
                      </span>
                      <Badge value={route.status} />
                    </div>
                  ))}
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="day-item">
                      <span className="kind">Appointment</span>
                      <strong>
                        {fmtTime(appointment.startTime)} {appointment.title}
                      </strong>
                      <span className="muted">{personName(appointment.customer)}</span>
                      <Badge value={appointment.status} />
                    </div>
                  ))}
                  {jobs.map((job) => (
                    <div key={job.id} className="day-item">
                      <span className="kind">Job</span>
                      <strong>{job.title}</strong>
                      <span className="muted">
                        {personName(job.customer)}
                        {job.assignedTo && ` · ${personName(job.assignedTo)}`}
                      </span>
                      <Badge value={job.status} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
