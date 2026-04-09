'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Get all employees in the organization
 */
export async function getEmployees(orgId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('org_id', orgId)
    .order('last_name', { ascending: true })

  if (error) return { error: error.message, data: [] }
  return { data: data || [] }
}

/**
 * Create a new employee profile (admin only)
 * First inserts the profile row (without auth_id), then invites via Supabase Auth.
 * The database trigger (handle_new_user) automatically links the auth_id
 * to the pre-created profile row when the auth user is created.
 */
export async function createEmployee(
  orgId: string,
  data: {
    email: string
    firstName: string
    lastName: string
    role: 'admin' | 'manager' | 'employee'
    employeeType: 'w2' | 'agency' | 'contractor_1099'
    baseRate: number
    loadedRate: number
  }
) {
  const supabase = await createClient()

  // Check if email already exists in this org
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('org_id', orgId)
    .eq('email', data.email)
    .maybeSingle()

  if (existing) {
    return { error: 'An employee with this email already exists.' }
  }

  // Create the user profile first (without auth_id)
  // The database trigger will link auth_id when the invite is accepted
  const { error } = await supabase
    .from('users')
    .insert({
      org_id: orgId,
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      role: data.role,
      employee_type: data.employeeType,
      base_rate: data.baseRate,
      loaded_rate: data.loadedRate,
    })

  if (error) return { error: error.message }

  // Now invite the user via Supabase Auth
  // This creates an auth account and sends them an email to set their password
  // The handle_new_user trigger will automatically link the auth_id to the profile above
  const serviceClient = await createServiceClient()
  const { error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://jobclockin.com'}/auth/callback?type=recovery`,
    data: {
      first_name: data.firstName,
      last_name: data.lastName,
    }
  })

  if (inviteError) {
    // Profile was created but invite failed - still return success since profile exists
    // Admin can use the "Send Reset" button to retry the invite later
    console.error('Invite email failed:', inviteError.message)
  }

  revalidatePath('/dashboard/employees')
  return { success: true }
}

/**
 * Update an employee profile (admin only)
 */
export async function updateEmployee(
  employeeId: string,
  orgId: string,
  data: {
    firstName: string
    lastName: string
    role: 'admin' | 'manager' | 'employee'
    employeeType: 'w2' | 'agency' | 'contractor_1099'
    baseRate: number
    loadedRate: number
    isActive: boolean
  }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('users')
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      role: data.role,
      employee_type: data.employeeType,
      base_rate: data.baseRate,
      loaded_rate: data.loadedRate,
      is_active: data.isActive,
    })
    .eq('id', employeeId)
    .eq('org_id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/employees')
  return { success: true }
}

/**
 * Deactivate an employee (soft delete)
 */
export async function deactivateEmployee(employeeId: string, orgId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', employeeId)
    .eq('org_id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/employees')
  return { success: true }
}

/**
 * Reactivate an employee
 */
export async function reactivateEmployee(employeeId: string, orgId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('users')
    .update({ is_active: true })
    .eq('id', employeeId)
    .eq('org_id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/employees')
  return { success: true }
}
