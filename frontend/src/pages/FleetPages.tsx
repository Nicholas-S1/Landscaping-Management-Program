import React, { useRef, useState } from 'react';
import ResourcePage from '../components/ResourcePage';
import { useAuth } from '../context/AuthContext';
import { personOptions, useCustomers, useStaff } from '../hooks/usePeople';
import { deleteData, errorMessage, getData, listItems, postData, putData } from '../services/resource';
import {
  Badge, DataTable, Empty, FieldDef, Loading, Modal, Notice, PageHeader, RecordForm,
  fmtDate, fmtTime, mapsRouteUrl, options, personName, useLoad, ymd
} from '../components/ui';

const StopsPanel: React.FC<{ routeId: string; onChange: () => void }> = ({ routeId, onChange }) => {
  const { data: route, loading, reload } = useLoad(async () => (await getData(`/routes/${routeId}`)).route, [routeId]);
  const { data: customers } = useCustomers();
  const [adding, setAdding] = useState('');
  const [error, setError] = useState('');

  const stops: any[] = route?.customers || [];
  const onRoute = new Set(stops.map((stop) => stop.customerId));
  const available = (customers || []).filter((customer) => !onRoute.has(customer.id));

  const run = async (action: () => Promise<any>) => {
    setError('');
    try {
      await action();
      await reload();
      onChange();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const move = (index: number, offset: number) => {
    const order = stops.map((stop) => stop.customerId);
    [order[index], order[index + offset]] = [order[index + offset], order[index]];
    return run(() => putData(`/routes/${routeId}/order`, { customerIds: order }));
  };

  if (loading && !route) return <Loading />;
  const mapUrl = mapsRouteUrl(stops.map((stop) => stop.customer.propertyAddress));

  return (
    <div className="stack">
      <Notice kind="error">{error}</Notice>
      <p className="muted small">
        Crews visit stops in this order. Use the arrows to arrange the most efficient drive.
        {mapUrl && (
          <>
            {' '}
            <a href={mapUrl} target="_blank" rel="noreferrer">
              Preview the drive in Google Maps
            </a>
          </>
        )}
      </p>
      {stops.length === 0 ? (
        <Empty>No stops yet. Add customers below.</Empty>
      ) : (
        <ul className="list">
          {stops.map((stop, index) => (
            <li key={stop.id} className="stop">
              <div className="stop-number">{index + 1}</div>
              <div className="stop-body spread">
                <div>
                  <strong>{personName(stop.customer)}</strong> <Badge value={stop.status} />
                  <div className="muted small">{stop.customer.propertyAddress || 'No address on file'}</div>
                </div>
                <div className="row">
                  <button className="button button-secondary button-small" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${personName(stop.customer)} earlier`}>
                    ↑
                  </button>
                  <button className="button button-secondary button-small" disabled={index === stops.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${personName(stop.customer)} later`}>
                    ↓
                  </button>
                  <button className="link-button danger" onClick={() => run(() => deleteData(`/routes/${routeId}/customers/${stop.customerId}`))}>
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="row">
        <select aria-label="Customer to add" value={adding} onChange={(e) => setAdding(e.target.value)}>
          <option value="">Add a customer…</option>
          {personOptions(available).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          className="button"
          disabled={!adding}
          onClick={() =>
            run(async () => {
              await postData(`/routes/${routeId}/customers`, { customerIds: [adding] });
              setAdding('');
            })
          }
        >
          Add stop
        </button>
      </div>
    </div>
  );
};

export const RoutesPage: React.FC = () => {
  const { data: trucks } = useLoad(() => listItems('/trucks', { status: 'active' }, 'trucks'), []);
  const [stopsFor, setStopsFor] = useState<any | null>(null);
  const reloadList = useRef<() => void>(() => undefined);

  const fields: FieldDef[] = [
    { name: 'name', label: 'Route name', required: true, placeholder: 'North side Monday' },
    { name: 'scheduledDate', label: 'Date', type: 'date', required: true, help: 'Changing the date (for example a rain delay) moves the unfinished jobs on this route too.' },
    { name: 'startTime', label: 'Start time', type: 'time' },
    { name: 'truckId', label: 'Truck', type: 'select', options: (trucks || []).map((truck) => ({ value: truck.id, label: truck.name })) },
    { name: 'status', label: 'Status', type: 'select', options: options(['scheduled', 'in_progress', 'completed', 'cancelled']), required: true },
    { name: 'notes', label: 'Notes', type: 'textarea' }
  ];

  return (
    <>
      <ResourcePage
        title="Routes"
        subtitle="Daily routes: which truck goes where, and in what order"
        noun="route"
        path="/routes"
        listKey="routes"
        filter={{ name: 'status', label: 'Status', options: options(['scheduled', 'in_progress', 'completed', 'cancelled']) }}
        canCreate
        canEdit
        canDelete
        createDefaults={{ scheduledDate: ymd(), status: 'scheduled' }}
        fields={fields}
        columns={[
          { header: 'Date', render: (route) => (<><strong>{fmtDate(route.scheduledDate)}</strong>{route.startTime && <div className="muted small">{fmtTime(route.startTime)}</div>}</>) },
          { header: 'Route', render: (route) => route.name },
          { header: 'Truck', render: (route) => (route.truck ? route.truck.name : <span className="badge badge-pending">No truck</span>) },
          {
            header: 'Stops',
            render: (route) => {
              const stops = route.customers || [];
              return `${stops.filter((stop: any) => stop.status === 'completed').length} of ${stops.length} done`;
            }
          },
          { header: 'Status', render: (route) => <Badge value={route.status} /> }
        ]}
        rowActions={(route, reload) => (
          <button
            className="link-button"
            onClick={() => {
              reloadList.current = reload;
              setStopsFor(route);
            }}
          >
            Stops
          </button>
        )}
      />
      {stopsFor && (
        <Modal title={`Stops: ${stopsFor.name} (${fmtDate(stopsFor.scheduledDate)})`} onClose={() => setStopsFor(null)} wide>
          <StopsPanel routeId={stopsFor.id} onChange={() => reloadList.current()} />
        </Modal>
      )}
    </>
  );
};

const CrewPanel: React.FC<{ truck: any; onClose: () => void }> = ({ truck, onClose }) => {
  const { data: staff } = useStaff();
  const [date, setDate] = useState(ymd());
  const [crew, setCrew] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const current = useLoad(async () => {
    const assignments: any[] = (await getData(`/trucks/${truck.id}/assignments`, { date })).assignments;
    setCrew(Object.fromEntries(assignments.map((assignment) => [assignment.employeeId, assignment.role])));
    return assignments;
  }, [truck.id, date]);

  const toggle = (id: string) =>
    setCrew((value) => {
      const next = { ...value };
      if (next[id]) delete next[id];
      else next[id] = Object.values(next).includes('driver') ? 'crew' : 'driver';
      return next;
    });

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const employeeIds = Object.keys(crew);
      await postData(`/trucks/${truck.id}/assign`, { date, employeeIds, roles: employeeIds.map((id) => crew[id]) });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="stack">
      <Notice kind="error">{error || current.error}</Notice>
      <div className="field" style={{ maxWidth: 220 }}>
        <label htmlFor="crew-date">Date</label>
        <input id="crew-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <p className="muted small">
        Tick everyone riding in this truck on that day{truck.capacity ? ` (seats ${truck.capacity})` : ''}. Anyone you add is taken off any other truck for the day.
      </p>
      {!staff ? (
        <Loading />
      ) : (
        <ul className="list">
          {staff.map((person) => (
            <li key={person.id} className="spread">
              <label className="row">
                <input type="checkbox" checked={Boolean(crew[person.id])} onChange={() => toggle(person.id)} />
                {personName(person)}
              </label>
              {crew[person.id] && (
                <select aria-label={`Role for ${personName(person)}`} value={crew[person.id]} onChange={(e) => setCrew((value) => ({ ...value, [person.id]: e.target.value }))}>
                  <option value="driver">Driver</option>
                  <option value="crew">Crew</option>
                </select>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="form-actions">
        <button className="button button-secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="button" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save crew'}
        </button>
      </div>
    </div>
  );
};

export const TrucksPage: React.FC = () => {
  const { user } = useAuth();
  const [crewFor, setCrewFor] = useState<any | null>(null);

  return (
    <>
      <ResourcePage
        title="Trucks"
        subtitle="Your fleet, and who rides in each truck each day"
        noun="truck"
        path="/trucks"
        listKey="trucks"
        filter={{ name: 'status', label: 'Status', options: options(['active', 'maintenance', 'retired']) }}
        canCreate
        canEdit
        canDelete={user?.role === 'admin'}
        deleteLabel="Retire"
        createDefaults={{ status: 'active' }}
        fields={[
          { name: 'name', label: 'Name', required: true, placeholder: 'Truck 2' },
          { name: 'licensePlate', label: 'License plate' },
          { name: 'make', label: 'Make' },
          { name: 'model', label: 'Model' },
          { name: 'year', label: 'Year', type: 'number', step: '1' },
          { name: 'capacity', label: 'Seats', type: 'number', step: '1' },
          { name: 'currentMileage', label: 'Mileage', type: 'number', step: '1' },
          { name: 'status', label: 'Status', type: 'select', options: options(['active', 'maintenance', 'retired']), required: true },
          { name: 'nextMaintenanceDate', label: 'Next service due', type: 'datestamp' },
          { name: 'notes', label: 'Notes', type: 'textarea' }
        ]}
        columns={[
          { header: 'Truck', render: (truck) => (<><strong>{truck.name}</strong><div className="muted small">{[truck.year, truck.make, truck.model].filter(Boolean).join(' ')}</div></>) },
          { header: 'Plate', render: (truck) => truck.licensePlate || '—' },
          { header: 'Seats', render: (truck) => truck.capacity ?? '—' },
          { header: 'Mileage', align: 'right', render: (truck) => (truck.currentMileage != null ? truck.currentMileage.toLocaleString() : '—') },
          { header: 'Next service', render: (truck) => fmtDate(truck.nextMaintenanceDate) },
          { header: 'Status', render: (truck) => <Badge value={truck.status} /> }
        ]}
        rowActions={(truck) => (
          <button className="link-button" onClick={() => setCrewFor(truck)}>
            Crew
          </button>
        )}
      />
      {crewFor && (
        <Modal title={`Crew for ${crewFor.name}`} onClose={() => setCrewFor(null)}>
          <CrewPanel truck={crewFor} onClose={() => setCrewFor(null)} />
        </Modal>
      )}
    </>
  );
};

const TEAM_ROLES = ['employee', 'manager', 'admin'];

export const PeoplePage: React.FC = () => {
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'admin';
  const [tab, setTab] = useState<'team' | 'customers'>('team');
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState<'customer' | 'staff' | null>(null);
  const [error, setError] = useState('');
  const { data: users, loading, error: loadError, reload } = useLoad(() => listItems('/users', {}, 'users'), []);

  const rows = (users || []).filter((user) => (tab === 'team' ? TEAM_ROLES.includes(user.role) : user.role === 'customer'));
  const mayEdit = (user: any) => isAdmin || ['customer', 'employee'].includes(user.role);

  const setActive = async (user: any, isActive: boolean) => {
    const verb = isActive ? 'reactivate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${verb} ${personName(user)}?${isActive ? '' : ' They will no longer be able to sign in.'}`)) return;
    setError('');
    try {
      await putData(`/users/${user.id}`, { isActive });
      reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const staffFields: FieldDef[] = [
    { name: 'hourlyRate', label: 'Hourly rate ($)', type: 'number', step: '0.01' },
    { name: 'hireDate', label: 'Hire date', type: 'datestamp' }
  ];
  const customerFields: FieldDef[] = [
    { name: 'propertyAddress', label: 'Property address', full: true },
    { name: 'propertyNotes', label: 'Standing property instructions', type: 'textarea' }
  ];
  const baseFields: FieldDef[] = [
    { name: 'firstName', label: 'First name', required: true },
    { name: 'lastName', label: 'Last name', required: true },
    { name: 'phone', label: 'Phone' },
    { name: 'address', label: 'Mailing address' }
  ];
  const accountFields: FieldDef[] = [
    { name: 'email', label: 'Email (used to sign in)', type: 'email', required: true },
    { name: 'password', label: 'Temporary password', type: 'password', required: true, help: 'At least 6 characters. Ask them to change it after signing in.' }
  ];

  const editFields = editing
    ? [
        ...baseFields,
        ...(editing.role === 'customer' ? customerFields : staffFields),
        ...(isAdmin && editing.id !== me?.id ? ([{ name: 'role', label: 'Role', type: 'select', options: options(['customer', ...TEAM_ROLES]), required: true }] as FieldDef[]) : []),
        ...(isAdmin ? ([{ name: 'password', label: 'Set a new password (optional)', type: 'password' }] as FieldDef[]) : [])
      ]
    : [];
  const createFields =
    creating === 'staff'
      ? [...baseFields, ...accountFields, { name: 'role', label: 'Role', type: 'select', options: options(TEAM_ROLES), required: true } as FieldDef, ...staffFields]
      : [...baseFields, ...accountFields, ...customerFields];

  return (
    <div>
      <PageHeader title="People" subtitle={isAdmin ? 'Your team and customers. Hiring, roles and deactivation are owner-only.' : 'Employee details and customers'}>
        <button className="button button-secondary" onClick={() => setCreating('customer')}>
          Add customer
        </button>
        {isAdmin && (
          <button className="button" onClick={() => setCreating('staff')}>
            Hire team member
          </button>
        )}
      </PageHeader>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'team'} className={`tab ${tab === 'team' ? 'active' : ''}`} onClick={() => setTab('team')}>
          Team
        </button>
        <button role="tab" aria-selected={tab === 'customers'} className={`tab ${tab === 'customers' ? 'active' : ''}`} onClick={() => setTab('customers')}>
          Customers
        </button>
      </div>
      <Notice kind="error">{error || loadError}</Notice>
      <div className="card">
        {loading && !users ? (
          <Loading />
        ) : (
          <DataTable
            rows={rows}
            columns={[
              { header: 'Name', render: (user) => (<><strong>{personName(user)}</strong><div className="muted small">{user.email}</div></>) },
              ...(tab === 'team'
                ? [
                    { header: 'Role', render: (user: any) => <Badge value={user.role === 'admin' ? 'owner' : user.role} /> },
                    { header: 'Phone', render: (user: any) => user.phone || '—' },
                    { header: 'Hourly rate', render: (user: any) => (user.hourlyRate != null ? `$${Number(user.hourlyRate).toFixed(2)}` : '—') },
                    { header: 'Hired', render: (user: any) => fmtDate(user.hireDate) }
                  ]
                : [
                    { header: 'Phone', render: (user: any) => user.phone || '—' },
                    { header: 'Property', render: (user: any) => user.propertyAddress || '—' }
                  ]),
              { header: 'Status', render: (user) => <Badge value={user.isActive ? 'active' : 'inactive'} /> }
            ]}
            actions={(user) => (
              <>
                {mayEdit(user) && (
                  <button className="link-button" onClick={() => setEditing(user)}>
                    Edit
                  </button>
                )}
                {isAdmin && user.id !== me?.id && (
                  <button className={`link-button ${user.isActive ? 'danger' : ''}`} onClick={() => setActive(user, !user.isActive)}>
                    {user.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                )}
              </>
            )}
          />
        )}
      </div>

      {editing && (
        <Modal title={`Edit ${personName(editing)}`} onClose={() => setEditing(null)}>
          <RecordForm
            fields={editFields}
            initial={editing}
            onCancel={() => setEditing(null)}
            onSubmit={async (payload) => {
              if (!payload.password) delete payload.password;
              await putData(`/users/${editing.id}`, payload);
              setEditing(null);
              reload();
            }}
          />
        </Modal>
      )}
      {creating && (
        <Modal title={creating === 'staff' ? 'Hire team member' : 'Add customer'} onClose={() => setCreating(null)}>
          <RecordForm
            fields={createFields}
            initial={creating === 'staff' ? { role: 'employee', hireDate: ymd() } : {}}
            submitLabel={creating === 'staff' ? 'Create account' : 'Add customer'}
            onCancel={() => setCreating(null)}
            onSubmit={async (payload) => {
              await postData('/users', { ...payload, role: creating === 'staff' ? payload.role : 'customer' });
              setTab(creating === 'staff' ? 'team' : 'customers');
              setCreating(null);
              reload();
            }}
          />
        </Modal>
      )}
    </div>
  );
};
