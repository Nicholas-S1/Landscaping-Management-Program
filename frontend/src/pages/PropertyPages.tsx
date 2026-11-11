import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import { listItems, postData } from '../services/resource';
import { useCustomers, personOptions } from '../hooks/usePeople';
import {
  Badge, Empty, FieldDef, Loading, Notice, PageHeader, PhotoInput, PhotoStrip, RecordForm,
  fmtDateTime, label, mapsSearchUrl, options, personName, useLoad
} from '../components/ui';

const NOTE_TYPES = ['general', 'service', 'issue', 'maintenance', 'customer_request'];

export const NoteForm: React.FC<{ customerId?: string; staff: boolean; onSaved: () => void }> = ({ customerId, staff, onSaved }) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [formKey, setFormKey] = useState(0);

  const fields: FieldDef[] = [
    { name: 'content', label: staff ? 'Note' : 'Note for the crew', type: 'textarea', required: true },
    ...(staff
      ? ([
          { name: 'noteType', label: 'Type', type: 'select', options: options(NOTE_TYPES), required: true },
          { name: 'priority', label: 'Priority', type: 'select', options: options(['low', 'medium', 'high']), required: true },
          { name: 'isPrivate', label: 'Staff only (hidden from the customer)', type: 'checkbox' }
        ] as FieldDef[])
      : [])
  ];

  return (
    <RecordForm
      key={formKey}
      fields={fields}
      initial={{ noteType: 'general', priority: 'medium' }}
      submitLabel="Add note"
      onSubmit={async (payload) => {
        await postData('/property-notes', { ...payload, customerId, images: photos });
        setPhotos([]);
        setFormKey((key) => key + 1);
        onSaved();
      }}
    >
      <div style={{ marginTop: 12 }}>
        <PhotoInput value={photos} onChange={setPhotos} />
      </div>
    </RecordForm>
  );
};

export const NotesFeed: React.FC<{ customerId?: string; staff: boolean }> = ({ customerId, staff }) => {
  const { data: notes, loading, error, reload } = useLoad(
    () => listItems('/property-notes', customerId ? { customerId } : {}, 'propertyNotes'),
    [customerId]
  );

  return (
    <div className="stack">
      <NoteForm customerId={customerId} staff={staff} onSaved={reload} />
      <Notice kind="error">{error}</Notice>
      {loading && !notes ? (
        <Loading />
      ) : notes && notes.length > 0 ? (
        <ul className="list">
          {notes.map((note) => (
            <li key={note.id}>
              <div className="note-meta">
                <strong>{personName(note.author)}</strong>
                <span>{label(note.author?.role)}</span>
                <span>{fmtDateTime(note.createdAt)}</span>
                {note.noteType !== 'general' && <Badge value={note.noteType} />}
                {note.priority === 'high' && <Badge value="high" />}
                {note.isPrivate && <span className="badge">Staff only</span>}
              </div>
              <div>{note.content}</div>
              <PhotoStrip photos={note.images} />
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No notes or photos yet.</Empty>
      )}
    </div>
  );
};

// Staff view: pick a customer, read and add notes and photos for their property.
export const PropertyNotesPage: React.FC = () => {
  const { data: customers } = useCustomers();
  const [customerId, setCustomerId] = useState('');
  const customer = customers?.find((c) => c.id === customerId);

  return (
    <div>
      <PageHeader title="Property notes" subtitle="Notes and photos for each customer's property">
        <select aria-label="Customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">Select a customer…</option>
          {personOptions(customers).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </PageHeader>
      {!customer ? (
        <div className="card">
          <Empty>Choose a customer to see their property notes.</Empty>
        </div>
      ) : (
        <>
          <div className="card">
            <h2>{personName(customer)}</h2>
            <p>
              {customer.propertyAddress ? (
                <a href={mapsSearchUrl(customer.propertyAddress)} target="_blank" rel="noreferrer">
                  {customer.propertyAddress}
                </a>
              ) : (
                <span className="muted">No address on file</span>
              )}
              {customer.phone && <span className="muted"> · {customer.phone}</span>}
            </p>
            {customer.propertyNotes && <div className="callout">{customer.propertyNotes}</div>}
          </div>
          <div className="card">
            <NotesFeed key={customer.id} customerId={customer.id} staff />
          </div>
        </>
      )}
    </div>
  );
};

// Customer view: their own property details, notes and photos.
export const MyPropertyPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <PageHeader title="My property" subtitle="Your crew and the office can see everything on this page" />
      <div className="card">
        <h2>Property details</h2>
        <Notice kind="success">{saved ? 'Property details saved.' : ''}</Notice>
        <RecordForm
          fields={[
            { name: 'propertyAddress', label: 'Property address', full: true },
            { name: 'propertyNotes', label: 'Standing instructions (gate codes, pets, areas to avoid)', type: 'textarea' }
          ]}
          initial={user || {}}
          onSubmit={async (payload) => {
            updateUser(await authService.updateProfile(payload));
            setSaved(true);
          }}
        />
      </div>
      <div className="card">
        <h2>Notes and photos</h2>
        <NotesFeed staff={false} />
      </div>
    </div>
  );
};
