import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { personOptions, useStaff } from '../hooks/usePeople';
import { deleteData, errorMessage, getData, listItems, postData, putData } from '../services/resource';
import {
  Badge, DataTable, Loading, Modal, Notice, PageHeader, RecordForm, Stat,
  fmtClock, fmtDate, label, options, personName, useLoad, ymd
} from '../components/ui';

const hours = (entry: any) => (entry.totalHours != null ? entry.totalHours.toFixed(2) : entry.clockOut ? '—' : 'On the clock');

const startOfWeek = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
};

export const TimesheetPage: React.FC = () => {
  const entries = useLoad(() => listItems('/time-entries', {}, 'timeEntries'), []);
  const week = useLoad(() => getData('/time-entries/summary', { startDate: startOfWeek().toISOString(), endDate: new Date().toISOString() }), []);

  return (
    <div>
      <PageHeader title="My timesheet" subtitle="Your clock-in and clock-out history. Ask a manager if an entry needs correcting." />
      <Notice kind="error">{entries.error || week.error}</Notice>
      <div className="stats">
        <Stat label="Hours this week" value={week.data ? week.data.totalHours.toFixed(2) : '—'} />
        <Stat label="Shifts this week" value={week.data ? week.data.totalDays : '—'} />
      </div>
      <div className="card">
        {entries.loading && !entries.data ? (
          <Loading />
        ) : (
          <DataTable
            empty="No time entries yet. Clock in from the Today page."
            rows={entries.data || []}
            columns={[
              { header: 'Date', render: (entry) => fmtDate(entry.clockIn) },
              { header: 'In', render: (entry) => fmtClock(entry.clockIn) },
              { header: 'Out', render: (entry) => fmtClock(entry.clockOut) },
              { header: 'Hours', align: 'right', render: hours },
              { header: 'Note', render: (entry) => (entry.adjuster ? `Adjusted by ${personName(entry.adjuster)}${entry.adjustmentReason ? `: ${entry.adjustmentReason}` : ''}` : entry.notes || '') }
            ]}
          />
        )}
      </div>
    </div>
  );
};

