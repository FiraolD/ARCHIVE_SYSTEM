import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Filter, X, Calendar, DollarSign, Hash,
  MapPin, FileType, CircleDot, Sparkles, ChevronDown,
} from 'lucide-react';
import type { DocumentFilters, Facets, FacetBucket } from '../types';



interface FacetedSearchProps {
  filters: DocumentFilters;
  facets: Facets | null;
  branches: { id: string; name: string; code: string }[];
  onFiltersChange: (next: DocumentFilters) => void;
}

export const FacetedSearch: React.FC<FacetedSearchProps> = ({
  filters,
  facets,
  branches,
  onFiltersChange,
}) => {
  const [open, setOpen] = useState(true);
  const [localSearch, setLocalSearch] = useState(filters.search ?? '');

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      if ((filters.search ?? '') !== localSearch) {
        onFiltersChange({ ...filters, search: localSearch || undefined, page: 1 });
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  const update = (patch: Partial<DocumentFilters>) =>
    onFiltersChange({ ...filters, ...patch, page: 1 });

  const clear = () => {
    setLocalSearch('');
    onFiltersChange({ page: 1, limit: filters.limit ?? 20 });
  };

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (filters.search)
      chips.push({ key: 'search', label: `"${filters.search}"`, onRemove: () => { setLocalSearch(''); update({ search: undefined }); } });
    if (filters.type)
      chips.push({ key: 'type', label: `Type: ${filters.type}`, onRemove: () => update({ type: undefined }) });
    if (filters.status)
      chips.push({ key: 'status', label: `Status: ${filters.status}`, onRemove: () => update({ status: undefined }) });
    if (filters.branch_id) {
      const b = branches.find((x) => x.id === filters.branch_id);
      chips.push({ key: 'branch', label: `Branch: ${b?.name ?? filters.branch_id}`, onRemove: () => update({ branch_id: undefined }) });
    }
    if (filters.plate_number)
      chips.push({ key: 'plate', label: `Plate: ${filters.plate_number}`, onRemove: () => update({ plate_number: undefined }) });
    if (filters.insured_name)
      chips.push({ key: 'insured', label: `Insured: ${filters.insured_name}`, onRemove: () => update({ insured_name: undefined }) });
    if (filters.date_of_accident_from || filters.date_of_accident_to) {
      const label = `Accident: ${filters.date_of_accident_from ?? '…'} → ${filters.date_of_accident_to ?? '…'}`;
      chips.push({ key: 'acc', label, onRemove: () => update({ date_of_accident_from: undefined, date_of_accident_to: undefined }) });
    }
    if (filters.sum_insured_min != null || filters.sum_insured_max != null) {
      const label = `Sum: ${filters.sum_insured_min?.toLocaleString() ?? '0'} – ${filters.sum_insured_max?.toLocaleString() ?? '∞'}`;
      chips.push({ key: 'sum', label, onRemove: () => update({ sum_insured_min: undefined, sum_insured_max: undefined }) });
    }
    if (filters.legacy)
      chips.push({
        key: 'legacy',
        label: filters.legacy === 'true' ? 'Legacy only' : 'New only',
        onRemove: () => update({ legacy: undefined }),
      });
    return chips;
  }, [filters, branches]);

  const totalActive = activeChips.length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      {/* Top bar */}
      <div className="p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search title, claim #, insured, plate, or archive ref…"
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setOpen((v) => !v)}
            className={`px-4 py-2 border rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
              open
                ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {totalActive > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                {totalActive}
              </span>
            )}
          </button>
          {totalActive > 0 && (
            <button
              onClick={clear}
              className="px-3 py-2 text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Active chips */}
      {totalActive > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {activeChips.map((c) => (
            <button
              key={c.key}
              onClick={c.onRemove}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {c.label}
              <X className="w-3 h-3 opacity-60" />
            </button>
          ))}
        </div>
      )}

      {/* Filter panel */}
      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800 dark:border-slate-800 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Type */}
          <Field label="Type" icon={<FileType className="w-3.5 h-3.5" />}>
            <select
              value={filters.type ?? ''}
              onChange={(e) => update({ type: e.target.value || undefined })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            >
              <option value="">All types</option>
              {facets?.by_type.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.value} ({f.count})
                </option>
              ))}
            </select>
          </Field>

          {/* Status */}
          <Field label="Status" icon={<CircleDot className="w-3.5 h-3.5" />}>
            <select
              value={filters.status ?? ''}
              onChange={(e) => update({ status: e.target.value || undefined })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            >
              <option value="">All statuses</option>
              {facets?.by_status.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.value} ({f.count})
                </option>
              ))}
            </select>
          </Field>

          {/* Branch */}
          <Field label="Branch" icon={<MapPin className="w-3.5 h-3.5" />}>
            <select
              value={filters.branch_id ?? ''}
              onChange={(e) => update({ branch_id: e.target.value || undefined })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            >
              <option value="">All branches</option>
              {(facets?.by_branch ?? branches).map((b: any) => (
                <option key={b.id ?? b.value} value={b.id ?? ''}>
                  {b.value ?? b.name} ({b.count ?? ''})
                </option>
              ))}
            </select>
          </Field>

          {/* Plate number */}
          <Field label="Plate Number" icon={<Hash className="w-3.5 h-3.5" />}>
            <input
              type="text"
              value={filters.plate_number ?? ''}
              onChange={(e) => update({ plate_number: e.target.value || undefined })}
              placeholder="e.g. 3-12345"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono"
            />
          </Field>

          {/* Accident year shortcut */}
          <Field label="Accident Year" icon={<Calendar className="w-3.5 h-3.5" />}>
            <select
              value=""
              onChange={(e) => {
                const y = e.target.value;
                if (!y) return;
                update({
                  date_of_accident_from: `${y}-01-01`,
                  date_of_accident_to: `${y}-12-31`,
                });
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            >
              <option value="">Select year…</option>
              {facets?.by_accident_year.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.value} ({y.count})
                </option>
              ))}
            </select>
          </Field>

          {/* Accident date range */}
          <Field label="Accident From">
            <input
              type="date"
              value={filters.date_of_accident_from ?? ''}
              onChange={(e) => update({ date_of_accident_from: e.target.value || undefined })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            />
          </Field>
          <Field label="Accident To">
            <input
              type="date"
              value={filters.date_of_accident_to ?? ''}
              onChange={(e) => update({ date_of_accident_to: e.target.value || undefined })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            />
          </Field>

          {/* Legacy toggle */}
          <Field label="Source" icon={<Sparkles className="w-3.5 h-3.5" />}>
            <select
              value={filters.legacy ?? ''}
              onChange={(e) =>
                update({ legacy: (e.target.value || undefined) as any })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            >
              <option value="">All sources</option>
              <option value="true">Legacy only (AIC)</option>
              <option value="false">New entries only</option>
            </select>
          </Field>

          {/* Sum insured range */}
          <Field label="Sum Insured (min)" icon={<DollarSign className="w-3.5 h-3.5" />}>
            <input
              type="number"
              value={filters.sum_insured_min ?? ''}
              onChange={(e) =>
                update({ sum_insured_min: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder={facets?.ranges.sum_insured_min?.toLocaleString() ?? '0'}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            />
          </Field>
          <Field label="Sum Insured (max)">
            <input
              type="number"
              value={filters.sum_insured_max ?? ''}
              onChange={(e) =>
                update({ sum_insured_max: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder={facets?.ranges.sum_insured_max?.toLocaleString() ?? '∞'}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            />
          </Field>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; icon?: React.ReactNode; children: React.ReactNode }> = ({
  label,
  icon,
  children,
}) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
      {icon}
      {label}
    </span>
    {children}
  </label>
);