import React, { useState } from 'react';
import { deleteData, errorMessage, listItems, postData, putData } from '../services/resource';
import { Column, DataTable, FieldDef, Loading, Modal, Notice, Option, PageHeader, RecordForm, useLoad } from './ui';

export interface ResourceConfig {
  title: string;
  subtitle?: string;
  noun: string;
  path: string;
  listKey?: string;
  params?: Record<string, any>;
  columns: Column[];
  fields: FieldDef[];
  canCreate?: boolean;
  canEdit?: boolean | ((row: any) => boolean);
  canDelete?: boolean;
  deleteLabel?: string;
  filter?: { name: string; label: string; options: Option[] };
  createDefaults?: Record<string, any>;
  // Fields shown only when creating (for example, the customer on a plan cannot change later).
  createOnlyFields?: string[];
  mapPayload?: (payload: Record<string, any>, editing: any | null) => Record<string, any>;
  mapRecord?: (row: any) => Record<string, any>;
  rowActions?: (row: any, reload: () => void) => React.ReactNode;
  headerActions?: (reload: () => void) => React.ReactNode;
  empty?: string;
}

const ResourcePage: React.FC<ResourceConfig> = (config) => {
  const [filterValue, setFilterValue] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const params = { ...config.params, ...(config.filter && filterValue ? { [config.filter.name]: filterValue } : {}) };
  const { data: rows, loading, error: loadError, reload } = useLoad(
    () => listItems(config.path, params, config.listKey),
    [config.path, JSON.stringify(params)]
  );

  const save = async (payload: Record<string, any>) => {
    const body = config.mapPayload ? config.mapPayload(payload, editing) : payload;
    if (editing) await putData(`${config.path}/${editing.id}`, body);
    else await postData(config.path, body);
    setEditing(null);
    setCreating(false);
    reload();
  };

  const remove = async (row: any) => {
    const verb = (config.deleteLabel || 'Delete').toLowerCase();
    if (!window.confirm(`Are you sure you want to ${verb} this ${config.noun}?`)) return;
    setError('');
    try {
      await deleteData(`${config.path}/${row.id}`);
      reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const mayEdit = (row: any) => (typeof config.canEdit === 'function' ? config.canEdit(row) : Boolean(config.canEdit));
  const hasActions = Boolean(config.canEdit || config.canDelete || config.rowActions);
  const formFields = editing ? config.fields.filter((field) => !config.createOnlyFields?.includes(field.name)) : config.fields;

  return (
    <div>
      <PageHeader title={config.title} subtitle={config.subtitle}>
        {config.filter && (
          <select aria-label={config.filter.label} value={filterValue} onChange={(e) => setFilterValue(e.target.value)}>
            <option value="">{config.filter.label}: all</option>
            {config.filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
        {config.headerActions?.(reload)}
        {config.canCreate && (
          <button className="button" onClick={() => setCreating(true)}>
            New {config.noun}
          </button>
        )}
      </PageHeader>

      <Notice kind="error">{error || loadError}</Notice>

      <div className="card">
        {loading && !rows ? (
          <Loading />
        ) : (
          <DataTable
            columns={config.columns}
            rows={rows || []}
            empty={config.empty || `No ${config.noun}s yet.`}
            actions={
              hasActions
                ? (row) => (
                    <>
                      {config.rowActions?.(row, reload)}
                      {mayEdit(row) && (
                        <button className="link-button" onClick={() => setEditing(row)}>
                          Edit
                        </button>
                      )}
                      {config.canDelete && (
                        <button className="link-button danger" onClick={() => remove(row)}>
                          {config.deleteLabel || 'Delete'}
                        </button>
                      )}
                    </>
                  )
                : undefined
            }
          />
        )}
      </div>

      {(creating || editing) && (
        <Modal
          title={editing ? `Edit ${config.noun}` : `New ${config.noun}`}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        >
          <RecordForm
            fields={formFields}
            initial={editing ? (config.mapRecord ? config.mapRecord(editing) : editing) : config.createDefaults}
            onSubmit={save}
            onCancel={() => {
              setEditing(null);
              setCreating(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
};

export default ResourcePage;
