import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import { createCategory, deleteCategory, listCategories, updateCategory } from '../api/categories';
import { apiErrorMessage } from '../api/client';
import ConfirmDialog from '../components/Dialogs/ConfirmDialog';
import Modal from '../components/Dialogs/Modal';
import type { Category, CategoryType } from '../types/domain';
import { formatDate } from '../utils/format';
import './Categories.css';

/**
 * Category management module (IMPL-FE-10, BR-18): table of all categories
 * (grouped parents → subcategories) with view/create/edit/delete. Deletion is
 * guarded client-side by the linked-record count and re-checked server-side;
 * predefined categories are read-only.
 */

type TypeFilter = 'all' | CategoryType;

const TYPE_LABELS: Record<CategoryType, string> = {
  expense: 'Expense',
  investment: 'Investment',
};

/** Parents (alphabetical), each followed by its subcategories. */
function orderForTable(categories: Category[]): Category[] {
  const byName = (a: Category, b: Category) => a.name.localeCompare(b.name);
  const ordered: Category[] = [];
  for (const parent of categories.filter((c) => c.parentId === null).sort(byName)) {
    ordered.push(parent);
    ordered.push(...categories.filter((c) => c.parentId === parent.id).sort(byName));
  }
  return ordered;
}

interface FormState {
  /** null = create, otherwise the category being edited. */
  editing: Category | null;
  name: string;
  type: CategoryType;
  parentId: string;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const [viewed, setViewed] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [blockedDelete, setBlockedDelete] = useState<Category | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCategories(await listCategories());
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load categories'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const nameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  const visible = useMemo(() => {
    const filtered =
      typeFilter === 'all' ? categories : categories.filter((c) => c.type === typeFilter);
    return orderForTable(filtered);
  }, [categories, typeFilter]);

  const hasChildren = useCallback(
    (category: Category) => categories.some((c) => c.parentId === category.id),
    [categories]
  );

  const openCreate = () => {
    setFormError('');
    setForm({
      editing: null,
      name: '',
      type: typeFilter === 'investment' ? 'investment' : 'expense',
      parentId: '',
    });
  };

  const openEdit = (category: Category) => {
    setFormError('');
    setForm({
      editing: category,
      name: category.name,
      type: category.type,
      parentId: category.parentId ?? '',
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setFormError('');
    setSaving(true);
    try {
      if (form.editing) {
        await updateCategory(form.editing.id, {
          name: form.name.trim(),
          parentId: form.parentId || null,
        });
        setNotice('Category updated');
      } else {
        await createCategory({
          name: form.name.trim(),
          type: form.type,
          parentId: form.parentId || null,
        });
        setNotice('Category created');
      }
      setForm(null);
      await load();
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Could not save the category'));
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (category: Category) => {
    // Safe-deletion pre-check (BR-18); the backend re-checks and returns a
    // 409 with the reason in case this client-side view is stale.
    if (category.linkedRecords > 0 || hasChildren(category)) {
      setBlockedDelete(category);
    } else {
      setPendingDelete(category);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteCategory(pendingDelete.id);
      setNotice('Category deleted');
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not delete the category'));
    } finally {
      setPendingDelete(null);
    }
  };

  /** Valid parent choices: top-level categories of the same type, minus self. */
  const parentChoices = (state: FormState): Category[] =>
    categories.filter(
      (c) => c.type === state.type && c.parentId === null && c.id !== state.editing?.id
    );

  return (
    <div className="page categories">
      <div className="categories-header">
        <h1>Categories</h1>
        <div className="header-actions">
          <div className="filter-field">
            <label htmlFor="category-type-filter">Type</label>
            <select
              id="category-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            >
              <option value="all">All types</option>
              <option value="expense">Expense</option>
              <option value="investment">Investment</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            + Add Category
          </button>
        </div>
      </div>

      <div aria-live="polite">{notice && <div className="alert alert-success">{notice}</div>}</div>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading categories...</div>
      ) : visible.length === 0 ? (
        <div className="empty-state">No categories yet — add your first one</div>
      ) : (
        <div className="table-scroll">
          <table className="categories-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Parent Category</th>
                <th className="col-count">Linked Records</th>
                <th>Created</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((category) => (
                <tr key={category.id}>
                  <td className={category.parentId ? 'is-subcategory' : ''}>
                    {category.parentId && <span aria-hidden="true">↳ </span>}
                    {category.name}
                    {category.isPredefined && <span className="predefined-badge">Predefined</span>}
                  </td>
                  <td>
                    <span className={`type-pill type-${category.type}`}>
                      {TYPE_LABELS[category.type]}
                    </span>
                  </td>
                  <td>
                    {category.parentId ? (
                      nameById.get(category.parentId)
                    ) : (
                      <span className="cell-muted">—</span>
                    )}
                  </td>
                  <td className="col-count">{category.linkedRecords}</td>
                  <td>{formatDate(category.createdAt.slice(0, 10))}</td>
                  <td className="col-actions">
                    <div className="row-actions">
                      <button
                        type="button"
                        className="row-action"
                        aria-label={`View ${category.name}`}
                        onClick={() => setViewed(category)}
                      >
                        View
                      </button>
                      {!category.isPredefined && (
                        <>
                          <button
                            type="button"
                            className="row-action"
                            aria-label={`Edit ${category.name}`}
                            onClick={() => openEdit(category)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="row-action row-action-danger"
                            aria-label={`Delete ${category.name}`}
                            onClick={() => requestDelete(category)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewed && (
        <Modal title={viewed.name} onClose={() => setViewed(null)} size="sm">
          <dl className="category-details">
            <div>
              <dt>Type</dt>
              <dd>{TYPE_LABELS[viewed.type]}</dd>
            </div>
            <div>
              <dt>Parent category</dt>
              <dd>{viewed.parentId ? nameById.get(viewed.parentId) : 'None'}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{viewed.isPredefined ? 'Predefined' : 'Custom'}</dd>
            </div>
            <div>
              <dt>Linked records</dt>
              <dd>{viewed.linkedRecords}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDate(viewed.createdAt.slice(0, 10))}</dd>
            </div>
          </dl>
        </Modal>
      )}

      {form && (
        <Modal
          title={form.editing ? `Edit Category — ${form.editing.name}` : 'New Category'}
          onClose={() => setForm(null)}
          size="sm"
          closeOnBackdrop={false}
        >
          <form onSubmit={handleSubmit} className="category-form">
            {formError && (
              <div className="alert alert-danger" role="alert">
                {formError}
              </div>
            )}
            <div className="form-group">
              <label htmlFor="category-name">Name</label>
              <input
                id="category-name"
                type="text"
                value={form.name}
                maxLength={64}
                placeholder="e.g. Subscriptions"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="category-type">Type</label>
              <select
                id="category-type"
                value={form.type}
                disabled={form.editing !== null}
                onChange={(e) =>
                  // Changing type invalidates the parent selection.
                  setForm({ ...form, type: e.target.value as CategoryType, parentId: '' })
                }
              >
                <option value="expense">Expense</option>
                <option value="investment">Investment</option>
              </select>
              {form.editing && <p className="field-hint">Type cannot be changed after creation.</p>}
            </div>
            <div className="form-group">
              <label htmlFor="category-parent">Parent category (optional)</label>
              <select
                id="category-parent"
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              >
                <option value="">None (top-level)</option>
                {parentChoices(form).map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="category-form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setForm(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : form.editing ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete Category?"
          message={`Are you sure you want to delete "${pendingDelete.name}"? This cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {blockedDelete && (
        <Modal title="Cannot Delete Category" onClose={() => setBlockedDelete(null)} size="sm">
          <p>
            {blockedDelete.linkedRecords > 0
              ? `"${blockedDelete.name}" cannot be deleted because it is currently used by ` +
                `${blockedDelete.linkedRecords} existing ` +
                `${blockedDelete.type} record${blockedDelete.linkedRecords === 1 ? '' : 's'}.`
              : `"${blockedDelete.name}" cannot be deleted because it has subcategories. ` +
                'Delete or re-parent the subcategories first.'}
          </p>
        </Modal>
      )}
    </div>
  );
}
