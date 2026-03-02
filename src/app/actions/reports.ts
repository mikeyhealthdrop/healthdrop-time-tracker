'use server'

import { createClient } from '@/lib/supabase/server'

export interface JobReportEntry {
  date: string
  employeeName: string
  employeeType: string
  clockIn: string
  clockOut: string
  totalHours: number
  loadedRate: number
  totalCost: number
}

export interface JobReportSummary {
  totalLaborCost: number
  totalHours: number
  employeeCount: number
  dayCount: number
}

export interface EmployeeBreakdown {
  name: string
  employeeType: string
  hours: number
  daysWorked: number
  loadedRate: number
  totalCost: number
}

export interface DayBreakdown {
  date: string
  employeeCount: number
  hours: number
  cost: number
}

export interface JobCostReportData {
  jobNumber: string
  summary: JobReportSummary
  entries: JobReportEntry[]
  byEmployee: EmployeeBreakdown[]
  byDay: DayBreakdown[]
}

/**
 * Get all jobs for the organization (for the report dropdown)
 */
export async function getAllJobs(orgId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('org_id', orgId)
    .order('job_number', { ascending: false })

  if (error) return { error: error.message, data: [] }
  return { data: data || [] }
}

/**
 * Generate a full job cost report for a specific job
 * Now supports optional date range filtering
 */
export async function generateJobCostReport(
  jobId: string,
  orgId: string,
  startDate?: string,
  endDate?: string
): Promise<{ data?: JobCostReportData; error?: string }> {
  const supabase = await createClient()

  // Get job info
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .eq('org_id', orgId)
    .single()

  if (jobError || !job) return { error: 'Job not found' }

  // Build query for work time entries
  let query = supabase
    .from('time_entries')
    .select('*, user:users(first_name, last_name, employee_type, loaded_rate)')
    .eq('job_id', jobId)
    .eq('org_id', orgId)
    .eq('entry_type', 'work')
    .not('clock_out', 'is', null)
    .order('clock_in', { ascending: true })

  // Apply date range filter if provided
  if (startDate) {
    query = query.gte('clock_in', startDate)
  }
  if (endDate) {
    const endDateObj = new Date(endDate)
    endDateObj.setDate(endDateObj.getDate() + 1)
    query = query.lt('clock_in', endDateObj.toISOString())
  }

  const { data: entries, error: entriesError } = await query

  if (entriesError) return { error: entriesError.message }
  if (!entries || entries.length === 0) {
    return {
      data: {
        jobNumber: job.job_number,
        summary: { totalLaborCost: 0, totalHours: 0, employeeCount: 0, dayCount: 0 },
        entries: [],
        byEmployee: [],
        byDay: [],
      }
    }
  }

  // Build detailed entries
  const reportEntries: JobReportEntry[] = entries.map((entry) => {
    const clockIn = new Date(entry.clock_in)
    const clockOut = new Date(entry.clock_out)
    const hours = (clockOut.getTime() - clockIn.getTime()) / 1000 / 3600
    const loadedRate = entry.user?.loaded_rate || 0
    const cost = hours * loadedRate

    return {
      date: clockIn.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      employeeName: `${entry.user?.first_name || ''} ${entry.user?.last_name || ''}`.trim(),
      employeeType: entry.user?.employee_type || 'w2',
      clockIn: clockIn.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      clockOut: clockOut.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      totalHours: Math.round(hours * 100) / 100,
      loadedRate,
      totalCost: Math.round(cost * 100) / 100,
    }
  })

  // Summary
  const totalHours = reportEntries.reduce((sum, e) => sum + e.totalHours, 0)
  const totalLaborCost = reportEntries.reduce((sum, e) => sum + e.totalCost, 0)
  const uniqueEmployees = new Set(reportEntries.map((e) => e.employeeName))
  const uniqueDays = new Set(reportEntries.map((e) => e.date))

  const summary: JobReportSummary = {
    totalLaborCost: Math.round(totalLaborCost * 100) / 100,
    totalHours: Math.round(totalHours * 100) / 100,
    employeeCount: uniqueEmployees.size,
    dayCount: uniqueDays.size,
  }

  // Breakdown by employee
  const empMap = new Map<string, { hours: number; totalCost: number; loadedRate: number; employeeType: string; days: Set<string> }>()
  reportEntries.forEach((e) => {
    const existing = empMap.get(e.employeeName)
    if (existing) {
      existing.hours += e.totalHours
      existing.totalCost += e.totalCost
      existing.days.add(e.date)
    } else {
      empMap.set(e.employeeName, {
        employeeType: e.employeeType,
        hours: e.totalHours,
        loadedRate: e.loadedRate,
        totalCost: e.totalCost,
        days: new Set([e.date]),
      })
    }
  })

  const byEmployee: EmployeeBreakdown[] = Array.from(empMap.entries()).map(([name, data]) => ({
    name,
    employeeType: data.employeeType,
    hours: Math.round(data.hours * 100) / 100,
    daysWorked: data.days.size,
    loadedRate: data.loadedRate,
    totalCost: Math.round(data.totalCost * 100) / 100,
  }))

  // Breakdown by day
  const dayMap = new Map<string, { employees: Set<string>; hours: number; cost: number }>()
  reportEntries.forEach((e) => {
    const existing = dayMap.get(e.date)
    if (existing) {
      existing.employees.add(e.employeeName)
      existing.hours += e.totalHours
      existing.cost += e.totalCost
    } else {
      dayMap.set(e.date, {
        employees: new Set([e.employeeName]),
        hours: e.totalHours,
        cost: e.totalCost,
      })
    }
  })

  const byDay: DayBreakdown[] = Array.from(dayMap.entries()).map(([date, data]) => ({
    date,
    employeeCount: data.employees.size,
    hours: Math.round(data.hours * 100) / 100,
    cost: Math.round(data.cost * 100) / 100,
  }))

  return {
    data: {
      jobNumber: job.job_number,
      summary,
      entries: reportEntries,
      byEmployee,
      byDay,
    }
  }
}

