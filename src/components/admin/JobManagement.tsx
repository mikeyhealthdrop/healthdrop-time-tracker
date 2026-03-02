'use client';

import { useEffect, useState } from 'react';
import {
  getAllJobsForAdmin,
  createJob,
  updateJob,
  archiveJob,
  reactivateJob,
} from '@/app/actions/jobs';

interface Job {
  id: string;
  job_number: string;
  status: 'active' | 'archived';
  created_at: string;
  org_id: string;
}

interface JobManagementProps {
  orgId: string;
  userId: string;
}

export default function JobManagement({ orgId, userId }: JobManagementProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newJobNumber, setNewJobNumber] = useState('');
  const [addingJob, setAddingJob] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editJobNumber, setEditJobNumber] = useState('');
  const [editingJobError, setEditingJobError] = useState<string | null>(null);
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const [archivingJobId, setArchivingJobId] = useState<string | null>(null);
  const [reactivatingJobId, setReactivatingJobId] = useState<string | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAllJobsForAdmin(orgId);
        setJobs(data || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load jobs'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [orgId]);

  const handleAddJob = async () => {
    if (!newJobNumber.trim()) {
      setError('Job number cannot be empty');
      return;
    }

    try {
      setAddingJob(true);
      setError(null);
      const result = await createJob(orgId, newJobNumber.trim());
      if (result.error) {
        setError(result.error);
        return;
      }
      setJobs([...jobs, result.data as Job]);
      setNewJobNumber('');
      setShowAddForm(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create job'
      );
    } finally {
      setAddingJob(false);
    }
  };

  const handleEditJob = (job: Job) => {
    setEditingJobId(job.id);
    setEditJobNumber(job.job_number);
    setEditingJobError(null);
  };

  const handleSaveJob = async (jobId: string) => {
    if (!editJobNumber.trim()) {
      setEditingJobError('Job number cannot be empty');
      return;
    }

    try {
      setSavingJobId(jobId);
      setEditingJobError(null);
      const result = await updateJob(jobId, editJobNumber.trim());
      if (result.error) {
        setEditingJobError(result.error);
        return;
      }
      setJobs(
        jobs.map((job) =>
          job.id === jobId
            ? { ...job, job_number: editJobNumber.trim() }
            : job
        )
      );
      setEditingJobId(null);
      setEditJobNumber('');
    } catch (err) {
      setEditingJobError(
        err instanceof Error ? err.message : 'Failed to update job'
      );
    } finally {
      setSavingJobId(null);
    }
  };

  const handleArchiveJob = async (jobId: string) => {
    try {
      setArchivingJobId(jobId);
      setError(null);
      const result = await archiveJob(jobId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setJobs(
        jobs.map((job) =>
          job.id === jobId ? { ...job, status: 'archived' } : job
        )
      );
      setConfirmArchiveId(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to archive job'
      );
    } finally {
      setArchivingJobId(null);
    }
  };

  const handleReactivateJob = async (jobId: string) => {
    try {
      setReactivatingJobId(jobId);
      setError(null);
      const result = await reactivateJob(jobId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setJobs(
        jobs.map((job) =>
          job.id === jobId ? { ...job, status: 'active' } : job
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to reactivate job'
      );
    } finally {
      setReactivatingJobId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const displayJobs = showArchived ? jobs : jobs.filter((job) => job.status === 'active');

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-[10px] shadow-sm p-6">
        <div className="text-text-secondary text-[14px]">Loading jobs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-surface border border-border rounded-[10px] shadow-sm p-4">
          <div className="text-red-600 text-[14px]">{error}</div>
        </div>
      )}

      <div className="bg-surface border border-border rounded-[10px] shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[16px] font-semibold text-text-primary">Jobs</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3.5 py-2.5 bg-accent hover:bg-accent-hover text-white text-[14px] font-medium rounded-sm transition-colors"
          >
            Add Job
          </button>
        </div>

        {showAddForm && (
          <div className="mb-6 p-4 bg-surface border border-border rounded-sm space-y-3">
            <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide block">
              Job Number
            </label>
            <input
              type="text"
              value={newJobNumber}
              onChange={(e) => setNewJobNumber(e.target.value)}
              placeholder="Enter job number"
              className="w-full px-3.5 py-2.5 border border-border rounded-sm text-[14px] bg-surface text-text-primary placeholder-text-secondary"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddJob();
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddJob}
                disabled={addingJob}
                className="px-3.5 py-2.5 bg-green hover:bg-[#15803d] text-white text-[14px] font-medium rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingJob ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewJobNumber('');
                }}
                className="px-3.5 py-2.5 bg-surface border border-border text-text-primary text-[14px] font-medium rounded-sm hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="w-4 h-4 rounded border-border cursor-pointer"
            />
            <span className="text-[13px] text-text-secondary">Show archived jobs</span>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
                  Job Number
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
                  Created
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {displayJobs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 px-4 text-center text-text-secondary">
                    {showArchived ? 'No archived jobs' : 'No active jobs'}
                  </td>
                </tr>
              ) : (
                displayJobs.map((job) => (
                  <tr key={job.id} className="border-b border-border hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="py-3 px-4">
                      {editingJobId === job.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editJobNumber}
                            onChange={(e) => setEditJobNumber(e.target.value)}
                            className="px-3.5 py-2.5 border border-border rounded-sm text-[14px] bg-surface text-text-primary w-full"
                            autoFocus
                          />
                          {editingJobError && (
                            <div className="text-red-600 text-[12px] absolute -bottom-5">{editingJobError}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-text-primary font-medium">{job.job_number}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {job.status === 'active' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green/10 text-green">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-text-secondary/10 text-text-secondary">
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">{formatDate(job.created_at)}</td>
                    <td className="py-3 px-4">
                      {editingJobId === job.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveJob(job.id)}
                            disabled={savingJobId === job.id}
                            className="px-3.5 py-2.5 bg-green hover:bg-[#15803d] text-white text-[12px] font-medium rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {savingJobId === job.id ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingJobId(null);
                              setEditJobNumber('');
                              setEditingJobError(null);
                            }}
                            className="px-3.5 py-2.5 bg-surface border border-border text-text-primary text-[12px] font-medium rounded-sm hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : job.status === 'active' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditJob(job)}
                            className="px-3.5 py-2.5 bg-surface border border-border text-text-primary text-[12px] font-medium rounded-sm hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                          >
                            Edit
                          </button>
                          {confirmArchiveId === job.id ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleArchiveJob(job.id)}
                                disabled={archivingJobId === job.id}
                                className="px-3.5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[12px] font-medium rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {archivingJobId === job.id ? 'Archiving...' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => setConfirmArchiveId(null)}
                                className="px-3.5 py-2.5 bg-surface border border-border text-text-primary text-[12px] font-medium rounded-sm hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmArchiveId(job.id)}
                              className="px-3.5 py-2.5 bg-surface border border-border text-text-primary text-[12px] font-medium rounded-sm hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleReactivateJob(job.id)}
                          disabled={reactivatingJobId === job.id}
                          className="px-3.5 py-2.5 bg-accent hover:bg-accent-hover text-white text-[12px] font-medium rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {reactivatingJobId === job.id ? 'Reactivating...' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
