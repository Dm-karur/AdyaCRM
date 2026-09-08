import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, Trash2, Plus, Users, UserCircle2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../context/ConfirmContext';

const AdminEmployees = () => {
  const confirm = useConfirm();
  const [employees, setEmployees] = useState([]);
  const [isCreateEmployeeModalOpen, setIsCreateEmployeeModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ username: '', password: '', role: 'Employee', salary: '', shiftStart: '09:00', shiftEnd: '18:00', salaryType: 'Monthly', brand: 'None', branch: 'Main', allow_outside_radius: false });
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data } = await api.get('/admin/employees');
        setEmployees(data);
      } catch (err) {
        console.error('Failed to fetch employees', err);
      }
    };
    const fetchBranches = async () => {
      try {
        const { data } = await api.get('/branches');
        setBranches(data);
        if (data.length > 0 && newEmployee.branch === 'Main') {
            setNewEmployee(prev => ({ ...prev, branch: data[0].name }));
        }
      } catch (err) {
        console.error('Failed to fetch branches', err);
      }
    };
    fetchEmployees();
    fetchBranches();
  }, []);

  const handleRemoveEmployee = async (targetId) => {
    if (!targetId) return;
    if (await confirm('Are you sure you want to completely remove this employee? This action cannot be undone.')) {
      try {
        await api.delete(`/admin/employees/${targetId}`);
        setEmployees(employees.filter(emp => emp._id !== targetId));
        toast.success('Employee successfully removed!');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to remove employee');
      }
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setIsCreatingEmployee(true);
    try {
      const payload = {
        name: newEmployee.username,
        employeeId: newEmployee.username,
        password: newEmployee.password,
        role: newEmployee.role,
        department: newEmployee.department,
        salary: Number(newEmployee.salary),
        salaryType: newEmployee.salaryType,
        shiftStart: newEmployee.shiftStart,
        shiftEnd: newEmployee.shiftEnd,
        brand: newEmployee.brand,
        branch: newEmployee.branch,
        allow_outside_radius: newEmployee.allow_outside_radius
      };

      await api.post('/employees', payload);
      const res = await api.get('/admin/employees');
      setEmployees(res.data);
      setNewEmployee({ username: '', password: '', role: 'Employee', salary: '', shiftStart: '09:00', shiftEnd: '18:00', salaryType: 'Monthly', brand: 'None', branch: 'Main', allow_outside_radius: false });
      toast.success(`Employee ${newEmployee.username} created successfully!`);
      setIsCreateEmployeeModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create employee');
    } finally {
      setIsCreatingEmployee(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col px-4 md:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0 mt-4 md:mt-0">
        <h1 className="text-lg md:text-2xl font-bold text-gray-800 flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl">
            <Users className="text-primary" size={24} />
          </div>
          Employee Directory
        </h1>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button onClick={() => setIsCreateEmployeeModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white rounded-xl font-bold shadow-md shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5 text-sm">
            <Plus size={18} /> Create Employee
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col flex-1 overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        <div className="flex flex-col md:flex-row gap-4 p-5 md:p-6 border-b border-gray-100 bg-gray-50/30">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search employees by name or ID..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto flex-1">
          <div className="hidden md:block">
          <table className="w-full min-w-[800px] text-left">
            <thead className="bg-gray-50/50">
              <tr className="text-xs text-gray-400 font-bold uppercase tracking-widest border-b border-gray-100">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Salary Details</th>
                <th className="px-6 py-4 text-center">Branch</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredEmployees.map(emp => (
                <tr key={emp._id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 group-hover:bg-white group-hover:border-blue-100 transition-all">
                        <UserCircle2 size={20} className="text-gray-400 group-hover:text-primary transition-colors" />
                      </div>
                      <span className="font-bold text-gray-800 text-base">{emp.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col justify-center">
                      <span className="font-bold text-gray-700">₹{emp.salary || 0}/hr</span>
                      <span className={`w-fit px-2 py-0.5 mt-1 rounded text-[10px] uppercase font-bold tracking-wider ${emp.salaryType === 'Weekly' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>{emp.salaryType || 'Monthly'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg font-bold text-xs tracking-widest shadow-sm inline-block uppercase">
                      {emp.branch || 'Main'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Active</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleRemoveEmployee(emp._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-100 hover:border-red-500 rounded-lg transition-all font-bold text-sm"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="md:hidden flex flex-col gap-4 p-4 bg-gray-50/50">
            {filteredEmployees.map(emp => (
              <div key={emp._id} className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-5 flex flex-col gap-4 transition-all hover:shadow-[0_4px_20px_rgb(0,0,0,0.06)] hover:border-blue-100">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                      <UserCircle2 size={20} className="text-gray-400" />
                    </div>
                    <span className="font-bold text-gray-800 text-lg">{emp.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Active</span>
                  </div>
                </div>
                
                <div className="bg-gray-50/80 p-4 rounded-xl flex items-center justify-between border border-gray-100/50">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Salary Details</span>
                    <span className="font-bold text-gray-800 flex items-center gap-2">
                      ₹{emp.salary || 0}/hr
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${emp.salaryType === 'Weekly' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{emp.salaryType || 'Monthly'}</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Branch</span>
                    <span className="font-bold text-gray-700 text-sm bg-white border border-gray-200 px-2.5 py-1 rounded-md shadow-sm">{emp.branch || 'Main'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    onClick={() => handleRemoveEmployee(emp._id)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-100 hover:border-red-500 rounded-xl transition-all font-bold text-sm w-full justify-center shadow-sm"
                  >
                    <Trash2 size={16} /> Remove Employee
                  </button>
                </div>
              </div>
            ))}
          </div>
          {filteredEmployees.length === 0 && (
            <div className="text-center py-16 flex flex-col items-center justify-center">
              <Users size={48} className="text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium text-lg">No employees found matching filters.</p>
            </div>
          )}
        </div>
      </div>

      {isCreateEmployeeModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsCreateEmployeeModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            <h3 className="font-bold text-xl mb-4 text-primary">Create New Employee</h3>
            <form onSubmit={handleCreateEmployee} className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Username (Name)</label>
                <input type="text" required className="input-field w-full" value={newEmployee.username} onChange={e => setNewEmployee({ ...newEmployee, username: e.target.value })} placeholder="employee123" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="text" required className="input-field w-full" value={newEmployee.password} onChange={e => setNewEmployee({ ...newEmployee, password: e.target.value })} placeholder="password123" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select className="input-field w-full" value={newEmployee.role} onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value })}>
                  <option value="Employee">Employee</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary Type</label>
                <select className="input-field w-full" value={newEmployee.salaryType} onChange={e => setNewEmployee({ ...newEmployee, salaryType: e.target.value })}>
                  <option value="Monthly">Monthly Salary</option>
                  <option value="Weekly">Weekly Salary</option>
                </select>
              </div>
              {newEmployee.salaryType === 'Monthly' && (
                <>
                  {newEmployee.role !== 'Admin' && (
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                      <select className="input-field w-full" value={newEmployee.brand} onChange={e => setNewEmployee({ ...newEmployee, brand: e.target.value })}>
                        <option value="None">Select Brand</option>
                        <option value="Bosch">Bosch</option>
                        <option value="Furniture">Furniture</option>
                      </select>
                    </div>
                  )}
                  {newEmployee.role !== 'Admin' && (
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                      <select required className="input-field w-full" value={newEmployee.branch} onChange={e => setNewEmployee({ ...newEmployee, branch: e.target.value })}>
                        {branches.length > 0 ? branches.map(b => (
                          <option key={b._id} value={b.name}>{b.name} ({b.code})</option>
                        )) : (
                          <option value="Main">Main</option>
                        )}
                      </select>
                    </div>
                  )}
                </>
              )}
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary (Hourly)</label>
                <input type="number" required min="0" step="0.01" className="input-field w-full" value={newEmployee.salary} onChange={e => setNewEmployee({ ...newEmployee, salary: e.target.value })} placeholder="e.g. 15.00" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift Start</label>
                <input type="time" required className="input-field w-full" value={newEmployee.shiftStart} onChange={e => setNewEmployee({ ...newEmployee, shiftStart: e.target.value })} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift End</label>
                <input type="time" required className="input-field w-full" value={newEmployee.shiftEnd} onChange={e => setNewEmployee({ ...newEmployee, shiftEnd: e.target.value })} />
              </div>
              <div className="col-span-2 flex items-center mt-2">
                <input 
                  type="checkbox" 
                  id="allowRadius" 
                  className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer"
                  checked={newEmployee.allow_outside_radius} 
                  onChange={e => setNewEmployee({ ...newEmployee, allow_outside_radius: e.target.checked })} 
                />
                <label htmlFor="allowRadius" className="ml-2 text-sm font-medium text-gray-700 cursor-pointer">
                  Allow Attendance Outside Branch Radius
                </label>
              </div>
              <div className="col-span-2 mt-2">
                <button type="submit" disabled={isCreatingEmployee} className="btn-primary w-full flex justify-center items-center gap-2 py-2">
                  {isCreatingEmployee ? 'Creating...' : <><Plus size={18} /> Create Account</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmployees;
