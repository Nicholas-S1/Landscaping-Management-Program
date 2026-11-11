import React, { useRef, useState } from 'react';
import ResourcePage from '../components/ResourcePage';
import { useAuth } from '../context/AuthContext';
import { personOptions, useCustomers, useStaff } from '../hooks/usePeople';
import { errorMessage, getData, listItems, postData, putData } from '../services/resource';
import {
  Badge, DataTable, FieldDef, Loading, Modal, Notice, RecordForm, fmtDate, fmtTime, label, money, options, personName, useLoad, ymd
} from '../components/ui';
import JobCard from './JobCard';

const JOB_TYPES = ['mowing', 'trimming', 'cleanup', 'planting', 'mulching', 'fertilizing', 'other'];
const JOB_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];

export const JobsPage: React.FC = () => {
  const { data: customers } = useCustomers();
  const { data: staff } = useStaff();
  const { data: routes } = useLoad(() => listItems('/routes', { from: ymd() }, 'routes'), []);
  const [openJob, setOpenJob] = useState<any | null>(null);
  const reloadList = useRef<() => void>(() => undefined);

  const fields: FieldDef[] = [
    { name: 'customerId', label: 'Customer', type: 'select', options: personOptions(customers), required: true },
    { name: 'title', label: 'Job title', required: true },
    { name: 'jobType', label: 'Type', type: 'select', options: options(JOB_TYPES), required: true },
    { name: 'priority', label: 'Priority', type: 'select', options: options(['low', 'medium', 'high', 'urgent']), required: true },
    { name: 'scheduledDate', label: 'Date', type: 'date' },
    { name: 'scheduledStartTime', label: 'Start time', type: 'time' },
    { name: 'assignedToId', label: 'Assigned to', type: 'select', options: personOptions(staff) },
    { name: 'routeId', label: 'Route', type: 'select', options: (routes || []).map((route) => ({ value: route.id, label: `${route.scheduledDate} · ${route.name}` })) },
    { name: 'estimatedCost', label: 'Price charged ($)', type: 'number', step: '0.01', help: 'An invoice for this amount is created when the job is completed.' },
    { name: 'estimatedDuration', label: 'Estimated minutes', type: 'number', step: '1' },
    { name: 'status', label: 'Status', type: 'select', options: options(JOB_STATUSES), required: true },
    { name: 'description', label: 'Work to be done', type: 'textarea' },
    { name: 'checklist', label: 'Quality checklist (comma-separated)', type: 'list', full: true, placeholder: 'Mow, Edge walkways, Blow off clippings' },
    { name: 'internalNotes', label: 'Crew notes (not shown to the customer)', type: 'textarea' }
  ];

  return (
    <>
      <ResourcePage
        title="Jobs"
        subtitle="Work orders: what needs to be done, where, and by whom"
        noun="job"
        path="/jobs"
        filter={{ name: 'status', label: 'Status', options: options(JOB_STATUSES) }}
        canCreate
        canEdit
        canDelete
        createDefaults={{ jobType: 'mowing', priority: 'medium', status: 'pending', scheduledDate: ymd() }}
        fields={fields}
        mapRecord={(row) => ({ ...row, checklist: (row.checklist || []).map((item: any) => item.label) })}
        mapPayload={(payload, editing) => ({
          ...payload,
          checklist: payload.checklist.map((text: string) => ({
            label: text,
            done: Boolean(editing?.checklist?.find((item: any) => item.label === text)?.done)
          }))
        })}
        columns={[
          { header: 'Date', render: (job) => fmtDate(job.scheduledDate) },
          { header: 'Job', render: (job) => (<><strong>{job.title}</strong><div className="muted small">{label(job.jobType)}{job.customerNotes ? ' · customer request' : ''}</div></>) },
          { header: 'Customer', render: (job) => personName(job.customer) },
          { header: 'Assigned to', render: (job) => (job.assignedTo ? personName(job.assignedTo) : <span className="muted">Unassigned</span>) },
          { header: 'Status', render: (job) => <Badge value={job.status} /> },
          { header: 'Price', align: 'right', render: (job) => (job.actualCost ?? job.estimatedCost) != null ? money(job.actualCost ?? job.estimatedCost) : '—' }
        ]}
        rowActions={(job, reload) => (
          <button
            className="link-button"
            onClick={() => {
              reloadList.current = reload;
              setOpenJob(job);
            }}
          >
            Open
          </button>
        )}
      />
      {openJob && (
        <Modal title="Job" onClose={() => setOpenJob(null)} wide>
          <JobCard
            job={openJob}
            onChange={async () => {
              reloadList.current();
              setOpenJob((await getData(`/jobs/${openJob.id}`)).item);
            }}
          />
        </Modal>
      )}
    </>
  );
};

