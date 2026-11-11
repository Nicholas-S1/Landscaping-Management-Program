import React, { useCallback, useEffect, useState } from 'react';
import { errorMessage, fileUrl, uploadPhoto } from '../services/resource';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// A bare YYYY-MM-DD is a calendar day, not midnight UTC; parse it in local time so it never shifts a day.
export const parseDate = (value: string | Date) =>
  typeof value === 'string' && DATE_ONLY.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);

export const ymd = (date: Date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const fmtDate = (value?: string | Date | null) =>
  value ? parseDate(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const fmtDateTime = (value?: string | Date | null) =>
  value
    ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';

export const fmtClock = (value?: string | Date | null) =>
  value ? new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '—';

// "08:00:00" -> "8:00 AM"
export const fmtTime = (value?: string | null) => {
  if (!value) return '';
  const [hours, minutes] = value.split(':').map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
};

export const money = (value: any) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);

export const personName = (person?: { firstName: string; lastName: string } | null) =>
  person ? `${person.firstName} ${person.lastName}` : '—';

export const label = (value?: string | null) => {
  if (!value) return '—';
  const text = value.replace(/[_-]/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const mapsSearchUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

// Google Maps directions through every stop, in route order.
export const mapsRouteUrl = (addresses: string[]) => {
  const stops = addresses.filter(Boolean);
  if (stops.length === 0) return '';
  const destination = encodeURIComponent(stops[stops.length - 1]);
  const waypoints = stops.slice(0, -1).map(encodeURIComponent).join('%7C');
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}`;
};

export function useLoad<T>(loader: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await loader());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}

export const Badge: React.FC<{ value?: string | null }> = ({ value }) =>
  value ? <span className={`badge badge-${value.replace(/_/g, '-')}`}>{label(value)}</span> : null;

export const Notice: React.FC<{ kind?: 'error' | 'success' | 'info'; children: React.ReactNode }> = ({
  kind = 'info',
  children
}) => (children ? <div className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div> : null);

export const PageHeader: React.FC<{ title: string; subtitle?: string; children?: React.ReactNode }> = ({
  title,
  subtitle,
  children
}) => (
  <div className="page-header">
    <div>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {children && <div className="page-actions">{children}</div>}
  </div>
);

export const Loading: React.FC = () => <p className="muted">Loading…</p>;

export const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="empty">{children}</p>;

export const Stat: React.FC<{ label: string; value: React.ReactNode; tone?: 'warn' | 'good' }> = ({ label: text, value, tone }) => (
  <div className={`stat ${tone ? `stat-${tone}` : ''}`}>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{text}</div>
  </div>
);

export const Modal: React.FC<{ title: string; onClose: () => void; wide?: boolean; children: React.ReactNode }> = ({
  title,
  onClose,
  wide,
  children
}) => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

export const PhotoStrip: React.FC<{ photos?: string[] | null }> = ({ photos }) =>
  photos && photos.length > 0 ? (
    <div className="photo-strip">
      {photos.map((photo) => (
        <a key={photo} href={fileUrl(photo)} target="_blank" rel="noreferrer">
          <img src={fileUrl(photo)} alt="Uploaded" />
        </a>
      ))}
    </div>
  ) : null;

export const PhotoInput: React.FC<{ value: string[]; onChange: (photos: string[]) => void; label?: string }> = ({
  value,
  onChange,
  label: text = 'Add photos'
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const uploaded: string[] = [];
      for (const file of files) uploaded.push(await uploadPhoto(file));
      onChange([...value, ...uploaded]);
    } catch (err) {
      setError(errorMessage(err, 'Upload failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="photo-input">
      {value.length > 0 && (
        <div className="photo-strip">
          {value.map((photo) => (
            <div key={photo} className="photo-thumb">
              <img src={fileUrl(photo)} alt="Uploaded" />
              <button type="button" onClick={() => onChange(value.filter((p) => p !== photo))} aria-label="Remove photo">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="button button-secondary file-button">
        {busy ? 'Uploading…' : text}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={onFiles} disabled={busy} />
      </label>
      <Notice kind="error">{error}</Notice>
    </div>
  );
};

export interface Option {
  value: string;
  label: string;
}

export interface FieldDef {
  name: string;
  label: string;
  // "date" is a calendar day; "datestamp" is a day stored in a timestamp column; "list" is comma-separated text.
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'datestamp' | 'time' | 'textarea' | 'select' | 'checkbox' | 'list';
  options?: Option[];
  required?: boolean;
  placeholder?: string;
  help?: string;
  step?: string;
  full?: boolean;
}

export const options = (values: string[]): Option[] => values.map((value) => ({ value, label: label(value) }));

const toInputDate = (value: any) => {
  if (!value) return '';
  return typeof value === 'string' && DATE_ONLY.test(value) ? value : ymd(new Date(value));
};

// Server record -> form values
export const toFormValues = (fields: FieldDef[], record: Record<string, any> = {}) => {
  const values: Record<string, any> = {};
  for (const field of fields) {
    const raw = record[field.name];
    if (field.type === 'checkbox') values[field.name] = Boolean(raw);
    else if (field.type === 'date' || field.type === 'datestamp') values[field.name] = toInputDate(raw);
    else if (field.type === 'time') values[field.name] = raw ? String(raw).slice(0, 5) : '';
    else if (field.type === 'list') values[field.name] = Array.isArray(raw) ? raw.join(', ') : '';
    else values[field.name] = raw ?? '';
  }
  return values;
};

// Form values -> request body
export const toPayload = (fields: FieldDef[], values: Record<string, any>) => {
  const payload: Record<string, any> = {};
  for (const field of fields) {
    const raw = values[field.name];
    if (field.type === 'checkbox') payload[field.name] = Boolean(raw);
    else if (field.type === 'number') payload[field.name] = raw === '' || raw == null ? '' : Number(raw);
    // Noon local time keeps a day-precision timestamp on the right day in any time zone.
    else if (field.type === 'datestamp') payload[field.name] = raw ? new Date(`${raw}T12:00:00`).toISOString() : '';
    else if (field.type === 'list') payload[field.name] = String(raw || '').split(',').map((item) => item.trim()).filter(Boolean);
    else payload[field.name] = raw;
  }
  return payload;
};

export const FormFields: React.FC<{
  fields: FieldDef[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
}> = ({ fields, values, onChange }) => (
  <div className="form-grid">
    {fields.map((field) => {
      const common = {
        id: `field-${field.name}`,
        name: field.name,
        required: field.required,
        placeholder: field.placeholder
      };
      const value = values[field.name] ?? '';

      if (field.type === 'checkbox') {
        return (
          <label key={field.name} className="field field-check">
            <input type="checkbox" id={common.id} name={field.name} checked={Boolean(value)} onChange={(e) => onChange(field.name, e.target.checked)} />
            <span>{field.label}</span>
          </label>
        );
      }

      let input: React.ReactNode;
      if (field.type === 'textarea') {
        input = <textarea {...common} rows={3} value={value} onChange={(e) => onChange(field.name, e.target.value)} />;
      } else if (field.type === 'select') {
        input = (
          <select {...common} value={value} onChange={(e) => onChange(field.name, e.target.value)}>
            <option value="">{field.required ? 'Select…' : '— None —'}</option>
            {(field.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      } else {
        const type = field.type === 'datestamp' ? 'date' : field.type === 'list' ? 'text' : field.type || 'text';
        input = (
          <input
            {...common}
            type={type}
            step={field.step || (type === 'number' ? 'any' : undefined)}
            min={type === 'number' ? 0 : undefined}
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
          />
        );
      }

      return (
        <div key={field.name} className={`field ${field.full || field.type === 'textarea' ? 'field-full' : ''}`}>
          <label htmlFor={common.id}>
            {field.label}
            {field.required && <span aria-hidden="true"> *</span>}
          </label>
          {input}
          {field.help && <small>{field.help}</small>}
        </div>
      );
    })}
  </div>
);

export const RecordForm: React.FC<{
  fields: FieldDef[];
  initial?: Record<string, any>;
  onSubmit: (payload: Record<string, any>) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  children?: React.ReactNode;
}> = ({ fields, initial, onSubmit, onCancel, submitLabel = 'Save', children }) => {
  const [values, setValues] = useState(() => toFormValues(fields, initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit(toPayload(fields, values));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Notice kind="error">{error}</Notice>
      <FormFields fields={fields} values={values} onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))} />
      {children}
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="button button-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="button" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
};

export interface Column {
  header: string;
  render: (row: any) => React.ReactNode;
  align?: 'right';
}

export const DataTable: React.FC<{ columns: Column[]; rows: any[]; actions?: (row: any) => React.ReactNode; empty?: string }> = ({
  columns,
  rows,
  actions,
  empty = 'Nothing here yet.'
}) =>
  rows.length === 0 ? (
    <Empty>{empty}</Empty>
  ) : (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.header} className={column.align === 'right' ? 'right' : undefined}>
                {column.header}
              </th>
            ))}
            {actions && <th aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.header} className={column.align === 'right' ? 'right' : undefined}>
                  {column.render(row)}
                </td>
              ))}
              {actions && <td className="row-actions">{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
