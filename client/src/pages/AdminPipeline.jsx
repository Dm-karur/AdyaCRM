import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Phone, CalendarPlus, X, Trash2 } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import CustomerEntryDrawer from '../components/CustomerEntryDrawer';
import CustomerDetailsDrawer from '../components/CustomerDetailsDrawer';
import toast from 'react-hot-toast';
import { useConfirm } from '../context/ConfirmContext';

const COLUMNS = [
  { id: 'NEW LEAD', title: 'NEW LEADS' },
  { id: 'CONTACTED LEAD', title: 'CONTACTED' },
  { id: 'QUALIFIED LEAD', title: 'QUALIFIED' },
  { id: 'LOST LEAD', title: 'LOST' }
];

const AdminPipeline = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [monthFilter, setMonthFilter] = useState('ALL');
  const pendingDropRef = React.useRef(null);
  const { user } = React.useContext(AuthContext);
  
  const confirm = useConfirm();

  // Follow-up modal state
  const [followupModalLead, setFollowupModalLead] = useState(null);
  const [followupDate, setFollowupDate] = useState('');
  const [followupDesc, setFollowupDesc] = useState('');
  const [isSubmittingFollowup, setIsSubmittingFollowup] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const endpoint = user?.role === 'Admin' ? '/customer-entries/all' : '/customer-entries';
      const { data } = await api.get(endpoint);
      setEntries(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch customer entries');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, entryId) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', entryId);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    
    // Instead of updating state immediately (which unmounts the dragged element 
    // and causes the browser to freeze), we store the target status.
    // The actual state update will run in onDragEnd.
    pendingDropRef.current = targetStatus;
  };

  const updateLeadStatus = async (entryId, targetStatus) => {
    // Optimistic update
    const previousEntries = [...entries];
    const entryToUpdate = entries.find(e => e._id === entryId);
    
    if (!entryToUpdate || entryToUpdate.status === targetStatus) return;

    setEntries(entries.map(entry => 
      entry._id === entryId ? { ...entry, status: targetStatus } : entry
    ));

    try {
      await api.put(`/customer-entries/${entryId}/status`, { status: targetStatus });
    } catch (err) {
      console.error('Failed to update status', err);
      // Revert on failure
      setEntries(previousEntries);
    }
  };

  const submitFollowup = async (e) => {
    e.preventDefault();
    if (!followupDate || !followupDesc) return;
    setIsSubmittingFollowup(true);
    try {
      await api.post('/followups', {
        leadId: followupModalLead._id,
        date: followupDate,
        description: followupDesc
      });
      setFollowupModalLead(null);
      setFollowupDate('');
      setFollowupDesc('');
      toast.success('Follow-up added successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to add follow-up.');
    } finally {
      setIsSubmittingFollowup(false);
    }
  };

  const handleDeleteLead = async (e, leadId) => {
    e.stopPropagation();
    if (await confirm('Are you sure want to delete this lead?')) {
      try {
        await api.delete(`/customer-entries/${leadId}`);
        toast.success('Lead deleted successfully');
        fetchEntries(); // Refresh list after deletion
      } catch (err) {
        console.error('Failed to delete lead', err);
        toast.error('Failed to delete lead.');
      }
    }
  };


  const getEntryDate = (entry) => {
    if (entry.createdAt) {
      const d = new Date(entry.createdAt);
      if (!isNaN(d.getTime())) return d;
    }
    if (entry._id) {
      const timestamp = parseInt(entry._id.toString().substring(0, 8), 16) * 1000;
      if (!isNaN(timestamp)) {
        return new Date(timestamp);
      }
    }
    return null;
  };

  const filteredEntries = entries.filter(entry => {
    const searchMatch = entry.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        entry.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!searchMatch) return false;

    if (monthFilter !== 'ALL') {
      const date = getEntryDate(entry);
      if (!date) return false;

      const now = new Date();
      if (monthFilter === 'THIS_MONTH') {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }
      if (monthFilter === 'LAST_MONTH') {
        const lastMonth = new Date();
        lastMonth.setMonth(now.getMonth() - 1);
        return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
      }
      
      const timeLimit = new Date();
      if (monthFilter === '3M') timeLimit.setMonth(now.getMonth() - 3);
      if (monthFilter === '6M') timeLimit.setMonth(now.getMonth() - 6);
      if (monthFilter === '1Y') timeLimit.setFullYear(now.getFullYear() - 1);
      
      return date >= timeLimit;
    }
    return true;
  });

  const getLeadsByStatus = (statusId) => {
    return filteredEntries.filter(entry => {
      // Map standard frontend titles to backend status values if needed
      // Actually backend status is usually 'NEW LEAD', 'CONTACTED LEAD', 'QUALIFIED LEAD'
      if (statusId === 'NEW LEAD') return entry.status === 'NEW LEAD' || entry.status === 'NEW';
      if (statusId === 'CONTACTED LEAD') return entry.status === 'CONTACTED LEAD' || entry.status === 'CONTACTED';
      if (statusId === 'QUALIFIED LEAD') return entry.status === 'QUALIFIED LEAD' || entry.status === 'QUALIFIED';
      if (statusId === 'LOST LEAD') return entry.status === 'LOST LEAD' || entry.status === 'LOST';
      return false;
    });
  };

  const handleSuccess = () => {
    fetchEntries();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HOT': return 'text-red-500'; 
      case 'WARM': return 'text-orange-500';
      case 'COLD': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/30">
      
      {/* Top Header / Actions Area */}
      <div className="px-4 md:px-8 py-4 md:py-6 bg-white border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6 shrink-0">
        
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-normal text-gray-800">Pipeline</h1>
          
          <div className="hidden lg:flex items-center gap-2">
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-600 uppercase border border-gray-200 rounded-md hover:bg-gray-50 transition-colors bg-white outline-none cursor-pointer"
            >
              <option value="ALL">All Time</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="3M">Last 3 Months</option>
              <option value="6M">Last 6 Months</option>
              <option value="1Y">Last 1 Year</option>
            </select>
          </div>
        </div>

        <div className="flex-1 max-w-lg relative hidden md:block">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
             <Search size={16} className="text-gray-400" />
           </div>
           <input 
             type="text" 
             placeholder="Search Leads database..." 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
           />
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors text-gray-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </button>
          <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5">
            <Plus size={16} /> Add Lead
          </button>
        </div>
      </div>

      {/* Board Area */}
      <div className="flex-1 overflow-y-auto md:overflow-y-hidden md:overflow-x-auto p-4 md:p-8">
        {loading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">{error}</div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6 md:gap-4 h-auto md:h-full w-full items-stretch">
            {COLUMNS.map(column => {
              const columnLeads = getLeadsByStatus(column.id);
              
              return (
                <div 
                  key={column.id}
                  className="w-full md:flex-1 md:min-w-[220px] md:max-w-[320px] bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col md:max-h-full"
                  onDragEnter={(e) => e.preventDefault()}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                  {/* Column Header */}
                  <div className="p-4 border-b border-gray-50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">{column.title}</h3>
                      <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                        {columnLeads.length}
                      </span>
                    </div>
                  </div>

                  {/* Column Body */}
                  <div className="p-4 flex-1 overflow-y-auto space-y-4 min-h-[200px]">
                    {columnLeads.length === 0 ? (
                      <div className="h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Drop Here</span>
                      </div>
                    ) : (
                      columnLeads.map(lead => (
                        <div
                          key={lead._id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, lead._id)}
                          onDragEnd={(e) => {
                             e.preventDefault();
                             // Execute the state update here AFTER the drag has cleanly finished
                             if (pendingDropRef.current) {
                               updateLeadStatus(lead._id, pendingDropRef.current);
                               pendingDropRef.current = null;
                             }
                          }}
                          className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                            column.id === 'NEW LEAD' ? 'bg-emerald-50/30 border-emerald-100' : 'bg-gray-50/50 border-gray-100'
                          }`}
                          style={{ cursor: 'grab' }}
                        >
                          <div 
                            className="flex justify-between items-start mb-3"
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsDetailsDrawerOpen(true);
                            }}
                          >
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${getPriorityColor(lead.priority)}`}>
                              {lead.priority}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                {lead.source}
                              </span>
                              <button
                                onClick={(e) => handleDeleteLead(e, lead._id)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete Lead"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          
                          <div 
                            className="flex items-center gap-3 mb-4 cursor-pointer"
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsDetailsDrawerOpen(true);
                            }}
                          >
                            <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shadow-sm">
                              {lead.name?.charAt(0).toUpperCase()}
                            </div>
                            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                              {lead.name}
                              {lead.brand === 'Bosch' && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Bosch Lead"></span>}
                            </h4>
                          </div>

                          <div className="flex items-center justify-between text-xs mt-4">
                            <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 text-emerald-600 font-medium hover:text-emerald-700 transition-colors">
                              <Phone size={12} /> {lead.phone}
                            </a>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFollowupModalLead(lead);
                              }}
                              className="flex items-center gap-1 text-gray-400 hover:text-primary transition-colors text-[8px] font-bold tracking-wider ml-auto"
                            >
                              ADD FOLLOWUP <CalendarPlus size={10} />
                            </button>
                          </div>

                          {/* Move Dropdown (Mobile & Desktop Fallback) */}
                          <div 
                            className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Move:</span>
                            <select
                              value={column.id}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateLeadStatus(lead._id, e.target.value);
                              }}
                              className="text-[10px] font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
                            >
                              {COLUMNS.map(col => (
                                <option key={col.id} value={col.id}>{col.title}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CustomerEntryDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onSuccess={handleSuccess}
        onViewClient={(client) => {
          setIsDrawerOpen(false);
          setSelectedLead(client);
          setIsDetailsDrawerOpen(true);
        }}
      />
      <CustomerDetailsDrawer
        isOpen={isDetailsDrawerOpen}
        onClose={() => setIsDetailsDrawerOpen(false)}
        lead={selectedLead}
      />

      {/* Follow-up Modal */}
      {followupModalLead && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Add Follow-up</h3>
                <p className="text-sm text-gray-500 mt-1">For {followupModalLead.name}</p>
              </div>
              <button onClick={() => setFollowupModalLead(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitFollowup} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Date & Time <span className="text-red-500">*</span></label>
                <input 
                  type="datetime-local" 
                  required
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description / Reason <span className="text-red-500">*</span></label>
                <textarea 
                  required
                  placeholder="Why are they contacting?"
                  value={followupDesc}
                  onChange={(e) => setFollowupDesc(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm placeholder:text-gray-400 resize-none h-24"
                ></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setFollowupModalLead(null)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmittingFollowup} className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-dark transition-colors disabled:opacity-50">
                  {isSubmittingFollowup ? 'Saving...' : 'Save Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPipeline;
