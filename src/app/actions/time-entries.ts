'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Clock in: create a new work time entry for the given job
 */
export async function clockIn(userId: string, orgId: string, jobId: string) {
  const supabase = await createClient()

  // Check if user already has an active entry (no clock_out)
  const { data: activeEntry } = await supabase
    .from('time_entries')
    .select('id')
    .eq('user_id', userId)
    .is('clock_out', null)
    .single()

  if (activeEntry) {
    return { error: 'You are already clocked in. Clock out first.' }
  }

  const { error } = await supabase
    .from('time_entries')
    .insert({
      org_id: orgId,
      user_id: userId,
      job_id: jobId,
      clock_in: new Date().toISOString(),
      entry_type: 'work',
    })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Clock out: close all active entries for the user
 */
export async function clockOut(userId: string) {
  const supabase = await createClient()
  const now = new Date().toISOString()

  // Close any active work or lunch entry
  const { error } = await supabase
    .from('time_entries')
    .update({ clock_out: now })
    .eq('user_id', userId)
    .is('clock_out', null)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Switch job: close current work entry and start a new one on a different job
 */
export async function switchJob(userId: string, orgId: string, newJobId: string) {
  const supabase = await createClient()
  const now = new Date().toISOString()

  // Close current active work entry
  const { error: closeError } = await supabase
    .from('time_entries')
    .update({ clock_out: now })
    .eq('user_id', userId)
    .eq('entry_type', 'work')
    .is('clock_out', null)

  if (closeError) return { error: closeError.message }

  // Also close any active lunch entry
  await supabase
    .from('time_entries')
    .update({ clock_out: now })
    .eq('user_id', userId)
    .eq('entry_type', 'lunch')
    .is('clock_out', null)

  // Start new work entry
  const { error: openError } = await supabase
    .from('time_entries')
    .insert({
      org_id: orgId,
      user_id: userId,
      job_id: newJobId,
      clock_in: now,
      entry_type: 'work',
    })

  if (openError) return { error: openError.message }

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Start lunch: close current work entry and start a lunch entry
 */
export async function startLunch(userId: string, orgId: string) {
  const supabase = await createClient()
  const now = new Date().toISOString()

  // Close current active work entry
  const { error: closeError } = await supabase
    .from('time_entries')
    .update({ clock_out: now })
    .eq('user_id', userId)
    .eq('entry_type', 'work')
    .is('clock_out', null)

  if (closeError) return { error: closeError.message }

  // Start lunch entry (no job_id)
  const { error: openError } = await supabase
    .from('time_entries')
    .insert({
      org_id: orgId,
      user_id: userId,
      job_id: null,
      clock_in: now,
      entry_type: 'lunch',
    })

  if (openError) return { error: openError.message }

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * End lunch: close lunch entry and resume work on the last job
 */
export async function endLunch(userId: string, orgId: string) {
  const supabase = await createClient()
  const now = new Date().toISOString()

  // Find the last work entry before lunch to get the job
  const { data: lastWorkEntry } = await supabase
    .from('time_entries')
    .select('job_id')
    .eq('user_id', userId)
    .eq('entry_type', 'work')
    .not('clock_out', 'is', null)
    .order('clock_out', { ascending: false })
    .limit(1)
    .single()

  // Close active lunch entry
  const { error: closeError } = await supabase
    .from('time_entries')
    .update({ clock_out: now })
    .eq('user_id', userId)
    .eq('entry_type', 'lunch')
    .is('clock_out', null)

  if (closeError) return { error: closeError.message }

  // Resume work on the last job
  if (!lastWorkEntry?.job_id) {
    // No previous work entry found — user needs to clock in fresh with a job
    revalidatePath('/dashboard')
    return { success: true, message: 'Lunch ended. Please clock in with a job to resume work.' }
  }

  const { error: openError } = await supabase
    .from('time_entries')
    .insert({
      org_id: orgId,
      user_id: userId,
      job_id: lastWorkEntry.job_id,
      clock_in: now,
      entry_type: 'work',
    })

  if (openError) return { error: openError.message }

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Get all time entries for a user for today
 */
export async function getTodayEntries(userId: string) {
  const supabase = await createClient()

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('time_entries')
    .select('*, job:jobs(job_number)')
    .eq('user_id', userId)
    .gte('clock_in', startOfDay.toISOString())
    .order('clock_in', { ascending: true })

  if (error) return { error: error.message, data: [] }
  return { data: data || [] }
}

/**
 * Get the current active time entry for a user (if any)
 */
export async function getActiveEntry(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('time_entries')
    .select('*, job:jobs(job_number)')
    .eq('user_id', userId)
    .is('clock_out', null)
    .single()

  if (error && error.code !== 'PGRST116') {
    return { error: error.message, data: null }
  }

  return { data: data || null }
}
