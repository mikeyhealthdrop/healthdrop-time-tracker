'use client'

import { useState, useCallback, useMemo } from 'react'
import { generatePayrollReport, type PayrollReportData, type PayrollEntry } from '@/app/actions/reports'

interface PayrollReportProps {
  orgId: string
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  let hours = d.getHours()
  const minutes = d.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  if (hours === 0) hours = 12
  const minStr = minutes.toString().padStart(2, '0')
  return hours + ':' + minStr + ' ' + ampm
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return days[d.getDay()] + ' ' + months[d.getMonth()] + ' ' + d.getDate()
}

function dateKey(dateStr: string): string {
  const d = new Date(dateStr)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

interface DayGroup {
  dateLabel: string
  sortKey: string
  firstClockIn: string
  lastClockOut: string
  totalHours: number
}

interface EmployeeGroup {
  name: string
  dayGroups: DayGroup[]
  totalHours: number
  dayCount: number
}

export default function PayrollReport({ orgId }: PayrollReportProps) {
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    return monday.toISOString().split('T')[0]
  })

  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const sunday = new Date(today)
    sunday.setDate(today.getDate() + (dayOfWeek === 0 ? 0 : 7 - dayOfWeek))
    return sunday.toISOString().split('T')[0]
  })

  const [reportData, setReportData] = useState<PayrollReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await generatePayrollReport(orgId, startDate, endDate)
      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setReportData(result.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }, [orgId, startDate, endDate])

  const employeeGroups: EmployeeGroup[] = useMemo(() => {
    if (!reportData) return []
    const groupMap = new Map<string, PayrollEntry[]>()
    for (const entry of reportData.entries) {
      const name = entry.employeeName
      if (!groupMap.has(name)) groupMap.set(name, [])
      groupMap.get(name)!.push(entry)
    }
    const groups: EmployeeGroup[] = []
    for (const [name, entries] of groupMap) {
      const dayMap = new Map<string, { entries: PayrollEntry[], key: string }>()
      for (const entry of entries) {
        const dk = dateKey(entry.clockIn)
        if (!dayMap.has(dk)) dayMap.set(dk, { entries: [], key: dk })
        dayMap.get(dk)!.entries.push(entry)
      }
      const dayGroups: DayGroup[] = []
      for (const [, dayData] of dayMap) {
        const dayEntries = dayData.entries
        dayEntries.sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime())
        const firstClockIn = dayEntries[0].clockIn
        const lastClockOut = dayEntries[dayEntries.length - 1].clockOut
        const totalHours = dayEntries.reduce((sum, e) => sum + e.totalHours, 0)
        dayGroups.push({
          dateLabel: formatDate(firstClockIn),
          sortKey: dayData.key,
          firstClockIn,
          lastClockOut,
          totalHours
        })
      }
      dayGroups.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      const totalHours = dayGroups.reduce((sum, d) => sum + d.totalHours, 0)
      groups.push({ name, dayGroups, totalHours, dayCount: dayGroups.length })
    }
    groups.sort((a, b) => a.name.localeCompare(b.name))
    return groups
  }, [reportData])

  const totalAllHours = useMemo(() => {
    return employeeGroups.reduce((sum, g) => sum + g.totalHours, 0)
  }, [employeeGroups])

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payroll Report</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <button onClick={handleGenerateReport} disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded text-sm font-medium disabled:opacity-50">
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      {reportData && employeeGroups.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Timesheet: {startDate} to {endDate}</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {employeeGroups.map((group) => (
              <div key={group.name}>
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-900">{group.name}</span>
                  <span className="text-xs text-gray-500 ml-3">{group.dayCount} Day{group.dayCount !== 1 ? 's' : ''}</span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-2">Date</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-2">Timecard Period</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-2">Hours Worked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.dayGroups.map((day, idx) => (
                      <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-2.5 text-sm text-gray-700">{day.dateLabel}</td>
                        <td className="px-5 py-2.5 text-sm text-gray-700">{formatTime(day.firstClockIn)} - {formatTime(day.lastClockOut)}</td>
                        <td className="px-5 py-2.5 text-sm text-gray-700 text-right">{day.totalHours.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50">
                      <td className="px-5 py-2.5 text-sm font-bold text-gray-900" colSpan={2}>Total</td>
                      <td className="px-5 py-2.5 text-sm font-bold text-gray-900 text-right">{group.totalHours.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          <div className="bg-gray-100 px-5 py-3 border-t border-gray-300">
            <div className="flex justify-between">
              <span className="text-sm font-bold text-gray-900">Grand Total ({employeeGroups.length} employees)</span>
              <span className="text-sm font-bold text-gray-900">{totalAllHours.toFixed(2)} hours</span>
            </div>
          </div>
        </div>
      )}

      {reportData && employeeGroups.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No time entries found for this period.</p>
        </div>
      )}
    </div>
  )
}
'use client'

import { useState, useCallback, useMemo } from 'react'
import { generatePayrollReport, type PayrollReportData, type PayrollEntry } from '@/app/actions/reports'

interface PayrollReportProps {
  orgId: string
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  let hours = d.getHours()
  const minutes = d.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  if (hours === 0) hours = 12
  const minStr = minutes.toString().padStart(2, '0')
  return hours + ':' + minStr + ' ' + ampm
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return days[d.getDay()] + ' ' + months[d.getMonth()] + ' ' + d.getDate()
}

function dateKey(dateStr: string): string {
  const d = new Date(dateStr)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

interface DayGroup {
  dateLabel: string
  sortKey: string
  firstClockIn: string
  lastClockOut: string
  totalHours: number
}

interface EmployeeGroup {
  name: string
  dayGroups: DayGroup[]
  totalHours: number
  dayCount: number
}

export default function PayrollReport({ orgId }: PayrollReportProps) {
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    return monday.toISOString().split('T')[0]
  })

  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const sunday = new Date(today)
    sunday.setDate(today.getDate() + (dayOfWeek === 0 ? 0 : 7 - dayOfWeek))
    return sunday.toISOString().split('T')[0]
  })

  const [reportData, setReportData] = useState<PayrollReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await generatePayrollReport(orgId, startDate, endDate)
      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setReportData(result.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }, [orgId, startDate, endDate])

  const employeeGroups: EmployeeGroup[] = useMemo(() => {
    if (!reportData) return []
    const groupMap = new Map<string, PayrollEntry[]>()
    for (const entry of reportData.entries) {
      const name = entry.employeeName
      if (!groupMap.has(name)) groupMap.set(name, [])
      groupMap.get(name)!.push(entry)
    }
    const groups: EmployeeGroup[] = []
    for (const [name, entries] of groupMap) {
      const dayMap = new Map<string, { entries: PayrollEntry[], key: string }>()
      for (const entry of entries) {
        const dk = dateKey(entry.clockIn)
        if (!dayMap.has(dk)) dayMap.set(dk, { entries: [], key: dk })
        dayMap.get(dk)!.entries.push(entry)
      }
      const dayGroups: DayGroup[] = []
      for (const [, dayData] of dayMap) {
        const dayEntries = dayData.entries
        dayEntries.sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime())
        const firstClockIn = dayEntries[0].clockIn
        const lastClockOut = dayEntries[dayEntries.length - 1].clockOut
        const totalHours = dayEntries.reduce((sum, e) => sum + e.totalHours, 0)
        dayGroups.push({
          dateLabel: formatDate(firstClockIn),
          sortKey: dayData.key,
          firstClockIn,
          lastClockOut,
          totalHours
        })
      }
      dayGroups.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      const totalHours = dayGroups.reduce((sum, d) => sum + d.totalHours, 0)
      groups.push({ name, dayGroups, totalHours, dayCount: dayGroups.length })
    }
    groups.sort((a, b) => a.name.localeCompare(b.name))
    return groups
  }, [reportData])

  const totalAllHours = useMemo(() => {
    return employeeGroups.reduce((sum, g) => sum + g.totalHours, 0)
  }, [employeeGroups])

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payroll Report</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <button onClick={handleGenerateReport} disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded text-sm font-medium disabled:opacity-50">
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      {reportData && employeeGroups.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Timesheet: {startDate} to {endDate}</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {employeeGroups.map((group) => (
              <div key={group.name}>
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-900">{group.name}</span>
                  <span className="text-xs text-gray-500 ml-3">{group.dayCount} Day{group.dayCount !== 1 ? 's' : ''}</span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-2">Date</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-2">Timecard Period</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-2">Hours Worked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.dayGroups.map((day, idx) => (
                      <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-2.5 text-sm text-gray-700">{day.dateLabel}</td>
                        <td className="px-5 py-2.5 text-sm text-gray-700">{formatTime(day.firstClockIn)} - {formatTime(day.lastClockOut)}</td>
                        <td className="px-5 py-2.5 text-sm text-gray-700 text-right">{day.totalHours.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50">
                      <td className="px-5 py-2.5 text-sm font-bold text-gray-900" colSpan={2}>Total</td>
                      <td className="px-5 py-2.5 text-sm font-bold text-gray-900 text-right">{group.totalHours.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          <div className="bg-gray-100 px-5 py-3 border-t border-gray-300">
            <div className="flex justify-between">
              <span className="text-sm font-bold text-gray-900">Grand Total ({employeeGroups.length} employees)</span>
              <span className="text-sm font-bold text-gray-900">{totalAllHours.toFixed(2)} hours</span>
            </div>
          </div>
        </div>
      )}

      {reportData && employeeGroups.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No time entries found for this period.</p>
        </div>
      )}
    </div>
  )
}
'use client'

import { useState, useCallback, useMemo } from 'react'
import { generatePayrollReport, type PayrollReportData, type PayrollEntry } from '@/app/actions/reports'

interface PayrollReportProps {
  orgId: string
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  let hours = d.getHours()
  const minutes = d.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  if (hours === 0) hours = 12
  const minStr = minutes.toString().padStart(2, '0')
  return hours + ':' + minStr + ' ' + ampm
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return days[d.getDay()] + ' ' + months[d.getMonth()] + ' ' + d.getDate()
}

interface EmployeeGroup {
  name: string
  entries: PayrollEntry[]
  totalHours: number
}

export default function PayrollReport({ orgId }: PayrollReportProps) {
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    return monday.toISOString().split('T')[0]
  })

  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const sunday = new Date(today)
    sunday.setDate(today.getDate() + (dayOfWeek === 0 ? 0 : 7 - dayOfWeek))
    return sunday.toISOString().split('T')[0]
  })

  const [reportData, setReportData] = useState<PayrollReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await generatePayrollReport(orgId, startDate, endDate)
      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setReportData(result.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }, [orgId, startDate, endDate])

  const employeeGroups: EmployeeGroup[] = useMemo(() => {
    if (!reportData) return []
    const groupMap = new Map<string, PayrollEntry[]>()
    for (const entry of reportData.entries) {
      const name = entry.employeeName
      if (!groupMap.has(name)) groupMap.set(name, [])
      groupMap.get(name)!.push(entry)
    }
    const groups: EmployeeGroup[] = []
    for (const [name, entries] of groupMap) {
      entries.sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime())
      const totalHours = entries.reduce((sum, e) => sum + e.totalHours, 0)
      groups.push({ name, entries, totalHours })
    }
    groups.sort((a, b) => a.name.localeCompare(b.name))
    return groups
  }, [reportData])

  const totalAllHours = useMemo(() => {
    return employeeGroups.reduce((sum, g) => sum + g.totalHours, 0)
  }, [employeeGroups])

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payroll Report</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <button onClick={handleGenerateReport} disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded text-sm font-medium disabled:opacity-50">
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      {reportData && employeeGroups.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Timesheet: {startDate} to {endDate}</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {employeeGroups.map((group) => (
              <div key={group.name}>
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-900">{group.name}</span>
                  <span className="text-xs text-gray-500 ml-3">{group.entries.length} Time Card{group.entries.length !== 1 ? 's' : ''}</span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-2">Date</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-2">Timecard Period</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-2">Hours Worked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.entries.map((entry, idx) => (
                      <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-2.5 text-sm text-gray-700">{formatDate(entry.clockIn)}</td>
                        <td className="px-5 py-2.5 text-sm text-gray-700">{formatTime(entry.clockIn)} - {formatTime(entry.clockOut)}</td>
                        <td className="px-5 py-2.5 text-sm text-gray-700 text-right">{entry.totalHours.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50">
                      <td className="px-5 py-2.5 text-sm font-bold text-gray-900" colSpan={2}>Total</td>
                      <td className="px-5 py-2.5 text-sm font-bold text-gray-900 text-right">{group.totalHours.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          <div className="bg-gray-100 px-5 py-3 border-t border-gray-300">
            <div className="flex justify-between">
              <span className="text-sm font-bold text-gray-900">Grand Total ({employeeGroups.length} employees)</span>
              <span className="text-sm font-bold text-gray-900">{totalAllHours.toFixed(2)} hours</span>
            </div>
          </div>
        </div>
      )}

      {reportData && employeeGroups.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No time entries found for this period.</p>
        </div>
      )}
    </div>
  )
}