const MaintenancePanel: React.FC<{ equipment: any; onSaved: () => void }> = ({ equipment, onSaved }) => {
  const { data: logs, loading, reload } = useLoad(() => listItems(`/equipment/${equipment.id}/maintenance`), [equipment.id]);
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="stack">
      <h3>Log maintenance</h3>
      <RecordForm
        key={formKey}
        submitLabel="Save log"
        initial={{ maintenanceType: 'routine' }}
        fields={[
          { name: 'maintenanceType', label: 'Type', type: 'select', options: options(['routine', 'repair', 'inspection', 'cleaning', 'parts_replacement']), required: true },
          { name: 'cost', label: 'Cost ($)', type: 'number', step: '0.01' },
          { name: 'hoursAtMaintenance', label: 'Hour meter reading', type: 'number' },
          { name: 'nextMaintenanceDue', label: 'Next maintenance due', type: 'datestamp' },
          { name: 'description', label: 'What was done', type: 'textarea', required: true },
          { name: 'returnToService', label: 'Equipment is ready to use again', type: 'checkbox' }
        ]}
        onSubmit={async (payload) => {
          await postData(`/equipment/${equipment.id}/maintenance`, payload);
          setFormKey((key) => key + 1);
          reload();
          onSaved();
        }}
      />
      <h3>History</h3>
      {loading && !logs ? (
        <Loading />
      ) : (
        <DataTable
          empty="No maintenance has been logged for this equipment."
          rows={logs || []}
          columns={[
            { header: 'Date', render: (log) => fmtDate(log.maintenanceDate) },
            { header: 'Type', render: (log) => label(log.maintenanceType) },
            { header: 'Work', render: (log) => log.description },
            { header: 'By', render: (log) => personName(log.performedBy) },
            { header: 'Cost', align: 'right', render: (log) => (log.cost != null ? money(log.cost) : '—') }
          ]}
        />
      )}
    </div>
  );
};

