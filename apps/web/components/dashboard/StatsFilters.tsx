'use client';

import { useState, useEffect } from 'react';
import { Calendar, Filter, Download, RefreshCw, Search } from 'lucide-react';
import ConfirmationDialog from '../ui/ConfirmationDialog';
import { useDateConfirmation } from '../../hooks/useDateConfirmation';
import {
  unifiedStatusMap,
  statusLabels,
  getUnifiedStatusValues,
  transactionStatusMap,
  withdrawalStatusMap,
  transactionStatusLabels,
  withdrawalStatusLabels,
  getMappedStatusValues
} from '@/lib/status-mapping';

export interface FilterOptions {
  dateRange: {
    startDate: string | undefined;
    endDate: string | undefined;
  };
  databases: string[];
  gateways: string[];
  sites: string[];
  status: string[]; // Unified status values (API-compatible)
  type: 'transactions' | 'withdrawals' | 'both';
  amountRange: {
    min?: number;
    max?: number;
  };
}

interface StatsFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
  onExport: (format: 'csv' | 'excel' | 'pdf') => void;
  onRefresh: () => void;
  availableOptions?: {
    databases: string[];
    gateways: string[];
    sites: string[];
  };
  isLoading?: boolean;
  showDatabasesAlways?: boolean; // Show databases outside advanced section
}



