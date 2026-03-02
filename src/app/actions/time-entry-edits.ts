'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Get all time entries for an org within a date range (for admin editing)
 */
export async function getTimeEntriesForAdmin(
  orgId: string,
  startDate: string,
  endDate: string,
  employeeId?: string
) {
  const supabase = await createClient()

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
 * Update a time entry (admin only) with audit log
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
  const supabase = await createClient()

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
 * Delete a time entry (admin only) — with audit log
 */
export async function deleteTimeEntry(
  entryId: string,
  orgId: string,
  deletedBy: string,
  reason: string
) {
  const supabase = await createClient()

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
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('time_entry_edits')
    .select('*, editor:users!edited_by(first_name, last_name)')
    .eq('time_entry_id', entryId)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message, data: [] }
  return { data: data || [] }
}