// ISO timestamp <-> value for <input type="datetime-local">
const toLocalInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return `${ymd(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const TimecardsPage: React.FC = () => {
  const { data: staff } = useStaff();
  const [userId, setUserId] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ clockIn: '', clockOut: '', adjustmentReason: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const entries = useLoad(() => listItems('/time-entries', userId ? { userId } : { all: true }, 'timeEntries'), [userId]);

  const open = (entry: any) => {
    setError('');
    setEditing(entry);
    setForm({ clockIn: toLocalInput(entry.clockIn), clockOut: toLocalInput(entry.clockOut), adjustmentReason: '' });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.clockOut && new Date(form.clockOut) <= new Date(form.clockIn)) {
      setError('Clock-out must be after clock-in.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await putData(`/time-entries/${editing.id}`, {
        clockIn: new Date(form.clockIn).toISOString(),
        clockOut: form.clockOut ? new Date(form.clockOut).toISOString() : null,
        adjustmentReason: form.adjustmentReason
      });
      setEditing(null);
      entries.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Timecards" subtitle="Review and correct employee time entries">
        <select aria-label="Employee" value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">All employees</option>
          {personOptions(staff).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </PageHeader>
      <Notice kind="error">{entries.error}</Notice>
      <div className="card">
        {entries.loading && !entries.data ? (
          <Loading />
        ) : (
          <DataTable
            empty="No time entries."
            rows={entries.data || []}
            columns={[
              { header: 'Employee', render: (entry) => personName(entry.employee) },
              { header: 'Date', render: (entry) => fmtDate(entry.clockIn) },
              { header: 'In', render: (entry) => fmtClock(entry.clockIn) },
              { header: 'Out', render: (entry) => fmtClock(entry.clockOut) },
              { header: 'Hours', align: 'right', render: hours },
              { header: 'Adjustment', render: (entry) => (entry.adjuster ? `${personName(entry.adjuster)}${entry.adjustmentReason ? `: ${entry.adjustmentReason}` : ''}` : '') }
            ]}
            actions={(entry) => (
              <button className="link-button" onClick={() => open(entry)}>
                Adjust
              </button>
            )}
          />
        )}
      </div>
      {editing && (
        <Modal title={`Adjust time: ${personName(editing.employee)}`} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <Notice kind="error">{error}</Notice>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="adjust-in">Clock in</label>
                <input id="adjust-in" type="datetime-local" required value={form.clockIn} onChange={(e) => setForm({ ...form, clockIn: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="adjust-out">Clock out</label>
                <input id="adjust-out" type="datetime-local" value={form.clockOut} onChange={(e) => setForm({ ...form, clockOut: e.target.value })} />
              </div>
              <div className="field field-full">
                <label htmlFor="adjust-reason">Reason for the change *</label>
                <input id="adjust-reason" required value={form.adjustmentReason} onChange={(e) => setForm({ ...form, adjustmentReason: e.target.value })} />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="button button-secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="button" disabled={saving}>
                {saving ? 'Saving…' : 'Save adjustment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export const TimeOffPage: React.FC = () => {
  const { user } = useAuth();
  const manages = user?.role === 'manager' || user?.role === 'admin';
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const { data: requests, loading, error: loadError, reload } = useLoad(() => listItems('/time-off'), []);

  const run = async (action: () => Promise<any>) => {
    setError('');
    try {
      await action();
      reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader title="Time off" subtitle={manages ? 'Approve or deny requests from your team' : 'Request days off and see the status of your requests'}>
        <button className="button" onClick={() => setRequesting(true)}>
          Request time off
        </button>
      </PageHeader>
      <Notice kind="error">{error || loadError}</Notice>
      <div className="card">
        {loading && !requests ? (
          <Loading />
        ) : (
          <DataTable
            empty="No time-off requests."
            rows={requests || []}
            columns={[
              ...(manages ? [{ header: 'Employee', render: (request: any) => personName(request.employee) }] : []),
              { header: 'Dates', render: (request) => (request.startDate === request.endDate ? fmtDate(request.startDate) : `${fmtDate(request.startDate)} – ${fmtDate(request.endDate)}`) },
              { header: 'Type', render: (request) => label(request.type) },
              { header: 'Reason', render: (request) => request.reason || '' },
              { header: 'Status', render: (request) => (<><Badge value={request.status} />{request.reviewedBy && <div className="muted small">by {personName(request.reviewedBy)}</div>}</>) }
            ]}
            actions={(request) =>
              request.status !== 'pending' ? null : request.userId === user?.id ? (
                <button className="link-button danger" onClick={() => run(() => deleteData(`/time-off/${request.id}`))}>
                  Withdraw
                </button>
              ) : manages ? (
                <>
                  <button className="link-button" onClick={() => run(() => putData(`/time-off/${request.id}/review`, { status: 'approved' }))}>
                    Approve
                  </button>
                  <button className="link-button danger" onClick={() => run(() => putData(`/time-off/${request.id}/review`, { status: 'denied' }))}>
                    Deny
                  </button>
                </>
              ) : null
            }
          />
        )}
      </div>
      {requesting && (
        <Modal title="Request time off" onClose={() => setRequesting(false)}>
          <RecordForm
            submitLabel="Submit request"
            initial={{ type: 'vacation', startDate: ymd(), endDate: ymd() }}
            fields={[
              { name: 'startDate', label: 'First day off', type: 'date', required: true },
              { name: 'endDate', label: 'Last day off', type: 'date', required: true },
              { name: 'type', label: 'Type', type: 'select', options: options(['vacation', 'sick', 'personal', 'other']), required: true },
              { name: 'reason', label: 'Reason (optional)', type: 'textarea' }
            ]}
            onCancel={() => setRequesting(false)}
            onSubmit={async (payload) => {
              await postData('/time-off', payload);
              setRequesting(false);
              reload();
            }}
          />
        </Modal>
      )}
    </div>
  );
};
