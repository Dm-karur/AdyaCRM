import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Search, Filter, SlidersHorizontal, Plus, Eye, Edit2, Phone, Mail, Trash2 } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import api from '../services/api';
import CustomerEntryDrawer from '../components/CustomerEntryDrawer';
import CustomerDetailsDrawer from '../components/CustomerDetailsDrawer';
import toast from 'react-hot-toast';
import { useConfirm } from '../context/ConfirmContext';

const AdminCustomerEntries = () => {
  const confirm = useConfirm();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const { user } = useContext(AuthContext);
  const outletContext = useOutletContext();
  const globalSearch = outletContext?.globalSearch || '';

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

  const handleSuccess = (msg) => {
    // Optionally show a toast, then refresh data
    fetchEntries();
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

  const filteredEntries = entries
    .filter(entry => {
      // Exclude qualified clients from Leads tab
      if (entry.status === 'QUALIFIED' || entry.status === 'QUALIFIED LEAD') {
        return false;
      }
      const searchLower = (searchTerm || globalSearch).toLowerCase();
      return entry.name?.toLowerCase().includes(searchLower) ||
             entry.company?.toLowerCase().includes(searchLower) ||
             entry.email?.toLowerCase().includes(searchLower) ||
             entry.phone?.toLowerCase().includes(searchLower);
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'HOT': return <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>HOT</span>; 
      case 'WARM': return <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>WARM</span>;
      case 'COLD': return <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>COLD</span>;
      default: return <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700"><span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>{priority}</span>;
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="flex flex-col h-full bg-white">
      
      {/* Top Header / Actions Area */}
      <div className="px-4 md:px-8 py-4 md:py-6 border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6 shrink-0">
        
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-normal text-gray-800">Leads</h1>
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

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors text-gray-500">
            <SlidersHorizontal size={18} />
          </button>
          <button onClick={() => setIsDrawerOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white rounded-xl font-bold shadow-md shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5 text-sm">
            <Plus size={18} /> Add Lead
          </button>
        </div>
      </div>

      {error && (
        <div className="m-8 mb-0 bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">
          {error}
        </div>
      )}


      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 md:p-0 bg-gray-50/30 md:bg-transparent">
        {/* Desktop Table */}
        <table className="hidden md:table w-full min-w-max text-left border-collapse bg-white">
          <thead className="bg-white sticky top-0 z-10 border-b border-gray-100">
            <tr>
              <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Company</th>
              <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email</th>
              <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phone</th>
              <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Source</th>
              <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Product</th>
              <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Priority</th>
              <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {filteredEntries.map((entry) => (
              <tr key={entry._id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                      {entry.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="font-medium text-gray-800 flex items-center gap-2">
                      {entry.name}
                      {entry.brand === 'Bosch' && <span className="w-2 h-2 rounded-full bg-blue-500" title="Bosch Lead"></span>}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-gray-500">
                  {entry.company}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-gray-500">
                  {entry.email}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-gray-600 font-medium flex items-center gap-2">
                  {entry.phone} <Phone size={12} className="text-primary" />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="px-2.5 py-1 rounded border border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wide bg-gray-50">
                    {entry.status}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-gray-400 text-xs font-bold uppercase tracking-wider">
                  {entry.source}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-gray-600 text-xs font-semibold">
                  {entry.serviceInterest !== '-' ? entry.serviceInterest : 'N/A'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {getPriorityBadge(entry.priority)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-3 opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setSelectedLead(entry);
                        setIsDetailsDrawerOpen(true);
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Eye size={16} />
                    </button>
                    <button className="text-primary hover:text-primary-dark transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteLead(e, entry._id)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                      title="Delete Lead"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredEntries.length === 0 && (
              <tr>
                <td colSpan="8" className="px-8 py-12 text-center text-gray-500">
                  No leads found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Mobile Cards */}
        <div className="md:hidden flex flex-col gap-4">
          {filteredEntries.map((entry) => (
            <div key={entry._id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 relative">
              <div className="absolute top-4 right-4">
                {getPriorityBadge(entry.priority)}
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 shadow-sm">
                  {entry.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    {entry.name}
                    {entry.brand === 'Bosch' && <span className="w-2 h-2 rounded-full bg-blue-500" title="Bosch Lead"></span>}
                  </h3>
                  <p className="text-xs font-medium text-gray-400">{entry.company || 'No Company'}</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 text-sm text-gray-600 bg-gray-50/50 p-3 rounded-xl border border-gray-50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5"><Mail size={14} className="text-gray-400"/> <span className="truncate max-w-[150px]">{entry.email || 'N/A'}</span></span>
                  <a href={`tel:${entry.phone}`} className="flex items-center gap-1.5 text-primary font-medium bg-primary/5 px-2 py-1 rounded-lg">
                    <Phone size={14}/> {entry.phone}
                  </a>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1 pt-2 border-t border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Product:</span>
                  <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{entry.serviceInterest !== '-' ? entry.serviceInterest : 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-1 pt-3 border-t border-gray-100">
                <span className="px-2.5 py-1 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50">
                  {entry.status}
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => handleDeleteLead(e, entry._id)}
                    className="text-red-500 font-bold text-sm bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedLead(entry);
                      setIsDetailsDrawerOpen(true);
                    }}
                    className="text-primary font-bold text-sm bg-primary/5 hover:bg-primary/10 px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Eye size={14} /> View
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredEntries.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
              No leads found.
            </div>
          )}
        </div>
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
        onLeadUpdated={(updatedLead) => {
          setSelectedLead(updatedLead);
          fetchEntries();
        }}
      />
    </div>
  );
};

export default AdminCustomerEntries;
