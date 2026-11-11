import React, { useState } from 'react';
import { personOptions, useCustomers } from '../hooks/usePeople';
import { errorMessage, listItems, postData, putData } from '../services/resource';
import {
  Badge, DataTable, Loading, Modal, Notice, PageHeader, RecordForm, Stat, fmtDate, money, options, personName, useLoad
} from '../components/ui';

const balanceOf = (invoice: any) => Number(invoice.totalAmount) - Number(invoice.paidAmount);
const isUnpaid = (invoice: any) => ['sent', 'overdue'].includes(invoice.status);

const InvoiceDetail: React.FC<{ invoice: any }> = ({ invoice }) => (
  <div className="stack">
    <div className="spread">
      <div>
        <strong>{personName(invoice.customer)}</strong>
        <div className="muted small">{invoice.customer?.propertyAddress}</div>
      </div>
      <div className="right">
        <Badge value={invoice.status} />
        <div className="muted small">
          Issued {fmtDate(invoice.invoiceDate)} · Due {fmtDate(invoice.dueDate)}
        </div>
      </div>
    </div>
    <DataTable
      rows={(invoice.lineItems || []).map((item: any, index: number) => ({ ...item, id: index }))}
      columns={[
        { header: 'Description', render: (item) => item.description },
        { header: 'Qty', align: 'right', render: (item) => item.quantity },
        { header: 'Rate', align: 'right', render: (item) => money(item.rate) },
        { header: 'Amount', align: 'right', render: (item) => money(item.amount) }
      ]}
    />
    <table style={{ maxWidth: 320, marginLeft: 'auto' }}>
      <tbody>
        <tr><td>Subtotal</td><td className="right">{money(invoice.subtotal)}</td></tr>
        {Number(invoice.taxAmount) > 0 && <tr><td>Tax ({Number(invoice.taxRate)}%)</td><td className="right">{money(invoice.taxAmount)}</td></tr>}
        {Number(invoice.discountAmount) > 0 && <tr><td>Discount</td><td className="right">−{money(invoice.discountAmount)}</td></tr>}
        <tr><td><strong>Total</strong></td><td className="right"><strong>{money(invoice.totalAmount)}</strong></td></tr>
        <tr><td>Paid</td><td className="right">{money(invoice.paidAmount)}</td></tr>
        <tr><td><strong>Balance due</strong></td><td className="right"><strong>{money(balanceOf(invoice))}</strong></td></tr>
      </tbody>
    </table>
    {invoice.notes && <p className="muted small">{invoice.notes}</p>}
  </div>
);

interface LineItem {
  description: string;
  quantity: string;
  rate: string;
}

