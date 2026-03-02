export type UserRole = 'admin' | 'manager' | 'employee'
export type EmployeeType = 'w2' | 'agency' | 'contractor_1099'
export type EntryType = 'work' | 'lunch'

export interface Organization {
  id: string
  name: string
  slug: string
  settings: Record<string, unknown>
  created_at: string
}

export interface UserProfile {
  id: string
  org_id: string
  email: string
  role: UserRole
  first_name: string
  last_name: string
  employee_type: EmployeeType
  base_rate: number
  loaded_rate: number
  is_active: boolean
  created_at: string
}

export interface Job {
  id: string
  org_id: string
  job_number: string
  is_active: boolean
  created_at: string
  created_by: string
}

export interface TimeEntry {
  id: string
  org_id: string
  user_id: string
  job_id: string | null
  clock_in: string
  clock_out: string | null
  entry_type: EntryType
  created_at: string
  // joined fields
  user?: UserProfile
  job?: Job
}

export interface TimeEntryEdit {
  id: string
  time_entry_id: string
  edited_by: string
  old_values: Record<string, unknown>
  new_values: Record<string, unknown>
  reason: string
  created_at: string
}

// Computed types for the UI
export interface ActiveSession {
  timeEntry: TimeEntry
  job: Job | null
  elapsedSeconds: number
}

export interface DailyLogEntry {
  jobNumber: string | null
  entryType: EntryType
  startTime: string
  endTime: string | null
  durationMinutes: number
  isActive: boolean
}

export interface DailySummary {
  entries: DailyLogEntry[]
  totalMinutes: number
  workedMinutes: number
  lunchMinutes: number
}