export const EquipmentPage: React.FC = () => {
  const { user } = useAuth();
  const manages = user?.role === 'manager' || user?.role === 'admin';
  const staff = useLoad(async () => (manages ? listItems('/users', {}, 'users') : []), [manages]);
  const [selected, setSelected] = useState<any | null>(null);
  const reloadList = useRef<() => void>(() => undefined);

  return (
    <>
      <ResourcePage
        title={manages ? 'Equipment' : 'My equipment'}
        subtitle={manages ? 'Mowers, trimmers and other equipment, with maintenance history' : 'Equipment assigned to you for use or maintenance'}
        noun="equipment item"
        path="/equipment"
        params={manages ? undefined : { mine: true }}
        filter={manages ? { name: 'status', label: 'Status', options: options(['available', 'in_use', 'maintenance', 'retired']) } : undefined}
        canCreate={manages}
        canEdit={manages}
        canDelete={manages}
        deleteLabel="Retire"
        empty={manages ? 'No equipment yet.' : 'No equipment is assigned to you.'}
        createDefaults={{ category: 'mower', status: 'available' }}
        fields={[
          { name: 'name', label: 'Name', required: true },
          { name: 'category', label: 'Category', type: 'select', options: options(['mower', 'trimmer', 'blower', 'edger', 'chainsaw', 'tiller', 'trailer', 'other']), required: true },
          { name: 'brand', label: 'Brand' },
          { name: 'model', label: 'Model' },
          { name: 'serialNumber', label: 'Serial number' },
          { name: 'status', label: 'Status', type: 'select', options: options(['available', 'in_use', 'maintenance', 'retired']), required: true },
          { name: 'assignedToId', label: 'Assigned to (use or maintenance)', type: 'select', options: personOptions((staff.data || []).filter((u) => u.role !== 'customer' && u.isActive)) },
          { name: 'location', label: 'Stored at' },
          { name: 'purchaseDate', label: 'Purchase date', type: 'datestamp' },
          { name: 'purchasePrice', label: 'Purchase price ($)', type: 'number', step: '0.01' },
          { name: 'currentHours', label: 'Hour meter', type: 'number' },
          { name: 'nextMaintenanceDate', label: 'Next maintenance due', type: 'datestamp' },
          { name: 'notes', label: 'Notes', type: 'textarea' }
        ]}
        columns={[
          { header: 'Equipment', render: (item) => (<><strong>{item.name}</strong><div className="muted small">{[item.brand, item.model].filter(Boolean).join(' ')}</div></>) },
          { header: 'Category', render: (item) => label(item.category) },
          { header: 'Status', render: (item) => <Badge value={item.status} /> },
          { header: 'Assigned to', render: (item) => (item.assignedTo ? personName(item.assignedTo) : '—') },
          { header: 'Hours', align: 'right', render: (item) => item.currentHours ?? '—' },
          {
            header: 'Next maintenance',
            render: (item) =>
              item.nextMaintenanceDate ? (
                <>
                  {fmtDate(item.nextMaintenanceDate)} {new Date(item.nextMaintenanceDate) < new Date() && <Badge value="overdue" />}
                </>
              ) : (
                '—'
              )
          }
        ]}
        rowActions={(item, reload) => (
          <button
            className="link-button"
            onClick={() => {
              reloadList.current = reload;
              setSelected(item);
            }}
          >
            Maintenance
          </button>
        )}
      />
      {selected && (
        <Modal title={`Maintenance: ${selected.name}`} onClose={() => setSelected(null)} wide>
          <MaintenancePanel equipment={selected} onSaved={() => reloadList.current()} />
        </Modal>
      )}
    </>
  );
};

const INVENTORY_CATEGORIES = ['fertilizer', 'seed', 'mulch', 'soil', 'chemicals', 'fuel', 'parts', 'tools', 'other'];

export const InventoryPage: React.FC = () => {
  const [adjusting, setAdjusting] = useState<any | null>(null);
  const reloadList = useRef<() => void>(() => undefined);
  const isLow = (item: any) => item.reorderLevel != null && item.currentQuantity <= item.reorderLevel;

  return (
    <>
      <ResourcePage
        title="Inventory"
        subtitle="Supplies on hand. Items at or below their reorder level are flagged."
        noun="inventory item"
        path="/inventory"
        filter={{ name: 'low', label: 'Show', options: [{ value: 'true', label: 'Low stock only' }] }}
        canCreate
        canEdit
        canDelete
        createDefaults={{ category: 'other', unit: 'units', currentQuantity: 0 }}
        fields={[
          { name: 'name', label: 'Item', required: true },
          { name: 'category', label: 'Category', type: 'select', options: options(INVENTORY_CATEGORIES), required: true },
          { name: 'currentQuantity', label: 'Quantity on hand', type: 'number', required: true },
          { name: 'unit', label: 'Unit (bags, gallons…)', required: true },
          { name: 'reorderLevel', label: 'Reorder when at or below', type: 'number' },
          { name: 'reorderQuantity', label: 'Usual reorder quantity', type: 'number' },
          { name: 'unitCost', label: 'Cost per unit ($)', type: 'number', step: '0.01' },
          { name: 'supplier', label: 'Supplier' },
          { name: 'sku', label: 'SKU' },
          { name: 'location', label: 'Stored at' },
          { name: 'notes', label: 'Notes', type: 'textarea' }
        ]}
        columns={[
          { header: 'Item', render: (item) => (<><strong>{item.name}</strong>{item.sku && <div className="muted small">{item.sku}</div>}</>) },
          { header: 'Category', render: (item) => label(item.category) },
          { header: 'On hand', render: (item) => (<>{item.currentQuantity} {item.unit} {isLow(item) && <span className="badge badge-low-stock">Reorder{item.reorderQuantity ? ` ${item.reorderQuantity}` : ''}</span>}</>) },
          { header: 'Reorder at', render: (item) => item.reorderLevel ?? '—' },
          { header: 'Unit cost', align: 'right', render: (item) => (item.unitCost != null ? money(item.unitCost) : '—') },
          { header: 'Supplier', render: (item) => item.supplier || '—' }
        ]}
        rowActions={(item, reload) => (
          <button
            className="link-button"
            onClick={() => {
              reloadList.current = reload;
              setAdjusting(item);
            }}
          >
            Receive / use
          </button>
        )}
      />
      {adjusting && (
        <Modal title={`Adjust stock: ${adjusting.name}`} onClose={() => setAdjusting(null)}>
          <p className="muted small" style={{ marginBottom: 12 }}>
            Currently {adjusting.currentQuantity} {adjusting.unit} on hand.
          </p>
          <RecordForm
            submitLabel="Update stock"
            initial={{ direction: 'add' }}
            fields={[
              { name: 'direction', label: 'Change', type: 'select', options: [{ value: 'add', label: 'Received (add)' }, { value: 'remove', label: 'Used or lost (remove)' }], required: true },
              { name: 'quantity', label: `Quantity (${adjusting.unit})`, type: 'number', required: true }
            ]}
            onCancel={() => setAdjusting(null)}
            onSubmit={async (payload) => {
              await postData(`/inventory/${adjusting.id}/adjust`, { delta: payload.direction === 'remove' ? -payload.quantity : payload.quantity });
              setAdjusting(null);
              reloadList.current();
            }}
          />
        </Modal>
      )}
    </>
  );
};

