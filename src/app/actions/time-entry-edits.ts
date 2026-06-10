'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Verify that the current user has admin or manager role
 */
async function verifyAdminOrManager() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, profile: null }

  const { data: profile } = await supabase
    .from('users')
    .select('id, role, org_id')
    .eq('auth_id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) return { supabase, profile: null }
  return { supabase, profile }
}

/**
 * Get all time entries for an org within a date range (for admin/manager editing)
 */
export async function getTimeEntriesForAdmin(
  orgId: string,
  startDate: string,
  endDate: string,
  employeeId?: string
) {
  const { supabase, profile } = await verifyAdminOrManager()
  if (!profile) return { error: 'Unauthorized', data: [] }

  let query = supabase
    .from('time_entries')
    .select('*, user:users(first_name, last_name, email), job:jobs(job_number)')
    .eq('org_id', orgId)
    .gte('clock_in', startDate)
    .lte('clock_in', endDate)
    .order('clock_in', { ascending: false })

  if (employeeId) {
    query = query.eq('user_id', employeeId)
  }

  const { data, error } = await query

  if (error) return { error: error.message, data: [] }
  return { data: data || [] }
}

/**
 * Add a new time entry manually (admin or manager)
 */
export async function addTimeEntry(
  orgId: string,
  addedBy: string,
  entry: {
    userId: string
    clockIn: string
    clockOut: string | null
    jobId: string | null
    entryType: 'work' | 'lunch'
  }
) {
  const { supabase, profile } = await verifyAdminOrManager()
  if (!profile) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      org_id: orgId,
      user_id: entry.userId,
      clock_in: entry.clockIn,
      clock_out: entry.clockOut,
      job_id: entry.jobId,
      entry_type: entry.entryType,
    })
    .select('*, user:users(first_name, last_name, email), job:jobs(job_number)')
    .single()

  if (error) return { error: error.message }

  // Create audit log for the manual addition
  await supabase
    .from('time_entry_edits')
    .insert({
      time_entry_id: data.id,
      edited_by: addedBy,
      old_values: {},
      new_values: {
        clock_in: entry.clockIn,
        clock_out: entry.clockOut,
        job_id: entry.jobId,
        user_id: entry.userId,
        entry_type: entry.entryType,
      },
      reason: 'Manually added time entry',
    })

  revalidatePath('/dashboard/time-entries')
  return { success: true, data }
}

/**
 * Update a time entry (admin or manager) with audit log
 */
export async function editTimeEntry(
  entryId: string,
  orgId: string,
  editedBy: string,
  reason: string,
  updates: {
    clockIn?: string
    clockOut?: string | null
    jobId?: string | null
  }
) {
  const { supabase, profile } = await verifyAdminOrManager()
  if (!profile) return { error: 'Unauthorized' }

  // Get current values first
  const { data: current, error: fetchError } = await supabase
    .from('time_entries')
    .select('*')
    .eq('id', entryId)
    .eq('org_id', orgId)
    .single()

  if (fetchError || !current) return { error: 'Time entry not found' }

  // Build update object and old values
  const oldValues: Record<string, unknown> = {}
  const newValues: Record<string, unknown> = {}
  const updateObj: Record<string, unknown> = {}

  if (updates.clockIn !== undefined && updates.clockIn !== current.clock_in) {
    oldValues.clock_in = current.clock_in
    newValues.clock_in = updates.clockIn
    updateObj.clock_in = updates.clockIn
  }

  if (updates.clockOut !== undefined && updates.clockOut !== current.clock_out) {
    oldValues.clock_out = current.clock_out
    newValues.clock_out = updates.clockOut
    updateObj.clock_out = updates.clockOut
  }

  if (updates.jobId !== undefined && updates.jobId !== current.job_id) {
    oldValues.job_id = current.job_id
    newValues.job_id = updates.jobId
    updateObj.job_id = updates.jobId
  }

  if (Object.keys(updateObj).length === 0) {
    return { error: 'No changes to save' }
  }

  // Update the time entry
  const { error: updateError } = await supabase
    .from('time_entries')
    .update(updateObj)
    .eq('id', entryId)
    .eq('org_id', orgId)

  if (updateError) return { error: updateError.message }

  // Create audit log entry
  const { error: auditError } = await supabase
    .from('time_entry_edits')
    .insert({
      time_entry_id: entryId,
      edited_by: editedBy,
      old_values: oldValues,
      new_values: newValues,
      reason: reason,
    })

  if (auditError) {
    // Don't fail the whole operation, just log
    console.error('Failed to create audit log:', auditError)
  }

  revalidatePath('/dashboard/time-entries')
  return { success: true }
}

/**
 * Delete a time entry (admin or manager) — with audit log
 */
export async function deleteTimeEntry(
  entryId: string,
  orgId: string,
  deletedBy: string,
  reason: string
) {
  const { supabase, profile } = await verifyAdminOrManager()
  if (!profile) return { error: 'Unauthorized' }

  // Get current values for audit
  const { data: current, error: fetchError } = await supabase
    .from('time_entries')
    .select('*')
    .eq('id', entryId)
    .eq('org_id', orgId)
    .single()

  if (fetchError || !current) return { error: 'Time entry not found' }

  // Create audit log before deleting
  await supabase
    .from('time_entry_edits')
    .insert({
      time_entry_id: entryId,
      edited_by: deletedBy,
      old_values: current,
      new_values: { deleted: true },
      reason: `DELETED: ${reason}`,
    })

  // Delete the entry
  const { error: deleteError } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', entryId)
    .eq('org_id', orgId)

  if (deleteError) return { error: deleteError.message }

  revalidatePath('/dashboard/time-entries')
  return { success: true }
}

/**
 * Get edit history for a time entry
 */
export async function getTimeEntryEdits(entryId: string) {
  const { supabase, profile } = await verifyAdminOrManager()
  if (!profile) return { error: 'Unauthorized', data: [] }

  const { data, error } = await supabase
    .from('time_entry_edits')
    .select('*, editor:users!edited_by(first_name, last_name)')
    .eq('time_entry_id', entryId)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message, data: [] }
  return { data: data || [] }
}
