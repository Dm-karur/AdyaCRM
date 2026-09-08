import React, { useState, useEffect } from 'react';
import { Search, Filter, SlidersHorizontal, Plus, Eye, Edit2, Phone, Mail, Trash2 } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import CustomerEntryDrawer from '../components/CustomerEntryDrawer';
import CustomerDetailsDrawer from '../components/CustomerDetailsDrawer';

const AdminClients = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const outletContext = useOutletContext();
  const globalSearch = outletContext?.globalSearch || '';
  const { user } = React.useContext(AuthContext);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const endpoint = user?.role === 'Admin' ? '/customer-entries/all' : '/customer-entries';
      const { data } = await api.get(endpoint);
      // Only keep qualified clients
      const clients = data.filter(entry => 
        entry.status === 'QUALIFIED' || entry.status === 'QUALIFIED LEAD'
      );
      setEntries(clients);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (msg) => {
    fetchEntries();
  };

  const filteredEntries = entries.filter(entry => {
    const searchLower = (searchTerm || globalSearch).toLowerCase();
    return entry.name?.toLowerCase().includes(searchLower) ||
           entry.company?.toLowerCase().includes(searchLower) ||
           entry.email?.toLowerCase().includes(searchLower) ||
           entry.phone?.toLowerCase().includes(searchLower);
  });

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
          <h1 className="text-2xl font-normal text-gray-800">Clients</h1>
        </div>

        <div className="flex-1 max-w-lg relative hidden md:block">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
             <Search size={16} className="text-gray-400" />
           </div>
           <input 
             type="text" 
             placeholder="Search Clients database..." 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
           />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={() => setIsDrawerOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white rounded-xl font-bold shadow-md shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5 text-sm">
            <Plus size={18} /> Add Client
          </button>
        </div>
      </div>

      {error && (
        <div className="m-8 mb-0 bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">
          {error}
        </div>
      )}


      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-gray-50/30 md:bg-transparent">
        {/* Desktop Table View */}
        <div className="hidden md:block">
        <table className="w-full min-w-max text-left border-collapse">
          <thead className="bg-white sticky top-0 z-10 border-b border-gray-100">
            <tr>
              <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Company</th>
              <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email</th>
              <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phone</th>
              <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Product</th>
              <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {filteredEntries.map((entry) => (
              <tr key={entry._id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600">
                      {entry.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="font-medium text-gray-800 flex items-center gap-2">
                      {entry.name}
                      {entry.brand === 'Bosch' && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Bosch Lead"></span>}
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
                  {entry.phone} <Phone size={12} className="text-emerald-500" />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="px-2.5 py-1 rounded border border-emerald-200 text-[10px] font-bold text-emerald-600 uppercase tracking-wide bg-emerald-50">
                    {entry.status}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-gray-600 text-xs font-semibold">
                  {entry.serviceInterest !== '-' ? entry.serviceInterest : 'N/A'}
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
                  </div>
                </td>
              </tr>
            ))}
            {filteredEntries.length === 0 && (
              <tr>
                <td colSpan="6" className="px-8 py-12 text-center text-gray-500">
                  No clients found. Move leads to "QUALIFIED" in the pipeline to see them here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col gap-4 p-4">
          {filteredEntries.map((entry) => (
            <div key={entry._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-4">
              {/* Top Row */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-600 shrink-0">
                    {entry.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="overflow-hidden">
                    <span className="font-bold text-[#1e293b] flex items-center gap-2 truncate">
                      {entry.name}
                      {entry.brand === 'Bosch' && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Bosch Lead"></span>}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate block">{entry.company || '-'}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded border border-emerald-100 text-[10px] font-bold text-emerald-600 uppercase tracking-wide bg-emerald-50 whitespace-nowrap ml-2 shrink-0">
                  {entry.status}
                </span>
              </div>

              {/* Contact Info */}
              <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
                  <span className="truncate">{entry.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={14} className="text-gray-400 shrink-0" />
                  <span>{entry.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1 pt-2 border-t border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Product:</span>
                  <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{entry.serviceInterest !== '-' ? entry.serviceInterest : 'N/A'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 mt-1">
                <button 
                  onClick={() => {
                    setSelectedLead(entry);
                    setIsDetailsDrawerOpen(true);
                  }}
                  className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-500 hover:bg-indigo-100 flex items-center justify-center transition-colors"
                >
                  <Eye size={16} />
                </button>
                <button className="w-9 h-9 rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 flex items-center justify-center transition-colors">
                  <Edit2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {filteredEntries.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              No clients found.
            </div>
          )}
        </div>
      </div>

      <CustomerEntryDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onSuccess={handleSuccess}
        mode="client"
        isClient={true}
      />
      <CustomerDetailsDrawer
        isOpen={isDetailsDrawerOpen}
        onClose={() => setIsDetailsDrawerOpen(false)}
        lead={selectedLead}
      />
    </div>
  );
};

export default AdminClients;