const BillingButton: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');

  const run = async () => {
    setBusy(true);
    try {
      const data = await postData('/service-plans/run-billing');
      setResult(`${data.invoicesCreated} invoice(s) and ${data.jobsCreated} job(s) created`);
      onDone();
    } catch (err) {
      setResult(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {result && <span className="muted small">{result}</span>}
      <button className="button button-secondary" onClick={run} disabled={busy} title="Runs automatically every night">
        {busy ? 'Running…' : 'Run billing now'}
      </button>
    </>
  );
};

export const PlansPage: React.FC = () => {
  const { data: customers } = useCustomers();

  return (
    <ResourcePage
      title="Service plans"
      subtitle="Recurring contracts. Each night, plans are billed on their cycle and jobs are created a week ahead."
      noun="service plan"
      path="/service-plans"
      filter={{ name: 'status', label: 'Status', options: options(['active', 'paused', 'cancelled', 'expired']) }}
      canCreate
      canEdit
      canDelete
      deleteLabel="Cancel"
      createOnlyFields={['customerId']}
      createDefaults={{ planType: 'weekly', billingCycle: 'monthly', status: 'active', autoRenew: true, startDate: ymd() }}
      headerActions={(reload) => <BillingButton onDone={reload} />}
      fields={[
        { name: 'customerId', label: 'Customer', type: 'select', options: personOptions(customers), required: true },
        { name: 'planName', label: 'Plan name', required: true },
        { name: 'planType', label: 'Visit frequency', type: 'select', options: options(['weekly', 'bi-weekly', 'monthly', 'seasonal', 'custom']), required: true, help: 'Custom plans do not create jobs automatically.' },
        { name: 'billingCycle', label: 'Billed', type: 'select', options: options(['weekly', 'monthly', 'quarterly', 'annually']), required: true },
        { name: 'recurringAmount', label: 'Price per billing cycle ($)', type: 'number', step: '0.01', required: true },
        { name: 'status', label: 'Status', type: 'select', options: options(['active', 'paused', 'cancelled', 'expired']), required: true },
        { name: 'startDate', label: 'Start date', type: 'datestamp', required: true },
        { name: 'endDate', label: 'Contract end / renewal date', type: 'datestamp' },
        { name: 'servicesIncluded', label: 'Services included (comma-separated)', type: 'list', full: true },
        { name: 'autoRenew', label: 'Renews automatically at the end date', type: 'checkbox' },
        { name: 'notes', label: 'Notes', type: 'textarea' }
      ]}
      columns={[
        { header: 'Customer', render: (plan) => personName(plan.customer) },
        { header: 'Plan', render: (plan) => (<><strong>{plan.planName}</strong><div className="muted small">{(plan.servicesIncluded || []).join(', ')}</div></>) },
        { header: 'Visits', render: (plan) => label(plan.planType) },
        { header: 'Price', render: (plan) => `${money(plan.recurringAmount)} ${plan.billingCycle}` },
        { header: 'Status', render: (plan) => <Badge value={plan.status} /> },
        { header: 'Next bill', render: (plan) => (plan.status === 'active' ? fmtDate(plan.nextBillingDate) : '—') },
        { header: 'Renewal', render: (plan) => (plan.endDate ? `${fmtDate(plan.endDate)}${plan.autoRenew ? ' (auto)' : ''}` : '—') }
      ]}
    />
  );
};

const APPOINTMENT_STATUSES = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled'];

export const AppointmentsPage: React.FC = () => {
  const { user } = useAuth();
  const isCustomer = user?.role === 'customer';
  const customers = useLoad(async () => (isCustomer ? [] : listItems('/users/customers', {}, 'users')), [isCustomer]);
  const staff = useLoad(async () => (isCustomer ? [] : listItems('/users', {}, 'users')), [isCustomer]);
  const [error, setError] = useState('');
  const isOpen = (row: any) => !['completed', 'cancelled', 'in_progress'].includes(row.status);

  const columns = [
    { header: 'When', render: (row: any) => (<><strong>{fmtDate(row.appointmentDate)}</strong><div className="muted small">{fmtTime(row.startTime)}{row.endTime ? ` – ${fmtTime(row.endTime)}` : ''}</div></>) },
    { header: 'Appointment', render: (row: any) => (<><strong>{row.title}</strong>{row.description && <div className="muted small">{row.description}</div>}</>) },
    ...(isCustomer ? [] : [{ header: 'Customer', render: (row: any) => personName(row.customer) }]),
    { header: 'With', render: (row: any) => (row.assignedTo ? personName(row.assignedTo) : '—') },
    { header: 'Status', render: (row: any) => <Badge value={row.status} /> }
  ];

  if (isCustomer) {
    return (
      <>
        <Notice kind="error">{error}</Notice>
        <ResourcePage
          title="Appointments"
          subtitle="Book a visit, or change one that is coming up"
          noun="appointment"
          path="/appointments"
          canCreate
          canEdit={isOpen}
          empty="You have no appointments."
          fields={[
            { name: 'title', label: 'What is it for?', required: true, full: true, placeholder: 'Estimate for a new patio' },
            { name: 'appointmentDate', label: 'Date', type: 'date', required: true },
            { name: 'startTime', label: 'Time', type: 'time', required: true },
            { name: 'notes', label: 'Anything we should know?', type: 'textarea' }
          ]}
          columns={columns}
          rowActions={(row, reload) =>
            isOpen(row) ? (
              <button
                className="link-button danger"
                onClick={async () => {
                  if (!window.confirm('Cancel this appointment?')) return;
                  setError('');
                  try {
                    await putData(`/appointments/${row.id}`, { status: 'cancelled' });
                    reload();
                  } catch (err) {
                    setError(errorMessage(err));
                  }
                }}
              >
                Cancel
              </button>
            ) : null
          }
        />
      </>
    );
  }

  return (
    <ResourcePage
      title="Appointments"
      subtitle="Estimates, consultations and other booked visits, including customer bookings"
      noun="appointment"
      path="/appointments"
      filter={{ name: 'status', label: 'Status', options: options(APPOINTMENT_STATUSES) }}
      canCreate
      canEdit
      canDelete
      createOnlyFields={['customerId']}
      createDefaults={{ status: 'scheduled', appointmentDate: ymd() }}
      fields={[
        { name: 'customerId', label: 'Customer', type: 'select', options: personOptions(customers.data), required: true },
        { name: 'title', label: 'Title', required: true },
        { name: 'appointmentDate', label: 'Date', type: 'date', required: true },
        { name: 'startTime', label: 'Start time', type: 'time', required: true },
        { name: 'endTime', label: 'End time', type: 'time' },
        { name: 'status', label: 'Status', type: 'select', options: options(APPOINTMENT_STATUSES), required: true },
        { name: 'assignedToId', label: 'Assigned to', type: 'select', options: personOptions((staff.data || []).filter((u) => u.role !== 'customer' && u.isActive)) },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'notes', label: 'Notes', type: 'textarea' }
      ]}
      columns={columns}
    />
  );
};
