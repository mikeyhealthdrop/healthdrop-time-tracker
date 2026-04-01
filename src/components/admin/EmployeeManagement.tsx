'use client';

import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
  reactivateEmployee,
} from '@/app/actions/employees';

interface Employee {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'manager' | 'employee';
  employee_type: 'w2' | 'agency' | 'contractor_1099';
  base_rate: number;
  loaded_rate: number;
  is_active: boolean;
}

interface EmployeeManagementProps {
  orgId: string;
}

export default function EmployeeManagement({ orgId }: EmployeeManagementProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [sendingResetFor, setSendingResetFor] = useState<string | null>(null);
  const [resetSentFor, setResetSentFor] = useState<Set<string>>(new Set());
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Form state
  const [formEmail, setFormEmail] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'manager' | 'employee'>('employee');
  const [formEmployeeType, setFormEmployeeType] = useState<'w2' | 'agency' | 'contractor_1099'>('w2');
  const [formBaseRate, setFormBaseRate] = useState('0');
  const [formLoadedRate, setFormLoadedRate] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, [orgId]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getEmployees(orgId);
      if (result.error) {
        setError(result.error);
      } else {
        setEmployees(result.data || []);
      }
    } catch (err) {
      setError('Failed to load employees');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setFormEmail('');
    setFormFirstName('');
    setFormLastName('');
    setFormRole('employee');
    setFormEmployeeType('w2');
    setFormBaseRate('0');
    setFormLoadedRate('0');
    setIsModalOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormEmail(employee.email);
    setFormFirstName(employee.first_name);
    setFormLastName(employee.last_name);
    setFormRole(employee.role);
    setFormEmployeeType(employee.employee_type);
    setFormBaseRate(String(employee.base_rate || 0));
    setFormLoadedRate(String(employee.loaded_rate || 0));
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  const handleSaveEmployee = async () => {
    try {
      setSaving(true);
      setError(null);

      if (editingEmployee) {
        const result = await updateEmployee(editingEmployee.id, orgId, {
          firstName: formFirstName,
          lastName: formLastName,
          role: formRole,
          employeeType: formEmployeeType,
          baseRate: parseFloat(formBaseRate) || 0,
          loadedRate: parseFloat(formLoadedRate) || 0,
          isActive: editingEmployee.is_active,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
      } else {
        const result = await createEmployee(orgId, {
          email: formEmail,
          firstName: formFirstName,
          lastName: formLastName,
          role: formRole,
          employeeType: formEmployeeType,
          baseRate: parseFloat(formBaseRate) || 0,
          loadedRate: parseFloat(formLoadedRate) || 0,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
      }

      await loadEmployees();
      handleCloseModal();
    } catch (err) {
      setError('Failed to save employee');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (employeeId: string) => {
    try {
      const result = await deactivateEmployee(employeeId, orgId);
      if (result.error) {
        setError(result.error);
        return;
      }
      await loadEmployees();
    } catch (err) {
      setError('Failed to deactivate employee');
      console.error(err);
    }
  };

  const handleReactivate = async (employeeId: string) => {
    try {
      const result = await reactivateEmployee(employeeId, orgId);
      if (result.error) {
        setError(result.error);
        return;
      }
      await loadEmployees();
    } catch (err) {
      setError('Failed to reactivate employee');
      console.error(err);
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    try {
      setSendingResetFor(email);
      setResetMessage(null);
      setError(null);

      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send password reset');
        return;
      }

      setResetSentFor(prev => new Set(prev).add(email));
      setResetMessage(`Password reset email sent to ${email}`);
      setTimeout(() => setResetMessage(null), 5000);
    } catch (err) {
      setError('Failed to send password reset email');
      console.error(err);
    } finally {
      setSendingResetFor(null);
    }
  };

  const filteredEmployees = showInactive
    ? employees
    : employees.filter(emp => emp.is_active !== false);

  const getEmployeeTypeBadge = (type: string) => {
    switch (type) {
      case 'w2':
        return { label: 'W-2', classes: 'bg-blue-100 text-blue-700' };
      case 'agency':
        return { label: 'Agency', classes: 'bg-purple-100 text-purple-700' };
      case 'contractor_1099':
        return { label: '1099', classes: 'bg-orange-100 text-orange-700' };
      default:
        return { label: type, classes: 'bg-gray-100 text-gray-700' };
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin', classes: 'bg-red-100 text-red-700' };
      case 'manager':
        return { label: 'Manager', classes: 'bg-orange-100 text-orange-700' };
      case 'employee':
        return { label: 'Employee', classes: 'bg-green-100 text-green-700' };
      default:
        return { label: role, classes: 'bg-gray-100 text-gray-700' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-text-secondary">Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-surface border border-red-200 rounded-[10px] p-4 text-red-700 text-[13px]">
          {error}
        </div>
      )}

      {resetMessage && (
        <div className="bg-surface border border-green-200 rounded-[10px] p-4 text-green-700 text-[13px]">
          {resetMessage}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-[14px] font-semibold text-text-primary">Employees</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 rounded border border-border"
            />
            <span className="text-[13px] text-text-secondary">Show Inactive</span>
          </label>
        </div>
        <button
          onClick={handleAddEmployee}
          className="px-3.5 py-2.5 bg-accent hover:bg-accent-hover rounded-sm text-white text-[13px] font-medium transition-colors"
        >
          Add Employee
        </button>
      </div>

      <div className="bg-surface border border-border rounded-[10px] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide bg-gray-50">Name</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide bg-gray-50">Email</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide bg-gray-50">Role</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide bg-gray-50">Type</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide bg-gray-50">Base Rate</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide bg-gray-50">Loaded Rate</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide bg-gray-50">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide bg-gray-50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <p className="text-[13px] text-text-secondary">
                      {showInactive ? 'No employees found' : 'No active employees. Check "Show Inactive" to see all.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => {
                  const typeBadge = getEmployeeTypeBadge(employee.employee_type);
                  const roleBadge = getRoleBadge(employee.role);
                  return (
                    <tr key={employee.id} className="border-b border-border hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-[13px] text-text-primary font-medium">
                        {employee.first_name} {employee.last_name}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-text-secondary">{employee.email}</td>
                      <td className="px-4 py-3">
                        <span className={`${roleBadge.classes} px-2 py-1 rounded text-[12px] font-medium`}>{roleBadge.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`${typeBadge.classes} px-2 py-1 rounded text-[12px] font-medium`}>{typeBadge.label}</span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-text-primary">{formatCurrency(employee.base_rate || 0)}</td>
                      <td className="px-4 py-3 text-[13px] text-text-primary">{formatCurrency(employee.loaded_rate || 0)}</td>
                      <td className="px-4 py-3">
                        {employee.is_active !== false ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[12px] font-medium bg-green-100 text-green-700">Active</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[12px] font-medium bg-gray-100 text-gray-700">Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditEmployee(employee)}
                            className="text-[12px] font-medium text-accent hover:text-accent-hover transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleSendPasswordReset(employee.email)}
                            disabled={sendingResetFor === employee.email}
                            className={`text-[12px] font-medium transition-colors ${
                              resetSentFor.has(employee.email)
                                ? 'text-green-600'
                                : 'text-blue-600 hover:text-blue-800'
                            } disabled:opacity-50`}
                          >
                            {sendingResetFor === employee.email
                              ? 'Sending...'
                              : resetSentFor.has(employee.email)
                              ? 'Sent'
                              : 'Send Reset'}
                          </button>
                          {employee.is_active !== false ? (
                            <button
                              onClick={() => handleDeactivate(employee.id)}
                              className="text-[12px] font-medium text-red-600 hover:text-red-800 transition-colors"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(employee.id)}
                              className="text-[12px] font-medium text-green-600 hover:text-green-800 transition-colors"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inline Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[10px] shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-text-primary">
                {editingEmployee ? 'Edit Employee' : 'Add Employee'}
              </h3>
              <button onClick={handleCloseModal} className="text-text-secondary hover:text-text-primary text-xl leading-none">&times;</button>
            </div>

            {!editingEmployee && (
              <div>
                <label className="block text-[13px] font-medium text-text-primary mb-1">Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-sm text-[14px]"
                  placeholder="employee@example.com"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-text-primary mb-1">First Name</label>
                <input
                  type="text"
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-sm text-[14px]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-text-primary mb-1">Last Name</label>
                <input
                  type="text"
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-sm text-[14px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-text-primary mb-1">Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-sm text-[14px]"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-text-primary mb-1">Type</label>
                <select
                  value={formEmployeeType}
                  onChange={(e) => setFormEmployeeType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-sm text-[14px]"
                >
                  <option value="w2">W-2</option>
                  <option value="agency">Agency</option>
                  <option value="contractor_1099">1099 Contractor</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-text-primary mb-1">Base Rate ($/hr)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formBaseRate}
                  onChange={(e) => setFormBaseRate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-sm text-[14px]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-text-primary mb-1">Loaded Rate ($/hr)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formLoadedRate}
                  onChange={(e) => setFormLoadedRate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-sm text-[14px]"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button onClick={handleCloseModal} className="px-3.5 py-2.5 border border-border rounded-sm text-[13px] font-medium text-text-primary hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleSaveEmployee}
                disabled={saving}
                className="px-3.5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-sm text-[13px] font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingEmployee ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
