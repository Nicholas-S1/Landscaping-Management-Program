import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage, listItems, postData, putData } from '../services/resource';
import {
  Badge, Empty, Loading, Modal, Notice, PageHeader, PhotoStrip, RecordForm, Stat, fmtDate, fmtTime, label, money, options, useLoad, ymd
} from '../components/ui';

const JOB_TYPES = ['mowing', 'trimming', 'cleanup', 'planting', 'mulching', 'fertilizing', 'other'];
const isUpcoming = (job: any) => ['pending', 'in_progress'].includes(job.status);

export const CustomerHome: React.FC = () => {
  const { user } = useAuth();
  const invoices = useLoad(() => listItems('/invoices'), []);
  const jobs = useLoad(() => listItems('/jobs'), []);
  const plans = useLoad(() => listItems('/service-plans', { status: 'active' }), []);
  const appointments = useLoad(() => listItems('/appointments', { from: ymd() }), []);

  const due = (invoices.data || [])
    .filter((invoice) => ['sent', 'overdue'].includes(invoice.status))
    .reduce((total, invoice) => total + Number(invoice.totalAmount) - Number(invoice.paidAmount), 0);
  const upcoming = (jobs.data || []).filter(isUpcoming).sort((a, b) => String(a.scheduledDate || '9').localeCompare(String(b.scheduledDate || '9')));
  const booked = (appointments.data || []).filter((appointment) => !['cancelled', 'completed'].includes(appointment.status));

  return (
    <div>
      <PageHeader title={`Welcome, ${user?.firstName}`} subtitle={user?.propertyAddress || 'Add your property address under My property'} />
      <Notice kind="error">{invoices.error || jobs.error}</Notice>
      <div className="stats">
        <Stat label="Balance due" value={invoices.data ? money(due) : '—'} tone={due > 0 ? 'warn' : 'good'} />
        <Stat label="Upcoming visits" value={jobs.data ? upcoming.length : '—'} />
        <Stat label="Active service plans" value={plans.data ? plans.data.length : '—'} />
      </div>
      <div className="grid">
        <div className="card">
          <div className="card-head">
            <h2>Upcoming service</h2>
            <Link to="/services">Request a service</Link>
          </div>
          {!jobs.data ? (
            <Loading />
          ) : upcoming.length === 0 ? (
            <Empty>Nothing scheduled right now.</Empty>
          ) : (
            <ul className="list">
              {upcoming.slice(0, 5).map((job) => (
                <li key={job.id} className="spread">
                  <div>
                    <strong>{job.title}</strong>
                    <div className="muted small">{job.scheduledDate ? fmtDate(job.scheduledDate) : 'Date to be confirmed'}</div>
                  </div>
                  <Badge value={job.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <div className="card-head">
            <h2>Appointments</h2>
            <Link to="/appointments">Book or change</Link>
          </div>
          {!appointments.data ? (
            <Loading />
          ) : booked.length === 0 ? (
            <Empty>No upcoming appointments.</Empty>
          ) : (
            <ul className="list">
              {booked.slice(0, 5).map((appointment) => (
                <li key={appointment.id} className="spread">
                  <div>
                    <strong>{appointment.title}</strong>
                    <div className="muted small">
                      {fmtDate(appointment.appointmentDate)} at {fmtTime(appointment.startTime)}
                    </div>
                  </div>
                  <Badge value={appointment.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h2>My service plan</h2>
          {!plans.data ? (
            <Loading />
          ) : plans.data.length === 0 ? (
            <Empty>You do not have a recurring service plan. Message the office to set one up.</Empty>
          ) : (
            <ul className="list">
              {plans.data.map((plan) => (
                <li key={plan.id}>
                  <strong>{plan.planName}</strong>
                  <div className="muted small">
                    {label(plan.planType)} visits · {money(plan.recurringAmount)} {plan.billingCycle}
                    {plan.endDate && ` · ${plan.autoRenew ? 'renews' : 'ends'} ${fmtDate(plan.endDate)}`}
                  </div>
                  {plan.servicesIncluded?.length > 0 && <div className="small">{plan.servicesIncluded.join(', ')}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

// Customer view: request work, see what is coming up and what has been done.
export const ServicesPage: React.FC = () => {
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const { data: jobs, loading, error: loadError, reload } = useLoad(() => listItems('/jobs'), []);
  const upcoming = (jobs || []).filter(isUpcoming);
  const history = (jobs || []).filter((job) => !isUpcoming(job));

  const cancel = async (job: any) => {
    if (!window.confirm(`Cancel "${job.title}"?`)) return;
    setError('');
    try {
      await putData(`/jobs/${job.id}`, { status: 'cancelled' });
      reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const renderJob = (job: any) => (
    <li key={job.id}>
      <div className="spread">
        <div>
          <strong>{job.title}</strong>
          <div className="muted small">
            {label(job.jobType)} ·{' '}
            {job.status === 'completed' ? `Completed ${fmtDate(job.completedAt)}` : job.scheduledDate ? `Scheduled ${fmtDate(job.scheduledDate)}` : 'Date to be confirmed'}
          </div>
          {job.description && <div className="small">{job.description}</div>}
          {job.customerNotes && <div className="small muted">Your note: {job.customerNotes}</div>}
        </div>
        <div className="row">
          <Badge value={job.status} />
          {job.status === 'pending' && (
            <button className="link-button danger" onClick={() => cancel(job)}>
              Cancel
            </button>
          )}
        </div>
      </div>
      {(job.beforePhotos?.length > 0 || job.afterPhotos?.length > 0) && (
        <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}>
          {job.beforePhotos?.length > 0 && (
            <div>
              <div className="muted small">Before</div>
              <PhotoStrip photos={job.beforePhotos} />
            </div>
          )}
          {job.afterPhotos?.length > 0 && (
            <div>
              <div className="muted small">After</div>
              <PhotoStrip photos={job.afterPhotos} />
            </div>
          )}
        </div>
      )}
    </li>
  );

  return (
    <div>
      <PageHeader title="Services" subtitle="Upcoming visits, your service history, and requests for extra work">
        <button className="button" onClick={() => setRequesting(true)}>
          Request a service
        </button>
      </PageHeader>
      <Notice kind="error">{error || loadError}</Notice>
      <div className="card">
        <h2>Upcoming and requested</h2>
        {loading && !jobs ? <Loading /> : upcoming.length === 0 ? <Empty>Nothing scheduled right now.</Empty> : <ul className="list">{upcoming.map(renderJob)}</ul>}
      </div>
      <div className="card">
        <h2>Service history</h2>
        {loading && !jobs ? <Loading /> : history.length === 0 ? <Empty>No completed services yet.</Empty> : <ul className="list">{history.map(renderJob)}</ul>}
      </div>
      {requesting && (
        <Modal title="Request a service" onClose={() => setRequesting(false)}>
          <RecordForm
            submitLabel="Send request"
            initial={{ jobType: 'other' }}
            fields={[
              { name: 'title', label: 'What would you like done?', required: true, full: true, placeholder: 'Mulch the front flower beds' },
              { name: 'jobType', label: 'Type of work', type: 'select', options: options(JOB_TYPES), required: true },
              { name: 'scheduledDate', label: 'Preferred date', type: 'date' },
              { name: 'customerNotes', label: 'Details', type: 'textarea' }
            ]}
            onCancel={() => setRequesting(false)}
            onSubmit={async (payload) => {
              await postData('/jobs', payload);
              setRequesting(false);
              reload();
            }}
          />
          <p className="muted small" style={{ marginTop: 10 }}>
            The office will confirm the date and price with you.
          </p>
        </Modal>
      )}
    </div>
  );
};
