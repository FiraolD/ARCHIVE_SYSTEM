// frontend/src/pages/DocumentsPage.tsx
import React, { useState } from 'react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useArchive } from '../context/ArchiveContext';
import { FacetedSearch } from '../components/FacetedSearch';
import { DocumentList } from '../components/DocumentList';
import { DocumentPreview } from '../components/DocumentPreview';
import { Document } from '../types';

export const DocumentsPage: React.FC = () => {
  const {
    documents, branches, facets, filters, pagination, isLoading, setFilters,
  } = useArchive();

  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  const goToPage = (page: number) => {
    if (!pagination) return;
    if (page < 1 || page > pagination.total_pages) return;
    setFilters({ ...filters, page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-4">
      <FacetedSearch
        filters={filters}
        facets={facets}
        branches={branches}
        onFiltersChange={setFilters}
      />

      {/* Result bar */}
      <div className="flex items-center justify-between px-1">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {pagination ? (
            <>
              Showing{' '}
              <span className="font-bold text-slate-800 dark:text-slate-100 dark:text-slate-200">
                {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              of{' '}
              <span className="font-bold text-slate-800 dark:text-slate-100 dark:text-slate-200">
                {pagination.total.toLocaleString()}
              </span>{' '}
              documents
            </>
          ) : (
            <span className="opacity-50">Loading…</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-slate-500 dark:text-slate-400">Per page</label>
          <select
            value={filters.limit ?? 20}
            onChange={(e) => setFilters({ ...filters, page: 1, limit: Number(e.target.value) })}
            className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {isLoading && documents.length === 0 ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <DocumentList documents={documents} onPreview={setPreviewDoc} />
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-600 dark:text-slate-400 px-4">
            Page{' '}
            <span className="font-bold text-slate-800 dark:text-slate-100 dark:text-slate-200">
              {pagination.page}
            </span>{' '}
            of {pagination.total_pages}
          </span>
          <button
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.total_pages}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Existing side-drawer preview */}
      <DocumentPreview document={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
};