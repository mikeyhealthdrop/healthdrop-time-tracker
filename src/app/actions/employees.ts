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
 * Creates auth user via service client, then the trigger creates the profile.
 * We then update the profile with the additional fields.
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

  // Create the user profile first (without auth_id — they'll sign up later)
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
