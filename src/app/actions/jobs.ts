'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Get all active jobs for an organization (for the employee dropdown)
 */
export async function getActiveJobs(orgId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('job_number', { ascending: false })

  if (error) return { error: error.message, data: [] }
  return { data: data || [] }
}

/**
 * Get all jobs (active and archived) for admin management
 */
export async function getAllJobsForAdmin(orgId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message, data: [] }
  return { data: data || [] }
}

/**
 * Create a new job
 */
export async function createJob(orgId: string, jobNumber: string, createdBy: string) {
  const supabase = await createClient()

  // Check for duplicate job number
  const { data: existing } = await supabase
    .from('jobs')
    .select('id')
    .eq('org_id', orgId)
    .eq('job_number', jobNumber.trim())
    .maybeSingle()

  if (existing) {
    return { error: 'A job with this number already exists.' }
  }

  const { error } = await supabase
    .from('jobs')
    .insert({
      org_id: orgId,
      job_number: jobNumber.trim(),
      created_by: createdBy,
      is_active: true,
    })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/jobs')
  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Update a job number
 */
export async function updateJob(jobId: string, orgId: string, jobNumber: string) {
  const supabase = await createClient()

  // Check for duplicate
  const { data: existing } = await supabase
    .from('jobs')
    .select('id')
    .eq('org_id', orgId)
    .eq('job_number', jobNumber.trim())
    .neq('id', jobId)
    .maybeSingle()

  if (existing) {
    return { error: 'A different job with this number already exists.' }
  }

  const { error } = await supabase
    .from('jobs')
    .update({ job_number: jobNumber.trim() })
    .eq('id', jobId)
    .eq('org_id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/jobs')
  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Archive a job (soft deactivate — hides from employee dropdown but keeps data)
 */
export async function archiveJob(jobId: string, orgId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('jobs')
    .update({ is_active: false })
    .eq('id', jobId)
    .eq('org_id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/jobs')
  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Reactivate an archived job
 */
export async function reactivateJob(jobId: string, orgId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('jobs')
    .update({ is_active: true })
    .eq('id', jobId)
    .eq('org_id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/jobs')
  revalidatePath('/dashboard')
  return { success: true }
}
