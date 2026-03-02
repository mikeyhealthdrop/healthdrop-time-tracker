import type { JobReportEntry } from '@/app/actions/reports'

/**
 * Generate CSV content from job cost report entries
 * Columns: Date, Employee, Clock In, Clock Out, Total Hours, Loaded Rate, Total Cost
 * Includes totals row at the bottom
 */
export function generateJobCostCSV(entries: JobReportEntry[], jobNumber: string): string {
  const headers = ['Date', 'Employee', 'Type', 'Clock In', 'Clock Out', 'Total Hours', 'Loaded Rate', 'Total Cost']

  const typeLabels: Record<string, string> = {
    w2: 'W-2',
    agency: 'Agency',
    contractor_1099: '1099',
  }

  const rows = entries.map((entry) => [
    entry.date,
    entry.employeeName,
    typeLabels[entry.employeeType] || 'W-2',
    entry.clockIn,
    entry.clockOut,
    entry.totalHours.toFixed(2),
    `$${entry.loadedRate.toFixed(2)}`,
    `$${entry.totalCost.toFixed(2)}`,
  ])

  // Totals row
  const totalHours = entries.reduce((sum, e) => sum + e.totalHours, 0)
  const totalCost = entries.reduce((sum, e) => sum + e.totalCost, 0)
  const totalsRow = ['', 'TOTALS', '', '', '', totalHours.toFixed(2), '', `$${totalCost.toFixed(2)}`]

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
    totalsRow.map(escapeCSV).join(','),
  ].join('\n')

  return csvContent
}

/**
 * Escape a CSV field value
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Trigger a CSV file download in the browser
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
