import React, { useState } from 'react';
import { errorMessage, listItems, postData, putData } from '../services/resource';
import {
  Badge, Modal, Notice, PhotoInput, PhotoStrip, fmtDate, fmtTime, label, mapsSearchUrl, money, personName, useLoad
} from '../components/ui';

interface Material {
  inventoryId: string;
  quantity: string;
}

const CompleteJobForm: React.FC<{ job: any; onDone: (message: string) => void; onCancel: () => void }> = ({ job, onDone, onCancel }) => {
  const { data: inventory } = useLoad(() => listItems('/inventory'), []);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>(job.afterPhotos || []);
  const [notes, setNotes] = useState(job.internalNotes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setMaterial = (index: number, change: Partial<Material>) =>
    setMaterials((current) => current.map((material, i) => (i === index ? { ...material, ...change } : material)));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await postData(`/jobs/${job.id}/complete`, {
        materialsUsed: materials
          .filter((material) => material.inventoryId && Number(material.quantity) > 0)
          .map((material) => ({ inventoryId: material.inventoryId, quantity: Number(material.quantity) })),
        afterPhotos,
        internalNotes: notes
      });
      onDone(result.invoice ? `Job completed. Invoice ${result.invoice.invoiceNumber} was created for ${money(result.invoice.totalAmount)}.` : 'Job completed.');
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="stack">
      <Notice kind="error">{error}</Notice>
      <div>
        <h3>Materials used</h3>
        {materials.map((material, index) => (
          <div className="row" key={index} style={{ marginTop: 8 }}>
            <select aria-label="Material" value={material.inventoryId} onChange={(e) => setMaterial(index, { inventoryId: e.target.value })}>
              <option value="">Select material…</option>
              {(inventory || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.currentQuantity} {item.unit} in stock)
                </option>
              ))}
            </select>
            <input
              aria-label="Quantity"
              type="number"
              min="0"
              step="any"
              placeholder="Qty"
              style={{ width: 90 }}
              value={material.quantity}
              onChange={(e) => setMaterial(index, { quantity: e.target.value })}
            />
            <button type="button" className="link-button danger" onClick={() => setMaterials((current) => current.filter((_, i) => i !== index))}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="link-button" onClick={() => setMaterials((current) => [...current, { inventoryId: '', quantity: '' }])}>
          + Add material
        </button>
      </div>
      <div>
        <h3>After photos</h3>
        <PhotoInput value={afterPhotos} onChange={setAfterPhotos} />
      </div>
      <div className="field">
        <label htmlFor="complete-notes">Crew notes (not shown to the customer)</label>
        <textarea id="complete-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="form-actions">
        <button type="button" className="button button-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button" disabled={saving}>
          {saving ? 'Saving…' : 'Mark complete'}
        </button>
      </div>
    </form>
  );
};

// A job as the crew works it: checklist, photos, start and complete.
const JobCard: React.FC<{ job: any; onChange: () => void }> = ({ job, onChange }) => {
  const [completing, setCompleting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const open = job.status === 'pending' || job.status === 'in_progress';

  const run = async (action: () => Promise<any>) => {
    setError('');
    try {
      await action();
      onChange();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const toggleItem = (index: number) =>
    run(() =>
      putData(`/jobs/${job.id}`, {
        checklist: job.checklist.map((item: any, i: number) => (i === index ? { ...item, done: !item.done } : item))
      })
    );

  return (
    <div className="card">
      <div className="spread">
        <div>
          <h2>{job.title}</h2>
          <div className="muted small">
            {personName(job.customer)} · {label(job.jobType)} · {fmtDate(job.scheduledDate)}
            {job.scheduledStartTime && ` at ${fmtTime(job.scheduledStartTime)}`}
          </div>
          {job.customer?.propertyAddress && (
            <a className="small" href={mapsSearchUrl(job.customer.propertyAddress)} target="_blank" rel="noreferrer">
              {job.customer.propertyAddress}
            </a>
          )}
        </div>
        <div className="row">
          {job.priority === 'high' || job.priority === 'urgent' ? <Badge value={job.priority} /> : null}
          <Badge value={job.status} />
        </div>
      </div>

      <Notice kind="error">{error}</Notice>
      <Notice kind="success">{message}</Notice>

      {job.description && <p style={{ marginTop: 10 }}>{job.description}</p>}
      {job.customerNotes && <div className="callout">Customer request: {job.customerNotes}</div>}
      {job.internalNotes && <p className="muted small" style={{ marginTop: 8 }}>Crew notes: {job.internalNotes}</p>}

      {Array.isArray(job.checklist) && job.checklist.length > 0 && (
        <div className="checklist" style={{ marginTop: 10 }}>
          <h3>Checklist</h3>
          {job.checklist.map((item: any, index: number) => (
            <label key={index}>
              <input type="checkbox" checked={Boolean(item.done)} disabled={!open} onChange={() => toggleItem(index)} />
              {item.label}
            </label>
          ))}
        </div>
      )}

      {open && (
        <div style={{ marginTop: 10 }}>
          <h3>Before photos</h3>
          <PhotoInput value={job.beforePhotos || []} onChange={(photos) => run(() => putData(`/jobs/${job.id}`, { beforePhotos: photos }))} label="Add before photo" />
        </div>
      )}
      {!open && (job.beforePhotos?.length > 0 || job.afterPhotos?.length > 0) && (
        <div className="grid" style={{ marginTop: 10 }}>
          <div>
            <h3>Before</h3>
            <PhotoStrip photos={job.beforePhotos} />
          </div>
          <div>
            <h3>After</h3>
            <PhotoStrip photos={job.afterPhotos} />
          </div>
        </div>
      )}
      {job.status === 'completed' && (
        <p className="muted small" style={{ marginTop: 8 }}>
          Completed {fmtDate(job.completedAt)}
          {job.actualDuration != null && ` · ${job.actualDuration} min on site`}
          {job.materialsUsed?.length > 0 && ` · Materials: ${job.materialsUsed.map((m: any) => `${m.quantity} ${m.unit || ''} ${m.name || ''}`.trim()).join(', ')}`}
        </p>
      )}

      {open && (
        <div className="row" style={{ marginTop: 14 }}>
          {job.status === 'pending' && (
            <button className="button button-secondary" onClick={() => run(() => postData(`/jobs/${job.id}/start`))}>
              Start job
            </button>
          )}
          <button className="button" onClick={() => setCompleting(true)}>
            Complete job
          </button>
        </div>
      )}

      {completing && (
        <Modal title={`Complete: ${job.title}`} onClose={() => setCompleting(false)}>
          <CompleteJobForm
            job={job}
            onCancel={() => setCompleting(false)}
            onDone={(text) => {
              setCompleting(false);
              setMessage(text);
              onChange();
            }}
          />
        </Modal>
      )}
    </div>
  );
};

export default JobCard;
