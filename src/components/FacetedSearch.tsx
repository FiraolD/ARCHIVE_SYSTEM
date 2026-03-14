import React from 'react';
import { Search, Filter, ChevronDown, Hash } from 'lucide-react';

interface FilterOption {
  label: string;
  value: string;
}

interface FacetedSearchProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: Record<string, any>) => void;
  filters?: FilterOption[];
}

export const FacetedSearch: React.FC<FacetedSearchProps> = ({ 
  onSearch, 
  filters = [] 
}) => {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Title or Archive ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <div className="relative w-full md:w-64">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Ref Number..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-mono"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-slate-200 rounded-lg flex items-center gap-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
            Advanced
          </button>
        </div>
      </div>

      {filters.length > 0 && (
        <div className="flex flex-wrap gap-3 pt-2">
          {filters.map((filter, index) => (
            <FilterBadge key={`${filter.label}-${index}`} label={filter.label} value={filter.value} />
          ))}
        </div>
      )}
    </div>
  );
};

const FilterBadge: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <button className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full flex items-center gap-2 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors">
    <span className="text-slate-400 font-normal">{label}:</span>
    {value}
    <ChevronDown className="w-3 h-3" />
  </button>
);