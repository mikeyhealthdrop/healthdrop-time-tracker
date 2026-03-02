'use client';

import { useState, useEffect } from 'react';
import { UserProfile } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { getEmployees, createEmployee, updateEmployee, deactivateEmployee, reactivateEmployee } from '@/app/actions/employees';
import EmployeeFormModal from './EmployeeFormModal';
import { ChevronDown } from 'lucide-react';

interface EmployeeManagementProps {
  orgId: string;
}

type EmployeeType = 'w2' | 'agency' | 'contractor_1099';
type Role = 'admin' | 'manager' | 'employee';

export default function EmployeeManagement({ orgId }: EmployeeManagementProps) {
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadEmployees();
  }, [orgId]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEmployees(orgId);
      setEmployees(data);
    } catch (err) {
      setError('Failed to load employees');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  const handleEditEmployee = (employee: UserProfile) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  const handleSaveEmployee = async (formData: {
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    employeeType: EmployeeType;
    baseRate: number;
    loadedRate: number;
  }) => {
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, formData);
      } else {
        await createEmployee(orgId, formData);
      }
      await loadEmployees();
      handleCloseModal();
    } catch (err) {
      setError('Failed to save employee');
      console.error(err);
    }
  };

  const handleDeactivate = async (employeeId: string) => {
    try {
      await deactivateEmployee(employeeId);
      await loadEmployees();
    } catch (err) {
      setError('Failed to deactivate employee');
      console.error(err);
    }
  };

  const handleReactivate = async (employeeId: string) => {
    try {
      await reactivateEmployee(employeeId);
      await loadEmployees();
    } catch (err) {
      setError('Failed to reactivate employee');
      console.error(err);
    }
  };

  const filteredEmployees = showInactive
    ? employees
    : employees.filter(emp => emp.active !== false);

  const getEmployeeTypeBadgeClasses = (type: EmployeeType) => {
    switch (type) {
      case 'w2':
        return 'bg-blue-100 text-accent px-2 py-1 rounded text-[12px] font-medium';
      case 'agency':
        return 'bg-purple-100 text-purple-700 px-2 py-1 rounded text-[12px] font-medium';
      case 'contractor_1099':
        return 'bg-orange-100 text-orange-700 px-2 py-1 rounded text-[12px] font-medium';
      default:
        return 'bg-gray-100 text-gray-700 px-2 py-1 rounded text-[12px] font-medium';
    }
  };

  const getEmployeeTypeLabel = (type: EmployeeType) => {
    switch (type) {
      case 'w2':
        return 'W-2';
      case 'agency':
        return 'Agency';
      case 'contractor_1099':
        return '1099';
      default:
        return type;
    }
  };

  const getRoleBadgeClasses = (role: Role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700 px-2 py-1 rounded text-[12px] font-medium';
      case 'manager':
        return 'bg-orange-100 text-orange-700 px-2 py-1 rounded text-[12px] font-medium';
      case 'employee':
        return 'bg-green-100 text-green-700 px-2 py-1 rounded text-[12px] font-medium';
      default:
        return 'bg-gray-100 text-gray-700 px-2 py-1 rounded text-[12px] font-medium';
    }
  };

  const getRoleLabel = (role: Role) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
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
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide bg-gray-50">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide bg-gray-50">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide bg-gray-50">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide bg-gray-50">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide bg-gray-50">
                  Base Rate
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide bg-gray-50">
                  Loaded Rate
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide bg-gray-50">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide bg-gray-50">
                  Actions
                </th>
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
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="border-b border-border hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-[13px] text-text-primary font-medium">
                      {employee.first_name} {employee.last_name}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-text-secondary">
                      {employee.email}
                    </td>
                    <td className="px-4 py-3">
                      <span className={getRoleBadgeClasses(employee.role as Role)}>
                        {getRoleLabel(employee.role as Role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={getEmployeeTypeBadgeClasses(employee.employee_type as EmployeeType)}>
                        {getEmployeeTypeLabel(employee.employee_type as EmployeeType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-text-primary">
                      {formatCurrency(employee.base_rate || 0)}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-text-primary">
                      {formatCurrency(employee.loaded_rate || 0)}
                    </td>
                    <td className="px-4 py-3">
                      {employee.active !== false ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[12px] font-medium bg-green-100 text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[12px] font-medium bg-gray-100 text-gray-700">
                          Inactive
                        </span>
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
                        {employee.active !== false ? (
                          <button
                            onClick={() => handleDeactivate(employee.id)}
                            className="text-[12px] font-medium text-red hover:text-[#b91c1c] transition-colors"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(employee.id)}
                            className="text-[12px] font-medium text-green hover:text-[#15803d] transition-colors"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EmployeeFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveEmployee}
        initialData={editingEmployee || undefined}
      />
    </div>
  );
}