const NewInvoiceForm: React.FC<{ onSaved: () => void; onCancel: () => void }> = ({ onSaved, onCancel }) => {
  const { data: customers } = useCustomers();
  const [customerId, setCustomerId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [send, setSend] = useState(true);
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: '1', rate: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setItem = (index: number, change: Partial<LineItem>) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...change } : item)));
  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);
  const total = Math.max(subtotal + (subtotal * (Number(taxRate) || 0)) / 100 - (Number(discount) || 0), 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await postData('/invoices', {
        customerId,
        dueDate: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : undefined,
        taxRate: Number(taxRate) || 0,
        discountAmount: Number(discount) || 0,
        notes,
        status: send ? 'sent' : 'draft',
        lineItems: items.map((item) => ({ description: item.description, quantity: Number(item.quantity), rate: Number(item.rate) }))
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="stack">
      <Notice kind="error">{error}</Notice>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="invoice-customer">Customer *</label>
          <select id="invoice-customer" required value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select…</option>
            {personOptions(customers).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="invoice-due">Due date</label>
          <input id="invoice-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <small>Leave blank for 30 days from today.</small>
        </div>
      </div>
      <div>
        <h3>Line items</h3>
        {items.map((item, index) => (
          <div className="row" key={index} style={{ marginTop: 8 }}>
            <input aria-label="Description" required placeholder="Description" style={{ flex: 1, minWidth: 160 }} value={item.description} onChange={(e) => setItem(index, { description: e.target.value })} />
            <input aria-label="Quantity" required type="number" min="0" step="any" placeholder="Qty" style={{ width: 80 }} value={item.quantity} onChange={(e) => setItem(index, { quantity: e.target.value })} />
            <input aria-label="Rate" required type="number" min="0" step="0.01" placeholder="Rate" style={{ width: 100 }} value={item.rate} onChange={(e) => setItem(index, { rate: e.target.value })} />
            {items.length > 1 && (
              <button type="button" className="link-button danger" onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>
                Remove
              </button>
            )}
          </div>
        ))}
        <button type="button" className="link-button" onClick={() => setItems((current) => [...current, { description: '', quantity: '1', rate: '' }])}>
          + Add line
        </button>
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="invoice-tax">Tax rate (%)</label>
          <input id="invoice-tax" type="number" min="0" step="any" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="invoice-discount">Discount ($)</label>
          <input id="invoice-discount" type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </div>
        <div className="field field-full">
          <label htmlFor="invoice-notes">Notes shown on the invoice</label>
          <textarea id="invoice-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <label className="field field-check">
          <input type="checkbox" checked={send} onChange={(e) => setSend(e.target.checked)} />
          <span>Send to the customer now (otherwise it is saved as a draft only you can see)</span>
        </label>
      </div>
      <div className="spread">
        <strong>Total: {money(total)}</strong>
        <div className="row">
          <button type="button" className="button button-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="button" disabled={saving}>
            {saving ? 'Saving…' : 'Create invoice'}
          </button>
        </div>
      </div>
    </form>
  );
};

export const InvoicesPage: React.FC = () => {
  const [status, setStatus] = useState('');
  const [viewing, setViewing] = useState<any | null>(null);
  const [paying, setPaying] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const { data: invoices, loading, error, reload } = useLoad(() => listItems('/invoices', status ? { status } : {}), [status]);

  const run = async (action: () => Promise<any>, success?: string) => {
    setMessage(null);
    try {
      await action();
      if (success) setMessage({ kind: 'success', text: success });
      reload();
    } catch (err) {
      setMessage({ kind: 'error', text: errorMessage(err) });
    }
  };

  const unpaid = (invoices || []).filter(isUnpaid);

  return (
    <div>
      <PageHeader title="Invoices" subtitle="Invoices are created automatically when a priced job is completed and when service plans bill.">
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Status: all</option>
          {options(['draft', 'sent', 'overdue', 'paid', 'cancelled']).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button className="button" onClick={() => setCreating(true)}>
          New invoice
        </button>
      </PageHeader>
      <Notice kind={message?.kind || 'error'}>{message?.text || error}</Notice>
      {!status && invoices && (
        <div className="stats">
          <Stat label="Outstanding" value={money(unpaid.reduce((sum, invoice) => sum + balanceOf(invoice), 0))} />
          <Stat label="Overdue" tone="warn" value={money(unpaid.filter((invoice) => invoice.status === 'overdue').reduce((sum, invoice) => sum + balanceOf(invoice), 0))} />
          <Stat label="Unpaid invoices" value={unpaid.length} />
        </div>
      )}
      <div className="card">
        {loading && !invoices ? (
          <Loading />
        ) : (
          <DataTable
            empty="No invoices."
            rows={invoices || []}
            columns={[
              { header: 'Invoice', render: (invoice) => (<><strong>{invoice.invoiceNumber}</strong>{invoice.job && <div className="muted small">{invoice.job.title}</div>}</>) },
              { header: 'Customer', render: (invoice) => personName(invoice.customer) },
              { header: 'Issued', render: (invoice) => fmtDate(invoice.invoiceDate) },
              { header: 'Due', render: (invoice) => fmtDate(invoice.dueDate) },
              { header: 'Total', align: 'right', render: (invoice) => money(invoice.totalAmount) },
              { header: 'Balance', align: 'right', render: (invoice) => (invoice.status === 'cancelled' ? '—' : money(balanceOf(invoice))) },
              { header: 'Status', render: (invoice) => <Badge value={invoice.status} /> }
            ]}
            actions={(invoice) => (
              <>
                <button className="link-button" onClick={() => setViewing(invoice)}>
                  View
                </button>
                {invoice.status === 'draft' && (
                  <button className="link-button" onClick={() => run(() => putData(`/invoices/${invoice.id}`, { status: 'sent' }), `Invoice ${invoice.invoiceNumber} sent.`)}>
                    Send
                  </button>
                )}
                {isUnpaid(invoice) && (
                  <>
                    <button className="link-button" onClick={() => setPaying(invoice)}>
                      Record payment
                    </button>
                    <button className="link-button" onClick={() => run(() => postData(`/invoices/${invoice.id}/remind`), `Reminder sent to ${personName(invoice.customer)}.`)}>
                      Remind
                    </button>
                  </>
                )}
                {['draft', 'sent', 'overdue'].includes(invoice.status) && (
                  <button
                    className="link-button danger"
                    onClick={() => window.confirm(`Cancel invoice ${invoice.invoiceNumber}?`) && run(() => putData(`/invoices/${invoice.id}`, { status: 'cancelled' }))}
                  >
                    Cancel
                  </button>
                )}
              </>
            )}
          />
        )}
      </div>

      {viewing && (
        <Modal title={`Invoice ${viewing.invoiceNumber}`} onClose={() => setViewing(null)} wide>
          <InvoiceDetail invoice={viewing} />
        </Modal>
      )}
      {creating && (
        <Modal title="New invoice" onClose={() => setCreating(false)} wide>
          <NewInvoiceForm
            onCancel={() => setCreating(false)}
            onSaved={() => {
              setCreating(false);
              reload();
            }}
          />
        </Modal>
      )}
      {paying && (
        <Modal title={`Record payment: ${paying.invoiceNumber}`} onClose={() => setPaying(null)}>
          <p className="muted small" style={{ marginBottom: 12 }}>
            Balance due: {money(balanceOf(paying))}
          </p>
          <RecordForm
            submitLabel="Record payment"
            initial={{ amount: balanceOf(paying).toFixed(2), paymentMethod: 'check' }}
            fields={[
              { name: 'amount', label: 'Amount received ($)', type: 'number', step: '0.01', required: true },
              { name: 'paymentMethod', label: 'Method', type: 'select', options: options(['cash', 'check', 'credit_card', 'bank_transfer']), required: true }
            ]}
            onCancel={() => setPaying(null)}
            onSubmit={async (payload) => {
              await postData(`/invoices/${paying.id}/payments`, payload);
              setPaying(null);
              reload();
            }}
          />
        </Modal>
      )}
    </div>
  );
};

// Customer view of their own invoices
export const BillsPage: React.FC = () => {
  const [viewing, setViewing] = useState<any | null>(null);
  const { data: invoices, loading, error } = useLoad(() => listItems('/invoices'), []);
  const due = (invoices || []).filter(isUnpaid).reduce((sum, invoice) => sum + balanceOf(invoice), 0);

  return (
    <div>
      <PageHeader title="Bills" subtitle="Your invoices and payment history" />
      <Notice kind="error">{error}</Notice>
      <div className="stats">
        <Stat label="Balance due" value={money(due)} tone={due > 0 ? 'warn' : 'good'} />
      </div>
      {due > 0 && <Notice kind="info">Online card payment is not available yet. To pay a bill, send a message or contact the office.</Notice>}
      <div className="card">
        {loading && !invoices ? (
          <Loading />
        ) : (
          <DataTable
            empty="You have no bills yet."
            rows={invoices || []}
            columns={[
              { header: 'Invoice', render: (invoice) => (<><strong>{invoice.invoiceNumber}</strong>{invoice.job && <div className="muted small">{invoice.job.title}</div>}</>) },
              { header: 'Issued', render: (invoice) => fmtDate(invoice.invoiceDate) },
              { header: 'Due', render: (invoice) => fmtDate(invoice.dueDate) },
              { header: 'Total', align: 'right', render: (invoice) => money(invoice.totalAmount) },
              { header: 'Balance', align: 'right', render: (invoice) => (invoice.status === 'cancelled' ? '—' : money(balanceOf(invoice))) },
              { header: 'Status', render: (invoice) => <Badge value={invoice.status} /> }
            ]}
            actions={(invoice) => (
              <button className="link-button" onClick={() => setViewing(invoice)}>
                View
              </button>
            )}
          />
        )}
      </div>
      {viewing && (
        <Modal title={`Invoice ${viewing.invoiceNumber}`} onClose={() => setViewing(null)} wide>
          <InvoiceDetail invoice={viewing} />
        </Modal>
      )}
    </div>
  );
};
