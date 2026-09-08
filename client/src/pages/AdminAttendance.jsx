import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { MapPin, X, Search, Calendar, Download, Pencil, Filter } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
applyPlugin(jsPDF);
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const AdminAttendance = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals & Forms
  
  const [isManageRecordModalOpen, setIsManageRecordModalOpen] = useState(false);
  const [manageRecordEmployeeId, setManageRecordEmployeeId] = useState('');
  const [manageRecordData, setManageRecordData] = useState({ date: '', reason: '' });
  const [manageRecordAction, setManageRecordAction] = useState('Leave');
  const [isSubmittingRecord, setIsSubmittingRecord] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Image Preview
  const [previewImage, setPreviewImage] = useState(null);

  const navigate = useNavigate();

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data } = await api.get('/admin/employees');
        setEmployees(data);
      } catch (err) {
        console.error('Failed to fetch employees', err);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch attendance when employee is selected
  useEffect(() => {
    if (!selectedEmployeeId) {
      setAttendanceRecords([]);
      return;
    }
    const fetchAttendance = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get(`/admin/attendance/${selectedEmployeeId}`);
        setAttendanceRecords(data);
      } catch (err) {
        console.error('Failed to fetch attendance records', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAttendance();
  }, [selectedEmployeeId]);



  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingRecord(true);
    try {
      if (manageRecordAction === 'Leave') {
        await api.post('/admin/attendance/mark-leave', {
          employeeId: manageRecordEmployeeId,
          date: manageRecordData.date,
          reason: manageRecordData.reason
        });
        toast.success('Leave marked successfully for this employee');
      } else {
        await api.post('/admin/attendance/manual', {
          employeeId: manageRecordEmployeeId,
          date: manageRecordData.date,
          status: manageRecordAction, // 'Present' or 'Half Day'
          reason: manageRecordData.reason
        });
        toast.success(`${manageRecordAction} attendance added successfully`);
      }
      setIsManageRecordModalOpen(false);
      setManageRecordData({ date: '', reason: '' });
      if (selectedEmployeeId === manageRecordEmployeeId) {
        setAttendanceRecords([]);
        setSelectedEmployeeId('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit record');
    } finally {
      setIsSubmittingRecord(false);
    }
  };



  // Directory Filters
  const departments = ['All', ...new Set(employees.map(e => e.department || 'General'))];
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDepartment === 'All' || (emp.department || 'General') === selectedDepartment;
    return matchesSearch && matchesDept;
  });

  const selectedEmp = employees.find(e => e._id === selectedEmployeeId);
  const salaryType = selectedEmp?.salaryType || 'Monthly';

  // Attendance Filters
  const [year, monthStr] = selectedMonth.split('-');
  const filterYear = parseInt(year, 10);
  const filterMonth = parseInt(monthStr, 10) - 1;

  const currentMonthRecords = attendanceRecords.filter(r => {
    const d = new Date(r.date);
    return d.getFullYear() === filterYear && d.getMonth() === filterMonth;
  });

  const presentDays = currentMonthRecords.filter(r => r.status === 'Present').length;

  let calculatedSalary = 0;
  if (selectedEmp) {
    const shiftStartStr = selectedEmp.shiftStart || '09:00';
    const shiftEndStr = selectedEmp.shiftEnd || '18:00';
    
    const parseTime = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    
    const startMins = parseTime(shiftStartStr);
    const endMins = parseTime(shiftEndStr);
    const expectedMins = Math.max(0, endMins - startMins);
    
    const rate = selectedEmp.salary || 0;
    const dailySalary = (expectedMins / 60) * rate;
    let casualLeaveCount = 0;

    currentMonthRecords.forEach(record => {
      const recordDate = new Date(record.date);
      const isSunday = recordDate.getDay() === 0;

      if (record.status === 'Present') {
        if (record.punchIn?.time && record.punchOut?.time) {
          const punchInDate = new Date(record.punchIn.time);
          const punchOutDate = new Date(record.punchOut.time);
          
          const punchInMins = punchInDate.getHours() * 60 + punchInDate.getMinutes();
          const punchOutMins = punchOutDate.getHours() * 60 + punchOutDate.getMinutes();
          
          let effectiveInMins = punchInMins;
          let effectiveOutMins = punchOutMins;

          // 10-min grace period
          if (punchInMins <= startMins + 10) {
            effectiveInMins = startMins;
          }
          if (punchOutMins >= endMins - 10) {
            effectiveOutMins = endMins;
          }
          
          // Cap early arrivals to start time (no extra pay) and late departures to end time
          effectiveInMins = Math.max(effectiveInMins, startMins);
          effectiveOutMins = Math.min(effectiveOutMins, endMins);

          let actualMins = Math.max(0, effectiveOutMins - effectiveInMins);

          calculatedSalary += (actualMins / 60) * rate;
        } else if (record.isManualEntry && (!record.punchIn?.time || !record.punchOut?.time)) {
          // Manual 'Present' update gets a full day's salary
          calculatedSalary += dailySalary;
        }
      } else if (record.status === 'Half Day') {
        calculatedSalary += (dailySalary / 2);
      } else if ((record.status === 'Leave' || record.status === 'Casual Leave') && salaryType === 'Monthly' && !isSunday) {
        if (casualLeaveCount < 1) {
          calculatedSalary += dailySalary;
          casualLeaveCount++;
        }
      }
    });

    if (salaryType === 'Monthly') {
      let sundaysCount = 0;
      const d = new Date(filterYear, filterMonth, 1);
      while (d.getMonth() === filterMonth) {
        if (d.getDay() === 0) sundaysCount++;
        d.setDate(d.getDate() + 1);
      }
      calculatedSalary += sundaysCount * dailySalary;
    }
  }

  const generatePayslip = () => {
    if (!selectedEmp) return;
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text("Company Name", 105, 20, { align: "center" });
    doc.setFontSize(16);
    doc.text("Monthly Payslip", 105, 30, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Employee Name: ${selectedEmp.name}`, 14, 45);
    doc.text(`Employee ID: ${selectedEmp.employeeId}`, 14, 52);
    doc.text(`Department: ${selectedEmp.department || 'General'}`, 14, 59);
    doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, 66);
    doc.setFontSize(14);
    doc.text("Salary Summary", 14, 80);
    
    doc.autoTable({
      startY: 85,
      head: [["Description", "Details"]],
      body: [
        ["Expected Shift", `${selectedEmp.shiftStart || '09:00'} to ${selectedEmp.shiftEnd || '18:00'}`],
        ["Hourly Rate", `INR ${selectedEmp.salary || 0}`],
        ["Total Days Present", presentDays.toString()],
        ["Total Calculated Salary", `INR ${calculatedSalary.toFixed(2)}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.setFontSize(14);
    doc.text("Attendance Breakdown", 14, doc.lastAutoTable.finalY + 15);
    const attendanceBody = currentMonthRecords.map(record => [
      new Date(record.date).toLocaleDateString(),
      record.punchIn?.time ? new Date(record.punchIn.time).toLocaleTimeString() : '--:--',
      record.punchOut?.time ? new Date(record.punchOut.time).toLocaleTimeString() : '--:--',
      record.status
    ]);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 20,
      head: [["Date", "Punch In", "Punch Out", "Status"]],
      body: attendanceBody,
      theme: 'striped',
      headStyles: { fillColor: [100, 100, 100] }
    });
    doc.save(`Payslip_${selectedEmp.employeeId}_${new Date().toLocaleString('default', { month: 'short', year: 'numeric' })}.pdf`);
  };

  const getPhotoUrl = (photo) => {
    if (!photo) return null;
    return photo;
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col px-4 md:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0 mt-4 md:mt-0">
        <h1 className="text-lg md:text-2xl font-bold text-primary">
          {selectedEmployeeId ? 'Employee Attendance History' : 'Select Employee to View Attendance'}
        </h1>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {selectedEmployeeId ? (
            <>
              <input type="month" className="input-field text-sm py-1.5 flex-1 sm:flex-none" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
              <button onClick={() => setSelectedEmployeeId('')} className="text-gray-500 hover:text-primary font-medium text-sm md:text-base whitespace-nowrap">
                &larr; Back to Directory
              </button>
            </>
          ) : null}
        </div>
      </div>

      {!selectedEmployeeId ? (
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col flex-1 overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          <div className="flex flex-col md:flex-row gap-4 p-5 md:p-6 border-b border-gray-100 bg-gray-50/30">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search employees by name or ID..."
                className="input-field pl-9 w-full text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative md:w-64">
              <Filter className="absolute left-3 top-3.5 text-gray-400" size={16} />
              <select
                className="input-field pl-9 w-full text-sm appearance-none"
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
              >
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto flex-1">
            <div className="hidden md:block">
            <table className="w-full min-w-[800px] text-left">
              <thead>
                <tr className="border-b-2 text-sm text-gray-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 pl-6 pr-4">Employee</th>
                  <th className="pb-3 pr-4 text-center">Dept</th>
                  <th className="pb-3 pr-4 text-center">Salary</th>
                  <th className="pb-3 pr-4 text-center">Status</th>
                  <th className="pb-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => (
                  <tr key={emp._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-4 pl-6 pr-4">
                      <div className="flex flex-col font-bold text-gray-700">
                        <span className="flex items-center gap-2">
                          {emp.name} 
                          {emp.role === 'Admin' && <span className="w-2.5 h-2.5 rounded-full bg-green-500" title="Admin"></span>}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">{emp.employeeId}</span>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-center text-sm font-medium text-gray-600">{emp.department || 'General'}</td>
                    <td className="py-4 pr-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-gray-700">₹{emp.salary || 0}/hr</span>
                        <span className={`px-2 py-0.5 mt-1 rounded text-[10px] uppercase font-bold ${emp.salaryType === 'Weekly' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{emp.salaryType || 'Monthly'}</span>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setManageRecordEmployeeId(emp._id);
                          setManageRecordAction('Present');
                          setIsManageRecordModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 mx-auto"
                      >
                        <Pencil size={12} /> Update Status
                      </button>
                    </td>
                    <td className="py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setSelectedEmployeeId(emp._id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-primary hover:bg-blue-100 rounded-lg transition-colors font-bold text-sm"
                        >
                          <Calendar size={14} /> View Attendance
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
                    <div className="flex flex-col">
                      <span className="flex items-center gap-2 font-bold text-gray-800 text-lg">
                        {emp.name}
                        {emp.role === 'Admin' && <span className="w-2.5 h-2.5 rounded-full bg-green-500" title="Admin"></span>}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">{emp.employeeId}</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-md tracking-wider uppercase">{emp.department || 'General'}</span>
                  </div>
                  
                  <div className="bg-gray-50/80 p-4 rounded-xl flex items-center justify-between border border-gray-100/50">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Salary Details</span>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-gray-800">₹{emp.salary || 0}/hr</span>
                      <span className={`px-2 py-0.5 mt-1 rounded border text-[9px] uppercase font-bold ${emp.salaryType === 'Weekly' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                        {emp.salaryType || 'Monthly'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setManageRecordEmployeeId(emp._id);
                        setManageRecordAction('Present');
                        setIsManageRecordModalOpen(true);
                      }}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 w-full"
                    >
                      <Pencil size={14} /> Update Status
                    </button>
                    <button
                      onClick={() => setSelectedEmployeeId(emp._id)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-primary hover:bg-blue-100 rounded-lg transition-colors font-bold text-sm w-full"
                    >
                      <Calendar size={14} /> View Attendance
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {filteredEmployees.length === 0 && <p className="text-center text-sm text-gray-500 py-12">No employees found matching filters.</p>}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <div className="card flex justify-between items-center py-4 px-6 border-0 shadow-sm border-l-4 border-l-primary shrink-0">
            <div className="flex flex-col">
              <h2 className="font-bold text-xl text-gray-800">{selectedEmp?.name} <span className="text-sm font-medium text-gray-500">({selectedEmp?.employeeId})</span></h2>
              <div className="flex gap-4 mt-2 text-sm text-gray-600">
                <span><strong>Dept:</strong> {selectedEmp?.department || 'General'}</span>
                <span><strong>Days Present:</strong> {presentDays}</span>
                <span className="text-green-600 font-bold"><strong>Total Salary:</strong> ₹{calculatedSalary.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={generatePayslip} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors font-bold text-sm shadow-sm">
                <Download size={16} /> Payslip
              </button>
            </div>
          </div>

          <div className="card flex-1 overflow-hidden flex flex-col border-0 shadow-sm p-0">
            <div className="overflow-y-auto flex-1 p-6">
              {isLoading ? (
                <div className="flex justify-center items-center h-full text-gray-400">Loading records...</div>
              ) : attendanceRecords.length === 0 ? (
                <div className="flex justify-center items-center h-full text-gray-400 flex-col gap-2">
                  <Search size={32} className="opacity-20" />
                  <p>No attendance records found.</p>
                </div>
              ) : (
                <>
                <div className="hidden md:block">
                <table className="w-full min-w-[800px] text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 text-sm text-gray-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 pr-4 text-center">Images (In/Out)</th>
                      <th className="pb-3 pr-4">Punch In</th>
                      <th className="pb-3 pr-4">Punch Out</th>
                      <th className="pb-3 pr-4 text-center">Status</th>
                      <th className="pb-3 pr-4">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentMonthRecords.map(record => {
                      // Determine the best photo to show (prefer attendanceImage, fallback to photo)
                      const displayPhoto = record.punchIn?.attendanceImage || record.punchIn?.photo;
                      
                      return (
                        <tr key={record._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                          <td className="py-4 pr-4 font-bold text-gray-700">{new Date(record.date).toLocaleDateString()}</td>
                          <td className="py-4 pr-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {displayPhoto ? (
                                <img
                                  src={getPhotoUrl(displayPhoto)}
                                  alt="Punch In"
                                  onClick={() => setPreviewImage(getPhotoUrl(displayPhoto))}
                                  className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-soft cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                  title="Punch In: Click to view full proof"
                                />
                              ) : (
                                <span className="text-gray-300 text-[10px] font-medium bg-gray-100 px-1 py-0.5 rounded">No IN Photo</span>
                              )}
                              
                              {record.punchOut?.time && (
                                (record.punchOut?.attendanceImage || record.punchOut?.photo) ? (
                                  <img
                                    src={getPhotoUrl(record.punchOut.attendanceImage || record.punchOut.photo)}
                                    alt="Punch Out"
                                    onClick={() => setPreviewImage(getPhotoUrl(record.punchOut.attendanceImage || record.punchOut.photo))}
                                    className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-soft cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                    title="Punch Out: Click to view full proof"
                                  />
                                ) : (
                                  <span className="text-gray-300 text-[10px] font-medium bg-gray-100 px-1 py-0.5 rounded">No OUT Photo</span>
                                )
                              )}
                            </div>
                          </td>
                          <td className="py-4 pr-4 text-sm font-medium text-gray-600">
                            {record.punchIn?.time ? new Date(record.punchIn.time).toLocaleTimeString() : '--:--'}
                          </td>
                          <td className="py-4 pr-4 text-sm font-medium text-gray-600">
                            {record.punchOut?.time ? new Date(record.punchOut.time).toLocaleTimeString() : '--:--'}
                          </td>
                          <td className="py-4 pr-4 text-center">
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${record.status === 'Present' ? 'bg-green-100 text-green-700' : record.status === 'Casual Leave' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'}`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="py-4 pr-4">
                            <div className="flex flex-col gap-3">
                              {record.punchIn?.location?.latitude ? (
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">IN Location</span>
                                  <span className="text-xs text-gray-500 max-w-[200px] truncate" title={record.punchIn.location.address}>
                                    {record.punchIn.location.address || 'Address Not Available'}
                                  </span>
                                  <a
                                    href={`https://www.google.com/maps?q=${record.punchIn.location.latitude},${record.punchIn.location.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-primary hover:text-accent font-bold text-xs"
                                  >
                                    <MapPin size={12} /> Open in Maps
                                  </a>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">IN Location</span>
                                  <span className="text-sm text-gray-300 font-medium">No GPS</span>
                                </div>
                              )}

                              {record.punchOut?.time && (
                                record.punchOut?.location?.latitude ? (
                                  <div className="flex flex-col gap-1 border-t border-gray-100 pt-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">OUT Location</span>
                                    <span className="text-xs text-gray-500 max-w-[200px] truncate" title={record.punchOut.location.address}>
                                      {record.punchOut.location.address || 'Address Not Available'}
                                    </span>
                                    <a
                                      href={`https://www.google.com/maps?q=${record.punchOut.location.latitude},${record.punchOut.location.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-primary hover:text-accent font-bold text-xs"
                                    >
                                      <MapPin size={12} /> Open in Maps
                                    </a>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1 border-t border-gray-100 pt-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">OUT Location</span>
                                    <span className="text-sm text-gray-300 font-medium">No GPS</span>
                                  </div>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>

                {/* Mobile Card View for Attendance */}
                <div className="md:hidden flex flex-col gap-4">
                  {currentMonthRecords.map(record => {
                    const displayPhoto = record.punchIn?.attendanceImage || record.punchIn?.photo;
                    return (
                      <div key={record._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                          <span className="font-bold text-gray-800 text-lg">{new Date(record.date).toLocaleDateString()}</span>
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${record.status === 'Present' ? 'bg-green-100 text-green-700' : record.status === 'Casual Leave' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'}`}>
                            {record.status}
                          </span>
                        </div>

                        <div className="flex flex-col items-center gap-4 bg-gray-50 rounded-xl p-4">
                          <div className="flex justify-center gap-6 w-full">
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">IN Image</span>
                              {displayPhoto ? (
                                <img
                                  src={getPhotoUrl(displayPhoto)}
                                  alt="Punch In"
                                  onClick={() => setPreviewImage(getPhotoUrl(displayPhoto))}
                                  className="w-16 h-16 rounded-2xl object-cover border-4 border-white shadow-soft cursor-pointer"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-400 border-4 border-white shadow-sm text-center">
                                  No Photo
                                </div>
                              )}
                            </div>
                            
                            {record.punchOut?.time && (
                              <div className="flex flex-col items-center gap-2">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">OUT Image</span>
                                {(record.punchOut?.attendanceImage || record.punchOut?.photo) ? (
                                  <img
                                    src={getPhotoUrl(record.punchOut.attendanceImage || record.punchOut.photo)}
                                    alt="Punch Out"
                                    onClick={() => setPreviewImage(getPhotoUrl(record.punchOut.attendanceImage || record.punchOut.photo))}
                                    className="w-16 h-16 rounded-2xl object-cover border-4 border-white shadow-soft cursor-pointer"
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-400 border-4 border-white shadow-sm text-center">
                                    No Photo
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex w-full justify-between items-center bg-white p-3 rounded-lg border border-gray-100">
                             <div className="flex flex-col items-center flex-1 border-r border-gray-100">
                               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Punch In</span>
                               <span className="text-sm font-bold text-gray-800">
                                 {record.punchIn?.time ? new Date(record.punchIn.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                               </span>
                             </div>
                             <div className="flex flex-col items-center flex-1">
                               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Punch Out</span>
                               <span className="text-sm font-bold text-gray-800">
                                 {record.punchOut?.time ? new Date(record.punchOut.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                               </span>
                             </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100 flex flex-col gap-4">
                          {record.punchIn?.location?.latitude ? (
                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">IN Location</span>
                              <span className="text-xs text-gray-500 line-clamp-2 text-center">
                                {record.punchIn.location.address || 'Address Not Available'}
                              </span>
                              <a
                                href={`https://www.google.com/maps?q=${record.punchIn.location.latitude},${record.punchIn.location.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-bold text-xs transition-colors"
                              >
                                <MapPin size={14} /> Open in Maps
                              </a>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">IN Location</span>
                              <span className="text-xs text-gray-400 text-center">No GPS Available</span>
                            </div>
                          )}

                          {record.punchOut?.time && (
                            record.punchOut?.location?.latitude ? (
                              <div className="flex flex-col gap-2 border-t border-gray-100 pt-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">OUT Location</span>
                                <span className="text-xs text-gray-500 line-clamp-2 text-center">
                                  {record.punchOut.location.address || 'Address Not Available'}
                                </span>
                                <a
                                  href={`https://www.google.com/maps?q=${record.punchOut.location.latitude},${record.punchOut.location.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-1.5 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-bold text-xs transition-colors"
                                >
                                  <MapPin size={14} /> Open in Maps
                                </a>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2 border-t border-gray-100 pt-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">OUT Location</span>
                                <span className="text-xs text-gray-400 text-center">No GPS Available</span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal (Professional Proof) */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="fixed top-6 left-6 z-[60] bg-white/20 text-white rounded-full p-3 hover:bg-white/40 transition-colors backdrop-blur-md shadow-lg"
          >
            <X size={24} />
          </button>
          <div className="relative max-w-4xl w-full h-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <img
              src={previewImage}
              alt="Attendance Proof"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            <div className="absolute -bottom-8 left-0 right-0 text-center text-white/70 text-sm font-medium">
              Permanent Attendance Record
            </div>
          </div>
        </div>
      )}



      {/* Manage Record Modal */}
      {isManageRecordModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 relative flex flex-col md:flex-row gap-6">
            <button onClick={() => setIsManageRecordModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
              <X size={20} />
            </button>
            <div className="flex-1 md:border-r border-gray-100 md:pr-6">
              <h3 className="font-bold text-xl mb-4 text-primary">Select Date</h3>
              <input type="date" required className="input-field w-full h-12 text-lg" value={manageRecordData.date} onChange={e => setManageRecordData({ ...manageRecordData, date: e.target.value })} />
              <div className="mt-4 text-sm text-gray-500">
                <p>Choose the date for which you want to mark the attendance status.</p>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-xl mb-4 text-primary">Update Status</h3>
              <div className="flex flex-col gap-3">
                <button type="button" className={`w-full py-3 rounded-lg text-sm font-bold transition-colors border-2 ${manageRecordAction === 'Present' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'}`} onClick={() => setManageRecordAction('Present')}>Mark Full Day (Present)</button>
                <button type="button" className={`w-full py-3 rounded-lg text-sm font-bold transition-colors border-2 ${manageRecordAction === 'Half Day' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'}`} onClick={() => setManageRecordAction('Half Day')}>Mark Half Day</button>
                <button type="button" className={`w-full py-3 rounded-lg text-sm font-bold transition-colors border-2 ${manageRecordAction === 'Leave' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'}`} onClick={() => setManageRecordAction('Leave')}>Mark Leave</button>
                {employees.find(e => e._id === manageRecordEmployeeId)?.salaryType === 'Monthly' && (
                  <button type="button" className={`w-full py-3 rounded-lg text-sm font-bold transition-colors border-2 ${manageRecordAction === 'Casual Leave' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'}`} onClick={() => setManageRecordAction('Casual Leave')}>Mark Casual Leave</button>
                )}
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Note (Optional)</label>
                <input type="text" className="input-field w-full" placeholder="e.g. Manual Update" value={manageRecordData.reason} onChange={e => setManageRecordData({ ...manageRecordData, reason: e.target.value })} />
              </div>
              <button onClick={handleRecordSubmit} disabled={isSubmittingRecord || !manageRecordData.date} className="btn-primary w-full mt-6 flex justify-center items-center gap-2 py-3 shadow-soft">
                {isSubmittingRecord ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendance;
