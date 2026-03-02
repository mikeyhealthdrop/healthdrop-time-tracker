'use client';

import { useState, useCallback, useMemo } from 'react';
import { getTimeEntriesForAdmin, editTimeEntry, deleteTimeEntry } from '@/app/actions/time-entry-edits';
import { formatCurrency } from '@/lib/utils';
import { ChevronDown, Trash2, Edit2, X, Check } from 'lucide-react';

interface TimeEntry {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  job_id: string;
  type: 'work' | 'lunch';
  created_at: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface Job {
  id: string;
  job_number: string;
}

interface TimeEntryEditorProps {
  orgId: string;
  userId: string;
  employees: Employee[];
  jobs: Job[];
}

export default function TimeEntryEditor({
  orgId,
  userId,
  employees,
  jobs,
}: TimeEntryEditorProps) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  const [startDate, setStartDate] = useState(weekStart.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    clock_in: string;
    clock_out: string;
    job_id: string;
    reason: string;
  }>({
    clock_in: '',
    clock_out: '',
    job_id: '',
    reason: '',
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTimeEntriesForAdmin({
        orgId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        employeeId: selectedEmployeeId || undefined,
      });

      if (result.success) {
        setEntries(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch time entries');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [orgId, startDate, endDate, selectedEmployeeId]);

  const getEmployeeName = useCallback(
    (userId: string) => {
      const employee = employees.find((e) => e.id === userId);
      return employee
        ? `${employee.first_name} ${employee.last_name}`
        : 'Unknown';
    },
    [employees]
  );

  const getJobNumber = useCallback(
    (jobId: string) => {
      const job = jobs.find((j) => j.id === jobId);
      return job ? job.job_number : 'Unknown';
    },
    [jobs]
  );

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`;
  };

  const calculateDuration = (clockIn: string, clockOut: string | null) => {
    if (!clockOut) return '';

    const inTime = new Date(clockIn).getTime();
    const outTime = new Date(clockOut).getTime();
    const diffMs = outTime - inTime;
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
  };

  const handleEditClick = (entry: TimeEntry) => {
    setEditingId(entry.id);
    setEditFormData({
      clock_in: new Date(entry.clock_in).toISOString().slice(0, 16),
      clock_out: entry.clock_out
        ? new Date(entry.clock_out).toISOString().slice(0, 16)
        : '',
      job_id: entry.job_id,
      reason: '',
    });
    setActionError(null);
  };

  const handleEditSave = async (entryId: string) => {
    if (!editFormData.reason.trim()) {
      setActionError('Reason is required');
      return;
    }

    setActionLoading(true);
    try {
      const result = await editTimeEntry({
        entryId,
        clockIn: new Date(editFormData.clock_in).toISOString(),
        clockOut: editFormData.clock_out
          ? new Date(editFormData.clock_out).toISOString()
          : null,
        jobId: editFormData.job_id,
        reason: editFormData.reason,
      });

      if (result.success) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entryId
              ? {
                  ...e,
                  clock_in: new Date(editFormData.clock_in).toISOString(),
                  clock_out: editFormData.clock_out
                    ? new Date(editFormData.clock_out).toISOString()
                    : null,
                  job_id: editFormData.job_id,
                }
              : e
          )
        );
        setEditingId(null);
        setEditFormData({
          clock_in: '',
          clock_out: '',
          job_id: '',
          reason: '',
        });
      } else {
        setActionError(result.error || 'Failed to update entry');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async (entryId: string) => {
    if (!deleteReason.trim()) {
      setActionError('Reason is required');
      return;
    }

    setActionLoading(true);
    try {
      const result = await deleteTimeEntry({
        entryId,
        reason: deleteReason,
      });

      if (result.success) {
        setEntries((prev) => prev.filter((e) => e.id !== entryId));
        setDeletingId(null);
        setDeleteReason('');
      } else {
        setActionError(result.error || 'Failed to delete entry');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const isInitialLoad = entries.length === 0 && !loading;

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-border rounded-[10px] p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-border rounded-sm text-[14px]"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1.5">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-border rounded-sm text-[14px]"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1.5">
              Employee
            </label>
            <div className="relative">
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-sm text-[14px] appearance-none pr-9"
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover text-white px-3.5 py-2.5 rounded-sm text-[14px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-[10px] p-4 text-red-800 text-[13px]">
          {error}
        </div>
      )}

      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-[10px] p-4 text-red-800 text-[13px]">
          {actionError}
        </div>
      )}

      {isInitialLoad && (
        <div className="bg-surface border border-border rounded-[10px] p-8 text-center">
          <p className="text-text-secondary text-[13px]">
            Select filters and click Search to view time entries
          </p>
        </div>
      )}

      {!isInitialLoad && (
        <div className="bg-surface border border-border rounded-[10px] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="bg-surface-alt text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border text-left">
                    Date
                  </th>
                  <th className="bg-surface-alt text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border text-left">
                    Employee
                  </th>
                  <th className="bg-surface-alt text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border text-left">
                    Job
                  </th>
                  <th className="bg-surface-alt text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border text-left">
                    Type
                  </th>
                  <th className="bg-surface-alt text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border text-left">
                    Clock In
                  </th>
                  <th className="bg-surface-alt text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border text-left">
                    Clock Out
                  </th>
                  <th className="bg-surface-alt text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border text-left">
                    Duration
                  </th>
                  <th className="bg-surface-alt text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border text-left">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    {editingId === entry.id ? (
                      <>
                        <td colSpan={8} className="px-4 py-3 border-b border-border-light">
                          <div className="space-y-3 bg-surface-alt p-4 rounded-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[13px] font-medium text-text-primary mb-1">
                                  Clock In
                                </label>
                                <input
                                  type="datetime-local"
                                  value={editFormData.clock_in}
                                  onChange={(e) =>
                                    setEditFormData({
                                      ...editFormData,
                                      clock_in: e.target.value,
                                    })
                                  }
                                  className="w-full px-3.5 py-2.5 border border-border rounded-sm text-[14px]"
                                />
                              </div>
                              <div>
                                <label className="block text-[13px] font-medium text-text-primary mb-1">
                                  Clock Out
                                </label>
                                <input
                                  type="datetime-local"
                                  value={editFormData.clock_out}
                                  onChange={(e) =>
                                    setEditFormData({
                                      ...editFormData,
                                      clock_out: e.target.value,
                                    })
                                  }
                                  className="w-full px-3.5 py-2.5 border border-border rounded-sm text-[14px]"
                                />
                              </div>
                              <div>
                                <label className="block text-[13px] font-medium text-text-primary mb-1">
                                  Job
                                </label>
                                <div className="relative">
                                  <select
                                    value={editFormData.job_id}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        job_id: e.target.value,
                                      })
                                    }
                                    className="w-full px-3.5 py-2.5 border border-border rounded-sm text-[14px] appearance-none pr-9"
                                  >
                                    {jobs.map((job) => (
                                      <option key={job.id} value={job.id}>
                                        {job.job_number}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[13px] font-medium text-text-primary mb-1">
                                  Reason
                                </label>
                                <input
                                  type="text"
                                  placeholder="Why was this edited?"
                                  value={editFormData.reason}
                                  onChange={(e) =>
                                    setEditFormData({
                                      ...editFormData,
                                      reason: e.target.value,
                                    })
                                  }
                                  className="w-full px-3.5 py-2.5 border border-border rounded-sm text-[14px]"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  setActionError(null);
                                }}
                                disabled={actionLoading}
                                className="px-3 py-1.5 border border-border rounded-sm text-[13px] font-medium text-text-primary hover:bg-surface-alt disabled:opacity-50"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleEditSave(entry.id)}
                                disabled={actionLoading}
                                className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-sm text-[13px] font-medium disabled:opacity-50"
                              >
                                {actionLoading ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </>
                    ) : deletingId === entry.id ? (
                      <>
                        <td colSpan={8} className="px-4 py-3 border-b border-border-light">
                          <div className="space-y-3 bg-red-50 p-4 rounded-sm border border-red-200">
                            <p className="text-[13px] font-medium text-red-900">
                              Confirm deletion of this time entry?
                            </p>
                            <div>
                              <label className="block text-[13px] font-medium text-red-900 mb-1">
                                Reason for deletion
                              </label>
                              <input
                                type="text"
                                placeholder="Why is this being deleted?"
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-red-300 rounded-sm text-[14px] bg-white"
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => {
                                  setDeletingId(null);
                                  setDeleteReason('');
                                  setActionError(null);
                                }}
                                disabled={actionLoading}
                                className="px-3 py-1.5 border border-red-300 rounded-sm text-[13px] font-medium text-red-900 hover:bg-red-100 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleDeleteConfirm(entry.id)}
                                disabled={actionLoading}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-sm text-[13px] font-medium disabled:opacity-50"
                              >
                                {actionLoading ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 border-b border-border-light text-[13px]">
                          {formatTime(entry.clock_in).split(' ').slice(0, 1)[0]}
                        </td>
                        <td className="px-4 py-3 border-b border-border-light text-[13px]">
                          {getEmployeeName(entry.user_id)}
                        </td>
                        <td className="px-4 py-3 border-b border-border-light text-[13px]">
                          {getJobNumber(entry.job_id)}
                        </td>
                        <td className="px-4 py-3 border-b border-border-light text-[13px]">
                          {entry.type === 'lunch' ? (
                            <span className="text-orange-600 font-medium">Lunch</span>
                          ) : (
                            <span>Work</span>
                          )}
                        </td>
                        <td className="px-4 py-3 border-b border-border-light text-[13px]">
                          {formatTime(entry.clock_in)}
                        </td>
                        <td className="px-4 py-3 border-b border-border-light text-[13px]">
                          {entry.clock_out ? (
                            formatTime(entry.clock_out)
                          ) : (
                            <span className="text-green-600 font-medium">(active)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 border-b border-border-light text-[13px]">
                          {calculateDuration(entry.clock_in, entry.clock_out)}
                        </td>
                        <td className="px-4 py-3 border-b border-border-light text-[13px]">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditClick(entry)}
                              className="p-1.5 text-text-secondary hover:text-accent transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingId(entry.id)}
                              className="p-1.5 text-text-secondary hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {entries.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-text-secondary text-[13px]">
                No time entries found for the selected filters
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
