'use client';

import { useState, useCallback, useMemo, Fragment } from 'react';
import { generatePayrollReport, type PayrollReportData } from '@/app/actions/reports';
import { formatCurrency } from '@/lib/utils';

interface PayrollReportProps {
  orgId: string;
}

export default function PayrollReport({ orgId }: PayrollReportProps) {
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    return monday.toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + (dayOfWeek === 0 ? 0 : 7 - dayOfWeek));
    return sunday.toISOString().split('T')[0];
  });

  const [reportData, setReportData] = useState<PayrollReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const handleGenerateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generatePayrollReport(orgId, startDate, endDate);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setReportData(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  }, [orgId, startDate, endDate]);

  const toggleExpandedRow = useCallback((name: string) => {
    setExpandedRows((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const summaryCards = useMemo(() => {
    if (!reportData) return null;
    const totalHours = reportData.byEmployee.reduce((sum, emp) => sum + emp.totalHours, 0);
    const totalBaseCost = reportData.byEmployee.reduce((sum, emp) => sum + emp.baseCost, 0);
    const totalLoadedCost = reportData.byEmployee.reduce((sum, emp) => sum + emp.loadedCost, 0);
    return { totalHours, totalBaseCost, totalLoadedCost };
  }, [reportData]);

  const handleExportCSV = useCallback(() => {
    if (!reportData) return;
    const headers = ['Employee', 'Type', 'Total Hours', 'Base Rate/hr', 'Loaded Rate/hr', 'Base Cost', 'Loaded Cost'];
    const rows = reportData.byEmployee.map((emp) => [
      emp.name,
      emp.employeeType === 'w2' ? 'W-2' : emp.employeeType === 'agency' ? 'Agency' : '1099',
      emp.totalHours.toFixed(2),
      formatCurrency(emp.baseRate),
      formatCurrency(emp.loadedRate),
      formatCurrency(emp.baseCost),
      formatCurrency(emp.loadedCost),
    ]);
    const totalRow = [
      'TOTAL', '',
      reportData.byEmployee.reduce((sum, emp) => sum + emp.totalHours, 0).toFixed(2),
      '', '',
      formatCurrency(reportData.byEmployee.reduce((sum, emp) => sum + emp.baseCost, 0)),
      formatCurrency(reportData.byEmployee.reduce((sum, emp) => sum + emp.loadedCost, 0)),
    ];
    rows.push(totalRow);
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => (typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell)).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `payroll-report-${startDate}-${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [reportData, startDate, endDate]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'w2': return { label: 'W-2', classes: 'bg-blue-100 text-blue-700' };
      case 'agency': return { label: 'Agency', classes: 'bg-purple-100 text-purple-700' };
      case 'contractor_1099': return { label: '1099', classes: 'bg-orange-100 text-orange-700' };
      default: return { label: type, classes: 'bg-gray-100 text-gray-700' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border rounded-[10px] p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-text-secondary mb-2">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3.5 py-2.5 border border-border rounded-sm text-[14px] w-full" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-text-secondary mb-2">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3.5 py-2.5 border border-border rounded-sm text-[14px] w-full" />
          </div>
          <div className="flex items-end">
            <button onClick={handleGenerateReport} disabled={loading} className="w-full bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-sm text-[14px] font-medium disabled:opacity-50">
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-[10px] p-4 text-red-800 text-[13px]">{error}</div>}

      {reportData && summaryCards && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface border border-border rounded-[10px] p-5 shadow-sm">
            <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-2">Total Hours</div>
            <div className="text-2xl font-bold text-text-primary">{summaryCards.totalHours.toFixed(1)}</div>
          </div>
          <div className="bg-surface border border-border rounded-[10px] p-5 shadow-sm">
            <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-2">Total Base Cost</div>
            <div className="text-2xl font-bold text-text-primary">{formatCurrency(summaryCards.totalBaseCost)}</div>
          </div>
          <div className="bg-surface border border-border rounded-[10px] p-5 shadow-sm">
            <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-2">Total Loaded Cost</div>
            <div className="text-2xl font-bold text-text-primary">{formatCurrency(summaryCards.totalLoadedCost)}</div>
          </div>
        </div>
      )}

      {reportData && (
        <div className="bg-surface border border-border rounded-[10px] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5 border-b border-border">
            <h3 className="text-[13px] font-semibold text-text-primary">Payroll by Employee</h3>
            <button onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-sm text-[12px] font-medium">Export CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 text-left">Employee</th>
                  <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 text-left">Type</th>
                  <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 text-right">Total Hours</th>
                  <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 text-right">Base Rate</th>
                  <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 text-right">Loaded Rate</th>
                  <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 text-right">Base Cost</th>
                  <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 text-right">Loaded Cost</th>
                  <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide px-4 py-2.5 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {reportData.byEmployee.map((employee) => {
                  const badge = getTypeBadge(employee.employeeType);
                  return (
                    <Fragment key={employee.name}>
                      <tr onClick={() => toggleExpandedRow(employee.name)} className="border-b border-border-light hover:bg-gray-50 cursor-pointer">
                        <td className="px-4 py-3 text-[13px] font-medium text-text-primary">{employee.name}</td>
                        <td className="px-4 py-3 text-[13px]">
                          <span className={`${badge.classes} text-[11px] font-medium px-2 py-0.5 rounded`}>{badge.label}</span>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-right">{employee.totalHours.toFixed(2)}</td>
                        <td className="px-4 py-3 text-[13px] text-right">{formatCurrency(employee.baseRate)}</td>
                        <td className="px-4 py-3 text-[13px] text-right">{formatCurrency(employee.loadedRate)}</td>
                        <td className="px-4 py-3 text-[13px] text-right font-medium">{formatCurrency(employee.baseCost)}</td>
                        <td className="px-4 py-3 text-[13px] text-right font-medium">{formatCurrency(employee.loadedCost)}</td>
                        <td className="px-4 py-3 text-[13px] text-center text-text-secondary">{expandedRows[employee.name] ? '−' : '+'}</td>
                      </tr>
                      {expandedRows[employee.name] && employee.jobBreakdown && employee.jobBreakdown.length > 0 && (
                        <tr className="bg-gray-50 border-b border-border">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="space-y-1.5">
                              <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-2">Job Breakdown</div>
                              {employee.jobBreakdown.map((job) => (
                                <div key={job.jobNumber} className="grid grid-cols-2 gap-4 text-[12px]">
                                  <div className="text-text-primary">Job {job.jobNumber}</div>
                                  <div className="text-right text-text-secondary">{job.hours.toFixed(2)} hrs</div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                <tr className="bg-gray-50 font-bold">
                  <td className="px-4 py-3 text-[13px] text-text-primary">TOTAL</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-[13px] text-right">{reportData.byEmployee.reduce((sum, emp) => sum + emp.totalHours, 0).toFixed(2)}</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-[13px] text-right">{formatCurrency(reportData.byEmployee.reduce((sum, emp) => sum + emp.baseCost, 0))}</td>
                  <td className="px-4 py-3 text-[13px] text-right">{formatCurrency(reportData.byEmployee.reduce((sum, emp) => sum + emp.loadedCost, 0))}</td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