// ============================================================
// PAYROLL REPORT
// ============================================================

export interface PayrollEntry {
  employeeName: string
  employeeType: string
  jobNumber: string
  totalHours: number
  baseRate: number
  loadedRate: number
  baseCost: number
  loadedCost: number
}

export interface PayrollEmployeeSummary {
  name: string
  employeeType: string
  totalHours: number
  baseRate: number
  loadedRate: number
  baseCost: number
  loadedCost: number
  jobBreakdown: { jobNumber: string; hours: number }[]
}

export interface PayrollReportData {
  startDate: string
  endDate: string
  entries: PayrollEntry[]
  byEmployee: PayrollEmployeeSummary[]
  totals: {
    totalHours: number
    totalBaseCost: number
    totalLoadedCost: number
  }
}

/**
 * Generate a payroll report for a date range
 */
export async function generatePayrollReport(
  orgId: string,
  startDate: string,
  endDate: string
): Promise<{ data?: PayrollReportData; error?: string }> {
  const supabase = await createClient()

  const endDateObj = new Date(endDate)
  endDateObj.setDate(endDateObj.getDate() + 1)

  const { data: entries, error } = await supabase
    .from('time_entries')
    .select('*, user:users(first_name, last_name, employee_type, base_rate, loaded_rate), job:jobs(job_number)')
    .eq('org_id', orgId)
    .eq('entry_type', 'work')
    .not('clock_out', 'is', null)
    .gte('clock_in', startDate)
    .lt('clock_in', endDateObj.toISOString())
    .order('clock_in', { ascending: true })

  if (error) return { error: error.message }

  if (!entries || entries.length === 0) {
    return {
      data: {
        startDate,
        endDate,
        entries: [],
        byEmployee: [],
        totals: { totalHours: 0, totalBaseCost: 0, totalLoadedCost: 0 },
      }
    }
  }

  const payrollEntries: PayrollEntry[] = entries.map((entry) => {
    const clockIn = new Date(entry.clock_in)
    const clockOut = new Date(entry.clock_out)
    const hours = (clockOut.getTime() - clockIn.getTime()) / 1000 / 3600
    const baseRate = entry.user?.base_rate || 0
    const loadedRate = entry.user?.loaded_rate || 0

    return {
      employeeName: `${entry.user?.first_name || ''} ${entry.user?.last_name || ''}`.trim(),
      employeeType: entry.user?.employee_type || 'w2',
      jobNumber: entry.job?.job_number || 'No Job',
      totalHours: Math.round(hours * 100) / 100,
      baseRate,
      loadedRate,
      baseCost: Math.round(hours * baseRate * 100) / 100,
      loadedCost: Math.round(hours * loadedRate * 100) / 100,
    }
  })

  const empMap = new Map<string, {
    employeeType: string
    totalHours: number
    baseRate: number
    loadedRate: number
    baseCost: number
    loadedCost: number
    jobs: Map<string, number>
  }>()

  payrollEntries.forEach((e) => {
    const existing = empMap.get(e.employeeName)
    if (existing) {
      existing.totalHours += e.totalHours
      existing.baseCost += e.baseCost
      existing.loadedCost += e.loadedCost
      existing.jobs.set(e.jobNumber, (existing.jobs.get(e.jobNumber) || 0) + e.totalHours)
    } else {
      empMap.set(e.employeeName, {
        employeeType: e.employeeType,
        totalHours: e.totalHours,
        baseRate: e.baseRate,
        loadedRate: e.loadedRate,
        baseCost: e.baseCost,
        loadedCost: e.loadedCost,
        jobs: new Map([[e.jobNumber, e.totalHours]]),
      })
    }
  })

  const byEmployee: PayrollEmployeeSummary[] = Array.from(empMap.entries()).map(([name, data]) => ({
    name,
    employeeType: data.employeeType,
    totalHours: Math.round(data.totalHours * 100) / 100,
    baseRate: data.baseRate,
    loadedRate: data.loadedRate,
    baseCost: Math.round(data.baseCost * 100) / 100,
    loadedCost: Math.round(data.loadedCost * 100) / 100,
    jobBreakdown: Array.from(data.jobs.entries()).map(([jobNumber, hours]) => ({
      jobNumber,
      hours: Math.round(hours * 100) / 100,
    })),
  }))

  const totals = {
    totalHours: Math.round(payrollEntries.reduce((sum, e) => sum + e.totalHours, 0) * 100) / 100,
    totalBaseCost: Math.round(payrollEntries.reduce((sum, e) => sum + e.baseCost, 0) * 100) / 100,
    totalLoadedCost: Math.round(payrollEntries.reduce((sum, e) => sum + e.loadedCost, 0) * 100) / 100,
  }

  return {
    data: { startDate, endDate, entries: payrollEntries, byEmployee, totals }
  }
}