export default function StatsFilters({
  onFiltersChange,
  onExport,
  onRefresh,
  availableOptions = { databases: [], gateways: [], sites: [] },
  isLoading = false,
  showDatabasesAlways = false
}: StatsFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
      endDate: new Date().toISOString().split('T')[0] || '',
    },
    databases: [],
    gateways: [],
    sites: [],
    status: [],
    type: 'both',
    amountRange: {},
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [quickDateRange, setQuickDateRange] = useState('7d');
  const { 
    showConfirmation, 
    tempDateRange,
    requestPresetChange,
    updateTempDate,
    requestDateRangeConfirmation,
    confirmDateChange, 
    cancelDateChange, 
    getConfirmationMessage,
    hasTempChanges
  } = useDateConfirmation(filters.dateRange.startDate, filters.dateRange.endDate);

  useEffect(() => {
    // Create filters with unified status values
    const processedFilters = {
      ...filters,
      status: getUnifiedStatusValues(filters.status),
    };
    
    onFiltersChange(processedFilters);
  }, [filters]); // Remove onFiltersChange from dependencies to prevent infinite loop

  const handleQuickDateRange = (range: string) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (range) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        return;
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get preset label for confirmation
    const presetLabels: Record<string, string> = {
      'today': 'วันนี้',
      'yesterday': 'เมื่อวาน',
      '7d': '7 วันที่ผ่านมา',
      '30d': '30 วันที่ผ่านมา',
      '90d': '90 วันที่ผ่านมา',
    };

    requestPresetChange({
      startDate: startDateStr,
      endDate: endDateStr,
      preset: presetLabels[range],
      callback: () => {
        setQuickDateRange(range);
        setFilters(prev => ({
          ...prev,
          dateRange: {
            startDate: startDateStr,
            endDate: endDateStr,
          },
        }));
      }
    });
  };



  const handleMultiSelect = (field: keyof FilterOptions, value: string) => {
    setFilters(prev => {
      const currentValues = prev[field] as string[];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      return {
        ...prev,
        [field]: newValues,
      };
    });
  };

  const clearFilters = () => {
    setFilters({
      dateRange: {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      },
      databases: [],
      gateways: [],
      sites: [],
      status: [],
      type: 'both',
      amountRange: {},
    });
    setQuickDateRange('7d');
  };

  const hasActiveFilters = () => {
    return (
      filters.databases.length > 0 ||
      filters.gateways.length > 0 ||
      filters.sites.length > 0 ||
      filters.status.length > 0 ||
      filters.type !== 'both' ||
      filters.amountRange.min !== undefined ||
      filters.amountRange.max !== undefined
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters & Controls</h3>
          {hasActiveFilters() && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {[
                filters.databases.length,
                filters.gateways.length,
                filters.sites.length,
                filters.status.length,
              ].reduce((sum, count) => sum + count, 0)} active
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            {showAdvanced ? 'Simple' : 'Advanced'}
          </button>
          
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick Date Range */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Quick Date Range</label>
        <div className="flex space-x-2">
          {[
            { value: 'today', label: 'วันนี้' },
            { value: 'yesterday', label: 'เมื่อวาน' },
            { value: '7d', label: '7 วันที่ผ่านมา' },
            { value: '30d', label: '30 วันที่ผ่านมา' },
            { value: '90d', label: '90 วันที่ผ่านมา' },
          ].map(option => (
            <button
              key={option.value}
              onClick={() => handleQuickDateRange(option.value)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                quickDateRange === option.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={tempDateRange.startDate}
              onChange={(e) => {
                updateTempDate('startDate', e.target.value);
                setQuickDateRange('');
              }}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={tempDateRange.endDate}
              onChange={(e) => {
                updateTempDate('endDate', e.target.value);
                setQuickDateRange('');
              }}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data Type</label>
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="both">Both</option>
            <option value="transactions">Transactions Only</option>
            <option value="withdrawals">Withdrawals Only</option>
          </select>
        </div>
      </div>

      {/* Apply Button */}
      {hasTempChanges() && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => {
              requestDateRangeConfirmation(() => {
                setFilters(prev => ({
                  ...prev,
                  dateRange: {
                    startDate: tempDateRange.startDate,
                    endDate: tempDateRange.endDate,
                  },
                }));
              });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Apply Date Range
          </button>
        </div>
      )}

      {/* Database Selection - Always visible for dashboard */}
      {showDatabasesAlways && availableOptions.databases.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Databases to Compare
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {availableOptions.databases.map(db => (
              <label key={db} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.databases.includes(db)}
                  onChange={() => handleMultiSelect('databases', db)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 truncate">{db}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Select databases to see comparison in the chart below
          </p>
        </div>
      )}

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="border-t pt-4 space-y-4">
          {/* Databases - Only show in advanced if not always visible */}
          {!showDatabasesAlways && availableOptions.databases.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Databases</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {availableOptions.databases.map(db => (
                  <label key={db} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.databases.includes(db)}
                      onChange={() => handleMultiSelect('databases', db)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 truncate">{db}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Sites */}
          {availableOptions.sites.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sites</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {availableOptions.sites.slice(0, 8).map(site => (
                  <label key={site} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.sites.includes(site)}
                      onChange={() => handleMultiSelect('sites', site)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 truncate">{site}</span>
                  </label>
                ))}
              </div>
              {availableOptions.sites.length > 8 && (
                <p className="text-xs text-gray-500 mt-1">
                  Showing first 8 of {availableOptions.sites.length} sites
                </p>
              )}
            </div>
          )}

          {/* Gateways */}
          {availableOptions.gateways.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gateways</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {availableOptions.gateways.slice(0, 8).map(gateway => (
                  <label key={gateway} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.gateways.includes(gateway)}
                      onChange={() => handleMultiSelect('gateways', gateway)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 truncate">{gateway}</span>
                  </label>
                ))}
              </div>
              {availableOptions.gateways.length > 8 && (
                <p className="text-xs text-gray-500 mt-1">
                  Showing first 8 of {availableOptions.gateways.length} gateways
                </p>
              )}
            </div>
          )}

          {/* Unified Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {statusLabels.map(statusLabel => (
                <label key={statusLabel} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.status.includes(statusLabel)}
                    onChange={() => handleMultiSelect('status', statusLabel)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{statusLabel}</span>
                  <span className="text-xs text-gray-500">
                    ({unifiedStatusMap[statusLabel as keyof typeof unifiedStatusMap]?.join(', ') || ''})
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Backend will map these to appropriate database values for both transactions and withdrawals
            </p>
          </div>

          {/* Amount Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount Range</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="number"
                  placeholder="Min amount"
                  value={filters.amountRange.min || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    amountRange: {
                      ...prev.amountRange,
                      min: e.target.value ? parseFloat(e.target.value) : undefined
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Max amount"
                  value={filters.amountRange.max || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    amountRange: {
                      ...prev.amountRange,
                      max: e.target.value ? parseFloat(e.target.value) : undefined
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center space-x-2">
          <button
            onClick={clearFilters}
            disabled={!hasActiveFilters()}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear All
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onExport(e.target.value as 'csv' | 'excel' | 'pdf');
                  e.target.value = '';
                }
              }}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Export...</option>
              <option value="csv">Export CSV</option>
              <option value="excel">Export Excel</option>
              <option value="pdf">Export PDF</option>
            </select>
            <Download className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmation}
        onClose={cancelDateChange}
        onConfirm={confirmDateChange}
        title="ยืนยันการเปลี่ยนแปลงช่วงเวลา"
        message={getConfirmationMessage()}
        confirmText="ยืนยัน"
        cancelText="ยกเลิก"
        type="info"
      />
    </div>
  );
}

