import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import { errorMessage, getData, listItems, postData, deleteData } from '../services/resource';
import { Empty, FieldDef, Loading, Modal, Notice, PageHeader, RecordForm, fmtDateTime, label, personName, useLoad } from '../components/ui';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const [box, setBox] = useState<'inbox' | 'sent'>('inbox');
  const [open, setOpen] = useState<any | null>(null);
  const [compose, setCompose] = useState<{ recipientId?: string; subject?: string } | null>(null);
  const [announcing, setAnnouncing] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const { data: messages, loading, error: loadError, reload } = useLoad(() => listItems('/messages', { type: box }, 'messages'), [box]);
  const { data: contacts } = useLoad(() => listItems('/users/contacts', {}, 'users'), []);

  const read = async (message: any) => {
    setError('');
    try {
      // Opening a message marks it read on the server.
      setOpen((await getData(`/messages/${message.id}`)).message);
      if (box === 'inbox' && !message.isRead) reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const remove = async (message: any) => {
    if (!window.confirm('Delete this message?')) return;
    await deleteData(`/messages/${message.id}`);
    setOpen(null);
    reload();
  };

  const composeFields: FieldDef[] = [
    {
      name: 'recipientId',
      label: 'To',
      type: 'select',
      required: true,
      full: true,
      options: (contacts || []).map((contact) => ({ value: contact.id, label: `${contact.lastName}, ${contact.firstName} (${contact.role === 'admin' ? 'owner' : contact.role})` }))
    },
    { name: 'subject', label: 'Subject', full: true },
    { name: 'content', label: 'Message', type: 'textarea', required: true }
  ];

  return (
    <div>
      <PageHeader title="Messages" subtitle={user?.role === 'customer' ? 'Send a message to the office' : 'Messages with your team and customers'}>
        {user?.role === 'admin' && (
          <button className="button button-secondary" onClick={() => setAnnouncing(true)}>
            Announcement to all staff
          </button>
        )}
        <button className="button" onClick={() => setCompose({})}>
          New message
        </button>
      </PageHeader>
      <div className="tabs" role="tablist">
        {(['inbox', 'sent'] as const).map((name) => (
          <button key={name} role="tab" aria-selected={box === name} className={`tab ${box === name ? 'active' : ''}`} onClick={() => setBox(name)}>
            {label(name)}
          </button>
        ))}
      </div>
      <Notice kind="success">{notice}</Notice>
      <Notice kind="error">{error || loadError}</Notice>
      <div className="card">
        {loading && !messages ? (
          <Loading />
        ) : !messages || messages.length === 0 ? (
          <Empty>{box === 'inbox' ? 'No messages yet.' : 'You have not sent any messages.'}</Empty>
        ) : (
          <ul className="list">
            {messages.map((message) => (
              <li key={message.id} className={`message ${box === 'inbox' && !message.isRead ? 'unread' : ''}`}>
                <button className="link-button" style={{ textAlign: 'left', width: '100%', color: 'inherit', fontWeight: 'inherit' }} onClick={() => read(message)}>
                  <div className="spread">
                    <span className="message-subject">
                      {box === 'inbox' && !message.isRead && <span className="badge badge-sent">New</span>} {message.subject || '(no subject)'}
                    </span>
                    <span className="muted small">{fmtDateTime(message.createdAt)}</span>
                  </div>
                  <div className="muted small">
                    {box === 'inbox' ? `From ${personName(message.sender)}` : `To ${personName(message.recipient)}`} · {message.content.slice(0, 90)}
                    {message.content.length > 90 && '…'}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && (
        <Modal title={open.subject || '(no subject)'} onClose={() => setOpen(null)}>
          <p className="muted small">
            From {personName(open.sender)} to {personName(open.recipient)} · {fmtDateTime(open.createdAt)}
          </p>
          <p style={{ whiteSpace: 'pre-wrap', margin: '14px 0' }}>{open.content}</p>
          <div className="form-actions">
            <button className="button button-secondary" onClick={() => remove(open)}>
              Delete
            </button>
            {open.senderId !== user?.id && (
              <button
                className="button"
                onClick={() => {
                  setCompose({ recipientId: open.senderId, subject: open.subject ? `Re: ${open.subject.replace(/^Re: /, '')}` : '' });
                  setOpen(null);
                }}
              >
                Reply
              </button>
            )}
          </div>
        </Modal>
      )}
      {compose && (
        <Modal title="New message" onClose={() => setCompose(null)}>
          <RecordForm
            fields={composeFields}
            initial={compose}
            submitLabel="Send"
            onCancel={() => setCompose(null)}
            onSubmit={async (payload) => {
              await postData('/messages', payload);
              setCompose(null);
              setNotice('Message sent.');
              reload();
            }}
          />
        </Modal>
      )}
      {announcing && (
        <Modal title="Announcement to all staff" onClose={() => setAnnouncing(false)}>
          <p className="muted small" style={{ marginBottom: 12 }}>
            Every active employee and manager gets this in their inbox. It is also sent as a text message once a texting account is connected.
          </p>
          <RecordForm
            fields={[
              { name: 'subject', label: 'Subject', full: true, placeholder: 'Company announcement' },
              { name: 'content', label: 'Message', type: 'textarea', required: true }
            ]}
            submitLabel="Send to everyone"
            onCancel={() => setAnnouncing(false)}
            onSubmit={async (payload) => {
              const result = await postData('/broadcasts', payload);
              const texts = result.sms.configured
                ? `${result.sms.sent} text message(s) sent${result.sms.failed ? `, ${result.sms.failed} failed` : ''}${result.sms.skipped ? `, ${result.sms.skipped} without a phone number` : ''}.`
                : 'Text messages were not sent because texting is not set up yet.';
              setAnnouncing(false);
              setNotice(`Announcement delivered to ${result.recipients} inbox(es). ${texts}`);
            }}
          />
        </Modal>
      )}
    </div>
  );
};

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [saved, setSaved] = useState('');
  const [passwordKey, setPasswordKey] = useState(0);

  if (!user) return null;

  return (
    <div>
      <PageHeader title="Profile" subtitle={user.email} />
      <Notice kind="success">{saved}</Notice>
      <div className="card">
        <h2>Contact details</h2>
        <RecordForm
          fields={[
            { name: 'firstName', label: 'First name', required: true },
            { name: 'lastName', label: 'Last name', required: true },
            { name: 'phone', label: 'Phone' },
            { name: 'address', label: 'Mailing address' }
          ]}
          initial={user}
          onSubmit={async (payload) => {
            updateUser(await authService.updateProfile(payload));
            setSaved('Contact details saved.');
          }}
        />
      </div>
      <div className="card">
        <h2>Change password</h2>
        <RecordForm
          key={passwordKey}
          submitLabel="Change password"
          fields={[
            { name: 'currentPassword', label: 'Current password', type: 'password', required: true },
            { name: 'newPassword', label: 'New password (at least 6 characters)', type: 'password', required: true }
          ]}
          onSubmit={async (payload) => {
            await authService.changePassword(payload as any);
            setPasswordKey((key) => key + 1);
            setSaved('Password changed.');
          }}
        />
      </div>
    </div>
  );
};
