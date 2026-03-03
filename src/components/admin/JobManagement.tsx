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
  is_active: boolean;
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

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getAllJobsForAdmin(orgId);
      if (result.error) {
        setError(result.error);
      } else {
        setJobs(result.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      const result = await createJob(orgId, newJobNumber.trim(), userId);
      if (result.error) {
        setError(result.error);
        return;
      }
      await fetchJobs();
      setNewJobNumber('');
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
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
      const result = await updateJob(jobId, orgId, editJobNumber.trim());
      if (result.error) {
        setEditingJobError(result.error);
        return;
      }
      setJobs(jobs.map((job) => job.id === jobId ? { ...job, job_number: editJobNumber.trim() } : job));
      setEditingJobId(null);
      setEditJobNumber('');
    } catch (err) {
      setEditingJobError(err instanceof Error ? err.message : 'Failed to update job');
    } finally {
      setSavingJobId(null);
    }
  };

  const handleArchiveJob = async (jobId: string) => {
    try {
      setArchivingJobId(jobId);
      setError(null);
      const result = await archiveJob(jobId, orgId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setJobs(jobs.map((job) => job.id === jobId ? { ...job, is_active: false } : job));
      setConfirmArchiveId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive job');
    } finally {
      setArchivingJobId(null);
    }
  };

  const handleReactivateJob = async (jobId: string) => {
    try {
      setReactivatingJobId(jobId);
      setError(null);
      const result = await reactivateJob(jobId, orgId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setJobs(jobs.map((job) => job.id === jobId ? { ...job, is_active: true } : job));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate job');
    } finally {
      setReactivatingJobId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const displayJobs = showArchived ? jobs : jobs.filter((job) => job.is_active);

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
        <div className="bg-surface border border-red-200 rounded-[10px] shadow-sm p-4">
          <div className="text-red-600 text-[14px]">{error}</div>
        </div>
      )}

      <div className="bg-surface border border-border rounded-[10px] shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[16px] font-semibold text-text-primary">Jobs</h2>
          <button onClick={() => setShowAddForm(!showAddForm)} className="px-3.5 py-2.5 bg-accent hover:bg-accent-hover text-white text-[14px] font-medium rounded-sm transition-colors">
            Add Job
          </button>
        </div>

        {showAddForm && (
          <div className="mb-6 p-4 bg-gray-50 border border-border rounded-sm space-y-3">
            <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide block">Job Number</label>
            <input type="text" value={newJobNumber} onChange={(e) => setNewJobNumber(e.target.value)} placeholder="Enter job number" className="w-full px-3.5 py-2.5 border border-border rounded-sm text-[14px]" onKeyDown={(e) => { if (e.key === 'Enter') handleAddJob(); }} />
            <div className="flex gap-2">
              <button onClick={handleAddJob} disabled={addingJob} className="px-3.5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-[14px] font-medium rounded-sm transition-colors disabled:opacity-50">{addingJob ? 'Creating...' : 'Create'}</button>
              <button onClick={() => { setShowAddForm(false); setNewJobNumber(''); }} className="px-3.5 py-2.5 border border-border text-text-primary text-[14px] font-medium rounded-sm hover:bg-gray-100 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        <div className="space-y-2 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="w-4 h-4 rounded border-border cursor-pointer" />
            <span className="text-[13px] text-text-secondary">Show archived jobs</span>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Job Number</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Created</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayJobs.length === 0 ? (
                <tr><td colSpan={4} className="py-8 px-4 text-center text-text-secondary">{showArchived ? 'No jobs found' : 'No active jobs'}</td></tr>
              ) : (
                displayJobs.map((job) => (
                  <tr key={job.id} className="border-b border-border hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      {editingJobId === job.id ? (
                        <div>
                          <input type="text" value={editJobNumber} onChange={(e) => setEditJobNumber(e.target.value)} className="px-3.5 py-2.5 border border-border rounded-sm text-[14px] w-full" autoFocus />
                          {editingJobError && <div className="text-red-600 text-[12px] mt-1">{editingJobError}</div>}
                        </div>
                      ) : (
                        <span className="text-text-primary font-medium">{job.job_number}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {job.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">Active</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600">Archived</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">{formatDate(job.created_at)}</td>
                    <td className="py-3 px-4">
                      {editingJobId === job.id ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleSaveJob(job.id)} disabled={savingJobId === job.id} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[12px] font-medium rounded-sm disabled:opacity-50">{savingJobId === job.id ? 'Saving...' : 'Save'}</button>
                          <button onClick={() => { setEditingJobId(null); setEditJobNumber(''); setEditingJobError(null); }} className="px-3 py-1.5 border border-border text-text-primary text-[12px] font-medium rounded-sm hover:bg-gray-100">Cancel</button>
                        </div>
                      ) : job.is_active ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEditJob(job)} className="text-[12px] font-medium text-accent hover:text-accent-hover transition-colors">Edit</button>
                          {confirmArchiveId === job.id ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleArchiveJob(job.id)} disabled={archivingJobId === job.id} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[12px] font-medium rounded-sm disabled:opacity-50">{archivingJobId === job.id ? 'Archiving...' : 'Confirm'}</button>
                              <button onClick={() => setConfirmArchiveId(null)} className="text-[12px] font-medium text-text-secondary hover:text-text-primary">Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmArchiveId(job.id)} className="text-[12px] font-medium text-red-600 hover:text-red-800 transition-colors">Archive</button>
                          )}
                        </div>
                      ) : (
                        <button onClick={() => handleReactivateJob(job.id)} disabled={reactivatingJobId === job.id} className="text-[12px] font-medium text-accent hover:text-accent-hover transition-colors disabled:opacity-50">{reactivatingJobId === job.id ? 'Reactivating...' : 'Reactivate'}</button>
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
