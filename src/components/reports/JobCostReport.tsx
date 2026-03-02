'use client'

import { useState } from 'react'
import { generateJobCostReport } from '@/app/actions/reports'
import type { JobCostReportData } from '@/app/actions/reports'
import type { Job } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { generateJobCostCSV, downloadCSV } from '@/lib/csv-export'

interface JobCostReportProps {
  orgId: string
  jobs: Job[]
}

export function JobCostReport({ orgId, jobs }: JobCostReportProps) {
  const [selectedJobId, setSelectedJobId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reportData, setReportData] = useState<JobCostReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showByEmployee, setShowByEmployee] = useState(false)
  const [showByDay, setShowByDay] = useState(false)

  async function handleGenerate() {
    if (!selectedJobId) {
      setError('Please select a job')
      return
    }
    setError('')
    setLoading(true)
    setReportData(null)

    const result = await generateJobCostReport(
      selectedJobId,
      orgId,
      startDate || undefined,
      endDate || undefined
    )
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setReportData(result.data)
    }
    setLoading(false)
  }

  function handleExportCSV() {
    if (!reportData) return
    const csv = generateJobCostCSV(reportData.entries, reportData.jobNumber)
    downloadCSV(csv, `${reportData.jobNumber}_job-cost-report.csv`)
  }

  return (
    <div>
      {/* Controls */}
      <div className="bg-surface border border-border rounded-[10px] p-5 shadow-sm mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-semibold text-text-secondary uppercase">Job:</span>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="px-3 py-2.5 border border-border rounded-sm text-[14px] text-text-primary bg-surface min-w-[200px]"
            style={{
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236b6960' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              paddingRight: '36px',
            }}
          >
            <option value="">— Select a job —</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.job_number}
              </option>
            ))}
          </select>

          <span className="text-[11px] font-semibold text-text-secondary uppercase">From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2.5 border border-border rounded-sm text-[14px] text-text-primary bg-surface"
          />

          <span className="text-[11px] font-semibold text-text-secondary uppercase">To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2.5 border border-border rounded-sm text-[14px] text-text-primary bg-surface"
          />

          <button
            onClick={handleGenerate}
            disabled={loading || !selectedJobId}
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>

          <div className="flex-1" />

          {reportData && reportData.entries.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="px-5 py-2.5 bg-green hover:bg-[#15803d] text-white text-[13px] font-medium rounded-sm transition-colors flex items-center gap-2"
            >
              ⬇ Export CSV
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3 text-red text-[13px] p-2 bg-red-light rounded-sm">
            {error}
          </div>
        )}
      </div>

      {/* Report Content */}
      {reportData && (
        <>
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-surface border border-border rounded-[10px] p-4 text-center shadow-sm">
              <div className="text-[24px] font-bold text-text-primary">
                {formatCurrency(reportData.summary.totalLaborCost)}
              </div>
              <div className="text-[11px] text-text-secondary uppercase tracking-wide mt-0.5">
                Total Labor Cost
              </div>
            </div>
            <div className="bg-surface border border-border rounded-[10px] p-4 text-center shadow-sm">
              <div className="text-[24px] font-bold text-text-primary">
                {reportData.summary.totalHours}
              </div>
              <div className="text-[11px] text-text-secondary uppercase tracking-wide mt-0.5">
                Total Hours
              </div>
            </div>
            <div className="bg-surface border border-border rounded-[10px] p-4 text-center shadow-sm">
              <div className="text-[24px] font-bold text-text-primary">
                {reportData.summary.employeeCount}
              </div>
              <div className="text-[11px] text-text-secondary uppercase tracking-wide mt-0.5">
                Employees
              </div>
            </div>
            <div className="bg-surface border border-border rounded-[10px] p-4 text-center shadow-sm">
              <div className="text-[24px] font-bold text-text-primary">
                {reportData.summary.dayCount}
              </div>
              <div className="text-[11px] text-text-secondary uppercase tracking-wide mt-0.5">
                Days
              </div>
            </div>
          </div>

          {/* All Time Entries Table */}
          <div className="bg-surface border border-border rounded-[10px] shadow-sm mb-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-border-light">
              <span className="text-[14px] font-semibold text-text-primary">All Time Entries</span>
              <span className="text-[12px] text-text-muted ml-2">
                {reportData.entries.length} entries
              </span>
            </div>

            {reportData.entries.length === 0 ? (
              <div className="p-8 text-center text-[14px] text-text-muted">
                No completed time entries for this job yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="bg-surface-alt">
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border">
                        Date
                      </th>
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border">
                        Employee
                      </th>
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border">
                        Type
                      </th>
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border">
                        Clock In
                      </th>
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border">
                        Clock Out
                      </th>
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border">
                        Total Time
                      </th>
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border">
                        Loaded Rate
                      </th>
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border">
                        Total Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.entries.map((entry, i) => (
                      <tr key={i} className="hover:bg-surface-alt">
                        <td className="px-4 py-3 border-b border-border-light font-medium">
                          {entry.date}
                        </td>
                        <td className="px-4 py-3 border-b border-border-light">
                          {entry.employeeName}
                        </td>
                        <td className="px-4 py-3 border-b border-border-light">
                          <EmployeeTypeBadge type={entry.employeeType} />
                        </td>
                        <td className="px-4 py-3 border-b border-border-light">
                          {entry.clockIn}
                        </td>
                        <td className="px-4 py-3 border-b border-border-light">
                          {entry.clockOut}
                        </td>
                        <td className="px-4 py-3 border-b border-border-light tabular-nums">
                          {entry.totalHours.toFixed(2)} hrs
                        </td>
                        <td className="px-4 py-3 border-b border-border-light tabular-nums">
                          {formatCurrency(entry.loadedRate)}/hr
                        </td>
                        <td className="px-4 py-3 border-b border-border-light tabular-nums font-semibold">
                          {formatCurrency(entry.totalCost)}
                        </td>
                      </tr>
                    ))}

                    {/* Totals Row */}
                    <tr className="bg-surface-alt">
                      <td colSpan={5} className="px-4 py-3.5 border-t-2 border-border text-right font-bold">
                        TOTALS
                      </td>
                      <td className="px-4 py-3.5 border-t-2 border-border tabular-nums font-bold">
                        {reportData.summary.totalHours.toFixed(2)} hrs
                      </td>
                      <td className="px-4 py-3.5 border-t-2 border-border">
                        —
                      </td>
                      <td className="px-4 py-3.5 border-t-2 border-border tabular-nums font-bold">
                        {formatCurrency(reportData.summary.totalLaborCost)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Collapsible Breakdown Sections */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setShowByEmployee(!showByEmployee)}
              className="px-4 py-2 border border-border rounded-sm text-[13px] font-medium text-text-secondary hover:bg-surface-alt transition-colors bg-surface"
            >
              {showByEmployee ? '▼' : '▶'} Breakdown by Employee
            </button>
            <button
              onClick={() => setShowByDay(!showByDay)}
              className="px-4 py-2 border border-border rounded-sm text-[13px] font-medium text-text-secondary hover:bg-surface-alt transition-colors bg-surface"
            >
              {showByDay ? '▼' : '▶'} Breakdown by Day
            </button>
          </div>

          {/* Breakdown by Employee */}
          {showByEmployee && (
            <div className="bg-surface border border-border rounded-[10px] shadow-sm mb-4 overflow-hidden">
              <div className="px-5 py-4 border-b border-border-light">
                <span className="text-[14px] font-semibold text-text-primary">Breakdown by Employee</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="bg-surface-alt">
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border">Employee</th>
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border">Type</th>
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border">Hours</th>
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border">Days Worked</th>
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border">Loaded Rate</th>
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.byEmployee.map((emp, i) => (
                      <tr key={i} className="hover:bg-surface-alt">
                        <td className="px-4 py-3 border-b border-border-light font-medium">{emp.name}</td>
                        <td className="px-4 py-3 border-b border-border-light"><EmployeeTypeBadge type={emp.employeeType} /></td>
                        <td className="px-4 py-3 border-b border-border-light tabular-nums">{emp.hours.toFixed(1)} hrs</td>
                        <td className="px-4 py-3 border-b border-border-light">{emp.daysWorked}</td>
                        <td className="px-4 py-3 border-b border-border-light tabular-nums">{formatCurrency(emp.loadedRate)}/hr</td>
                        <td className="px-4 py-3 border-b border-border-light tabular-nums font-semibold">{formatCurrency(emp.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Breakdown by Day */}
          {showByDay && (
            <div className="bg-surface border border-border rounded-[10px] shadow-sm mb-4 overflow-hidden">
              <div className="px-5 py-4 border-b border-border-light">
                <span className="text-[14px] font-semibold text-text-primary">Breakdown by Day</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="bg-surface-alt">
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border">Date</th>
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border">Employees</th>
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border">Hours</th>
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 border-b border-border">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.byDay.map((day, i) => (
                      <tr key={i} className="hover:bg-surface-alt">
                        <td className="px-4 py-3 border-b border-border-light font-medium">{day.date}</td>
                        <td className="px-4 py-3 border-b border-border-light">{day.employeeCount}</td>
                        <td className="px-4 py-3 border-b border-border-light tabular-nums">{day.hours.toFixed(1)} hrs</td>
                        <td className="px-4 py-3 border-b border-border-light tabular-nums font-semibold">{formatCurrency(day.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EmployeeTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    w2: 'bg-accent-light text-accent',
    agency: 'bg-purple-light text-purple',
    contractor_1099: 'bg-orange-light text-orange',
  }
  const labels: Record<string, string> = {
    w2: 'W-2',
    agency: 'Agency',
    contractor_1099: '1099',
  }

  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${styles[type] || styles.w2}`}>
      {labels[type] || 'W-2'}
    </span>
  )
}
