import React, { useState, useEffect } from 'react';
import { Search, Filter, Phone, MessageCircle, MessageSquare, Mail, MoreHorizontal, CheckCircle2, Eye, X } from 'lucide-react';
import api from '../services/api';

const AdminFollowups = () => {
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // History modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadHistory, setLeadHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  useEffect(() => {
    fetchFollowups();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get('/admin/employees');
      setEmployees(data);
    } catch (err) {
      console.error('Failed to fetch employees', err);
    }
  };

  const fetchFollowups = async () => {
    try {
      const { data } = await api.get('/followups');
      setFollowups(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch follow-ups');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDone = async (id, currentStatus) => {
    if (currentStatus === 'DONE') return; // already done

    // Optimistic UI update
    setFollowups(followups.map(f => f._id === id ? { ...f, status: 'DONE' } : f));
    
    try {
      await api.put(`/followups/${id}/status`, { status: 'DONE' });
    } catch (err) {
      console.error('Failed to mark done', err);
      // Revert if error
      fetchFollowups();
    }
  };

  const openHistory = async (lead) => {
    setSelectedLead(lead);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    setLeadHistory([]);
    try {
      const { data } = await api.get(`/followups/lead/${lead._id}`);
      setLeadHistory(data);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatEngagementDate = (dateString) => {
    const d = new Date(dateString);
    const now = new Date();
    
    // Check if overdue
    const isOverdue = d < now;

    const formattedStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    return { formattedStr, isOverdue };
  };

  const filteredFollowups = followups
    .filter(f => {
      const searchMatch = (f.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (f.leadId?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const empMatch = selectedEmployee 
        ? (f.createdBy?._id === selectedEmployee._id || f.leadId?.employeeId?._id === selectedEmployee._id)
        : true;

      return searchMatch && empMatch;
    })
    .sort((a, b) => {
      const aDone = a.status === 'DONE';
      const bDone = b.status === 'DONE';
      
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;
      
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      
      if (!aDone) {
        return dateA - dateB; // Ascending: oldest/overdue first
      } else {
        return dateB - dateA; // Descending: recently completed first
      }
    });

  const activeCount = followups.filter(f => f.status === 'PENDING').length;

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Top Header / Actions Area */}
      <div className="px-4 md:px-8 py-4 md:py-8 border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6 shrink-0">
        
        <div>
          <div className="flex items-center gap-4 mb-1">
            <h1 className="text-2xl font-extrabold text-[#1e293b] tracking-tight">Lead Engagement</h1>
            <span className="px-2 py-0.5 rounded-md bg-pink-100 text-pink-600 text-[10px] font-bold uppercase tracking-wider">
              {activeCount} ACTIVE
            </span>
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SMART FOLLOW-UP SYSTEM</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search leads, notes..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
            />
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              {selectedEmployee ? selectedEmployee.name : 'All Employees'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>

            {showEmployeeDropdown && (
              <div className="absolute top-full right-0 md:left-0 md:right-auto mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="Search employee..."
                      value={employeeSearchTerm}
                      onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto p-2">
                  <button
                    onClick={() => { setSelectedEmployee(null); setShowEmployeeDropdown(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${!selectedEmployee ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    All Employees
                  </button>
                  {employees
                    .filter(emp => emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase()))
                    .map(emp => (
                      <button
                        key={emp._id}
                        onClick={() => { setSelectedEmployee(emp); setShowEmployeeDropdown(false); setEmployeeSearchTerm(''); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium mt-1 ${selectedEmployee?._id === emp._id ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        {emp.name}
                      </button>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="m-4 md:m-8 mb-0 bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">
          {error}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 md:p-0 bg-gray-50/30 md:bg-transparent">
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filteredFollowups.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No follow-ups found.</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <table className="w-full min-w-max text-left border-collapse">
                <thead className="bg-white sticky top-0 z-10 border-b border-gray-100 shadow-sm">
                  <tr>
                    <th className="px-4 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">LEAD INFO</th>
                    <th className="px-4 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">COMMUNICATION</th>
                    <th className="px-4 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">STATUS / SOURCE</th>
                    <th className="px-4 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">ENGAGEMENT</th>
                    <th className="px-4 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50/50 text-sm bg-white">
                  {filteredFollowups.map((followup) => {
                    const lead = followup.leadId || {};
                    const { formattedStr, isOverdue } = formatEngagementDate(followup.date);
                    const isDone = followup.status === 'DONE';

                    return (
                      <tr key={followup._id} className="hover:bg-gray-50/30 transition-colors group">
                        <td className="px-4 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-sm font-bold text-orange-600">
                              {lead.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <span className="font-bold text-[#1e293b] flex items-center gap-2">
                                {lead.name || 'Unknown Lead'}
                                {lead.brand === 'Bosch' && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Bosch Lead"></span>}
                              </span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{lead.serviceInterest && lead.serviceInterest !== '-' ? lead.serviceInterest : ''}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <a href={`tel:${lead.phone}`} className="w-8 h-8 rounded bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-100 transition-colors" title="Call">
                              <Phone size={14} fill="currentColor" />
                            </a>
                            <a href={`https://wa.me/${lead.phone}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded bg-emerald-50 text-emerald-500 flex items-center justify-center hover:bg-emerald-100 transition-colors" title="WhatsApp">
                              <MessageCircle size={14} fill="currentColor" />
                            </a>
                            <a href={`sms:${lead.phone}`} className="w-8 h-8 rounded bg-purple-50 text-purple-500 flex items-center justify-center hover:bg-purple-100 transition-colors" title="SMS Message">
                              <MessageSquare size={14} fill="currentColor" />
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-5 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
                              {lead.status || 'NEW'}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              SOURCE: {lead.source || 'WEBSITE'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                {formattedStr}
                              </span>
                              {!isDone && isOverdue && (
                                <span className="bg-rose-500 text-white text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider">OVERDUE</span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-gray-500 italic truncate max-w-[250px]">
                              {followup.description}
                            </p>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase mt-0.5">
                              Created by: <span className="text-primary">{followup.creatorName || 'Unknown'}</span>
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isDone ? (
                              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-extrabold tracking-wider uppercase border border-emerald-100">
                                <CheckCircle2 size={12} /> RESOLVED
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleMarkDone(followup._id, followup.status)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors text-[10px] font-extrabold tracking-wider uppercase border border-gray-200"
                              >
                                <CheckCircle2 size={12} /> MARK DONE
                              </button>
                            )}
                            <button 
                              onClick={() => openHistory(lead)}
                              title="View History"
                              className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 hover:bg-indigo-100 flex items-center justify-center transition-colors"
                            >
                              <Eye size={14} />
                            </button>
                            <button className="text-gray-300 hover:text-gray-500 transition-colors p-1">
                              <MoreHorizontal size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col gap-4">
              {filteredFollowups.map((followup) => {
                const lead = followup.leadId || {};
                const { formattedStr, isOverdue } = formatEngagementDate(followup.date);
                const isDone = followup.status === 'DONE';

                return (
                  <div key={followup._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-4">
                    {/* Top Row: Lead Info & Status */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-sm font-bold text-orange-600 shrink-0">
                          {lead.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <span className="font-bold text-[#1e293b] flex items-center gap-2">
                            {lead.name || 'Unknown Lead'}
                            {lead.brand === 'Bosch' && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Bosch Lead"></span>}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{lead.serviceInterest && lead.serviceInterest !== '-' ? lead.serviceInterest : ''}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isDone ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                        {isDone ? 'RESOLVED' : (lead.status || 'NEW')}
                      </span>
                    </div>

                    {/* Engagement / Description */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                           {formattedStr}
                        </span>
                        {!isDone && isOverdue && (
                          <span className="bg-rose-500 text-white text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider">OVERDUE</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-600 italic">
                        {followup.description}
                      </p>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase mt-1.5">
                        Created by: <span className="text-primary">{followup.creatorName || 'Unknown'}</span>
                      </p>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-1">
                      {/* Communication Icons */}
                      <div className="flex items-center gap-2">
                        <a href={`tel:${lead.phone}`} className="w-8 h-8 rounded bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-100 transition-colors" title="Call">
                          <Phone size={14} fill="currentColor" />
                        </a>
                        <a href={`https://wa.me/${lead.phone}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded bg-emerald-50 text-emerald-500 flex items-center justify-center hover:bg-emerald-100 transition-colors" title="WhatsApp">
                          <MessageCircle size={14} fill="currentColor" />
                        </a>
                        <a href={`sms:${lead.phone}`} className="w-8 h-8 rounded bg-purple-50 text-purple-500 flex items-center justify-center hover:bg-purple-100 transition-colors" title="SMS Message">
                          <MessageSquare size={14} fill="currentColor" />
                        </a>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => openHistory(lead)}
                          title="View History"
                          className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 hover:bg-indigo-100 flex items-center justify-center transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                        
                        {!isDone && (
                          <button 
                            onClick={() => handleMarkDone(followup._id, followup.status)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors text-[10px] font-extrabold tracking-wider uppercase border border-gray-200"
                          >
                            <CheckCircle2 size={12} /> DONE
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-[#1e293b]">Lead History</h3>
                <p className="text-xs font-medium text-gray-500">{selectedLead?.name}</p>
              </div>
              <button 
                onClick={() => setHistoryModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-5">
              {historyLoading ? (
                <div className="text-center py-8 text-gray-500 text-sm">Loading history...</div>
              ) : leadHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">No past history found.</div>
              ) : (
                <div className="relative border-l-2 border-indigo-100 ml-3 pl-5 space-y-6 pb-2">
                  {leadHistory.map((item, index) => {
                    const { formattedStr } = formatEngagementDate(item.date);
                    const isDone = item.status === 'DONE';
                    
                    return (
                      <div key={item._id} className="relative">
                        {/* Timeline dot */}
                        <div className={`absolute -left-[27px] top-1 w-4 h-4 rounded-full border-2 border-white ${isDone ? 'bg-emerald-400' : 'bg-indigo-400'}`}></div>
                        
                        <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-gray-500">{formattedStr}</span>
                            <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${isDone ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                              {item.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminFollowups;
