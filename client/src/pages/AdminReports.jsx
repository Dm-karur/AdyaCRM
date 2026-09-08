import React, { useState, useEffect } from 'react';
import { Filter, Users, Briefcase, Calendar, Eye, Phone, LayoutList, UserCircle, Search, X, MapPin, Download } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import api from '../services/api';
import CustomerDetailsDrawer from '../components/CustomerDetailsDrawer';
import toast from 'react-hot-toast';

const AdminReports = () => {
  const [entries, setEntries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const outletContext = useOutletContext();
  const globalSearch = outletContext?.globalSearch || '';

  // Filter States
  const [mode, setMode] = useState('PRODUCT'); // 'PRODUCT' | 'EMPLOYEE' | 'AREA' | 'PINCODE' | 'BRANCH'
  const [dataset, setDataset] = useState('ALL'); // 'ALL' | 'LEADS' | 'CLIENTS'
  const [product, setProduct] = useState('ALL');
  const [employeeId, setEmployeeId] = useState('ALL');
  const [areaSearchTerm, setAreaSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('ALL');
  const [pincodeSearchTerm, setPincodeSearchTerm] = useState('');
  const [selectedPincode, setSelectedPincode] = useState('ALL');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('1M'); // Default to 1 Month

  // Drawer State
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);

  const PRODUCT_OPTIONS = Array.from(new Set(
    entries
      .map(e => e.serviceInterest)
      .filter(Boolean)
      .filter(p => p !== '-')
      .flatMap(p => p.split(',').map(item => item.trim()))
  )).sort();
  const AREA_OPTIONS = Array.from(new Set(entries.map(e => e.area).filter(Boolean).filter(a => a !== '-')));
  const PINCODE_OPTIONS = Array.from(new Set(entries.map(e => e.pincode).filter(Boolean).filter(p => p !== '-')));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [entriesRes, employeesRes] = await Promise.all([
        api.get('/customer-entries/all'),
        api.get('/admin/employees')
      ]);
      setEntries(entriesRes.data);
      setEmployees(employeesRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data for reports.');
    } finally {
      setLoading(false);
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
    // 1. Filter by Search term (Product, Name, Phone, Company, Email, Status)
    const activeSearch = (searchTerm || globalSearch).toLowerCase().trim();
    if (activeSearch) {
      const matchesSearch = 
        (entry.serviceInterest && entry.serviceInterest.toLowerCase().includes(activeSearch)) ||
        (entry.name && entry.name.toLowerCase().includes(activeSearch)) ||
        (entry.phone && entry.phone.toLowerCase().includes(activeSearch)) ||
        (entry.company && entry.company.toLowerCase().includes(activeSearch)) ||
        (entry.email && entry.email.toLowerCase().includes(activeSearch)) ||
        (entry.status && entry.status.toLowerCase().includes(activeSearch));
      
      if (!matchesSearch) return false;
    }

    // 2. Filter by Time
    let matchesTime = true;
    if (timeFilter !== 'ALL') {
      const date = getEntryDate(entry);
      if (date) {
        const now = new Date();
        const timeLimit = new Date();
        
        if (timeFilter === '1M') timeLimit.setMonth(now.getMonth() - 1);
        if (timeFilter === '3M') timeLimit.setMonth(now.getMonth() - 3);
        if (timeFilter === '6M') timeLimit.setMonth(now.getMonth() - 6);
        if (timeFilter === '1Y') timeLimit.setFullYear(now.getFullYear() - 1);
        
        matchesTime = date >= timeLimit;
      } else {
        matchesTime = false;
      }
    }

    if (!matchesTime) return false;

    const isClient = entry.status === 'QUALIFIED' || entry.status === 'QUALIFIED LEAD';
    const matchesDataset = dataset === 'ALL' ? true : (dataset === 'CLIENTS' ? isClient : !isClient);

    // 3. Filter by Mode logic
    if (mode === 'PRODUCT') {
      const matchesProductDropdown = product === 'ALL' || (entry.serviceInterest && entry.serviceInterest.split(',').map(i => i.trim()).includes(product));
      const matchesProductSearch = !productSearchTerm || (entry.serviceInterest && entry.serviceInterest.toLowerCase().includes(productSearchTerm.toLowerCase()));
      return matchesDataset && matchesProductDropdown && matchesProductSearch;
    } else if (mode === 'EMPLOYEE') {
      // EMPLOYEE mode
      const matchesEmployee = employeeId === 'ALL' || (entry.employeeId && entry.employeeId._id === employeeId);
      const matchesEmployeeSearch = !employeeSearchTerm || (entry.employeeId && entry.employeeId.name && entry.employeeId.name.toLowerCase().includes(employeeSearchTerm.toLowerCase()));
      return matchesEmployee && matchesEmployeeSearch && matchesDataset;
    } else if (mode === 'PINCODE') {
      // PINCODE mode
      const matchesPincode = selectedPincode === 'ALL' ? true : entry.pincode === selectedPincode;
      const matchesPincodeSearch = selectedPincode !== 'ALL' || !pincodeSearchTerm || (entry.pincode && entry.pincode.toLowerCase().includes(pincodeSearchTerm.toLowerCase()));
      return matchesPincode && matchesPincodeSearch && matchesDataset;
    } else {
      // AREA mode
      const matchesArea = selectedArea === 'ALL' ? true : entry.area === selectedArea;
      const matchesAreaSearch = selectedArea !== 'ALL' || !areaSearchTerm || (entry.area && entry.area.toLowerCase().includes(areaSearchTerm.toLowerCase()));
      return matchesArea && matchesAreaSearch && matchesDataset;
    }
  });

  const employeeStats = { leads: 0, clients: 0 };
  if (mode === 'EMPLOYEE') {
    entries.forEach(entry => {
      let matchesTime = true;
      if (timeFilter !== 'ALL') {
        const date = getEntryDate(entry);
        if (date) {
          const now = new Date();
          const timeLimit = new Date();
          
          if (timeFilter === '1M') timeLimit.setMonth(now.getMonth() - 1);
          if (timeFilter === '3M') timeLimit.setMonth(now.getMonth() - 3);
          if (timeFilter === '6M') timeLimit.setMonth(now.getMonth() - 6);
          if (timeFilter === '1Y') timeLimit.setFullYear(now.getFullYear() - 1);
          
          matchesTime = date >= timeLimit;
        } else {
          matchesTime = false;
        }
      }
      
      if (matchesTime) {
        const matchesEmployee = employeeId === 'ALL' || (entry.employeeId && entry.employeeId._id === employeeId);
        const matchesEmployeeSearch = !employeeSearchTerm || (entry.employeeId && entry.employeeId.name && entry.employeeId.name.toLowerCase().includes(employeeSearchTerm.toLowerCase()));
        if (matchesEmployee && matchesEmployeeSearch) {
          const isClient = entry.status === 'QUALIFIED' || entry.status === 'QUALIFIED LEAD';
          if (isClient) employeeStats.clients++;
          else employeeStats.leads++;
        }
      }
    });
  }

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'HOT': return <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>HOT</span>; 
      case 'WARM': return <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>WARM</span>;
      case 'COLD': return <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>COLD</span>;
      default: return <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700"><span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>{priority || '-'}</span>;
    }
  };

  const downloadCSV = () => {
    if (filteredEntries.length === 0) {
      toast.error("No data to download");
      return;
    }

    const headers = ['Name', 'Phone', 'Company', 'Email', 'Status', 'Product', 'Date', 'Attended By'];
    const csvRows = [headers.join(',')];

    filteredEntries.forEach(entry => {
      const name = `"${entry.name || ''}"`;
      const phone = `"${entry.phone || ''}"`;
      const company = `"${entry.company || ''}"`;
      const email = `"${entry.email || ''}"`;
      const status = `"${entry.status || ''}"`;
      const product = `"${entry.serviceInterest !== '-' ? entry.serviceInterest : 'N/A'}"`;
      const dateVal = getEntryDate(entry);
      const date = dateVal ? `"${dateVal.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}"` : '"N/A"';
      const attendedBy = `"${entry.employeeId?.name || 'Unknown'}"`;

      csvRows.push([name, phone, company, email, status, product, date, attendedBy].join(','));
    });

    const csvData = csvRows.join('\n');
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `employee_report_${Date.now()}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Reports...</div>;

  return (
    <div className="flex flex-col md:flex-row min-h-full md:h-full bg-gray-50/50">
      
      {/* LEFT PANE: Filters */}
      <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Filter size={20} className="text-primary" /> Advanced Filters
          </h1>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto scrollbar-hide">
          {/* Mode Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Filter By</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setMode('PRODUCT'); setTimeFilter('1M'); }}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${mode === 'PRODUCT' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                <LayoutList size={18} />
                <span className="text-[10px] font-bold">Product</span>
              </button>
              <button
                onClick={() => { setMode('EMPLOYEE'); setTimeFilter('1M'); }}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${mode === 'EMPLOYEE' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                <UserCircle size={18} />
                <span className="text-[10px] font-bold">Employee</span>
              </button>
              <button
                onClick={() => { setMode('AREA'); setTimeFilter('1M'); }}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${mode === 'AREA' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                <MapPin size={18} />
                <span className="text-[10px] font-bold">Area</span>
              </button>
              <button
                onClick={() => { setMode('PINCODE'); setTimeFilter('1M'); }}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${mode === 'PINCODE' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                <MapPin size={18} />
                <span className="text-[10px] font-bold">Pincode</span>
              </button>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Dynamic Filters based on Mode */}
          {mode === 'PRODUCT' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dataset</label>
                <div className="flex bg-gray-100/50 p-1 rounded-lg">
                  <button 
                    onClick={() => setDataset('ALL')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${dataset === 'ALL' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setDataset('LEADS')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${dataset === 'LEADS' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Leads
                  </button>
                  <button 
                    onClick={() => setDataset('CLIENTS')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${dataset === 'CLIENTS' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Clients
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Product</label>
                <select 
                  value={product} 
                  onChange={(e) => setProduct(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                >
                  <option value="ALL">All Products</option>
                  {PRODUCT_OPTIONS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Search Product</label>
                <div className="relative">
                  <input
                    type="text"
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    placeholder="Search by product name..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  {productSearchTerm && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {PRODUCT_OPTIONS.filter(p => p.toLowerCase().includes(productSearchTerm.toLowerCase())).length > 0 ? (
                        PRODUCT_OPTIONS.filter(p => p.toLowerCase().includes(productSearchTerm.toLowerCase())).map(p => (
                          <div 
                            key={p} 
                            onClick={() => { setProduct(p); setProductSearchTerm(''); }}
                            className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                          >
                            {p}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-gray-500">No matching products</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Time Period</label>
                <select 
                  value={timeFilter} 
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                >
                  <option value="ALL">All Time</option>
                  <option value="1M">Last 1 Month</option>
                  <option value="3M">Last 3 Months</option>
                  <option value="6M">Last 6 Months</option>
                  <option value="1Y">Last 1 Year</option>
                </select>
              </div>
            </div>
          )}
          
          {mode === 'EMPLOYEE' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dataset</label>
                <div className="flex bg-gray-100/50 p-1 rounded-lg">
                  <button 
                    onClick={() => setDataset('ALL')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${dataset === 'ALL' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setDataset('LEADS')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${dataset === 'LEADS' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Leads
                  </button>
                  <button 
                    onClick={() => setDataset('CLIENTS')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${dataset === 'CLIENTS' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Clients
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Search Employee</label>
                <div className="relative">
                  <input
                    type="text"
                    value={employeeSearchTerm}
                    onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                    placeholder="Search by employee name..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  {employeeSearchTerm && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {employees.filter(emp => emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase())).length > 0 ? (
                        employees.filter(emp => emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase())).map(emp => (
                          <div 
                            key={emp._id} 
                            onClick={() => { setEmployeeId(emp._id); setEmployeeSearchTerm(''); }}
                            className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                          >
                            {emp.name}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-gray-500">No matching employees</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Employee</label>
                <select 
                  value={employeeId} 
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                >
                  <option value="ALL">All Employees</option>
                  {employees
                    .map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">History Period</label>
                <select 
                  value={timeFilter} 
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                >
                  <option value="ALL">All Time</option>
                  <option value="1M">Last 1 Month</option>
                  <option value="3M">Last 3 Months</option>
                  <option value="6M">Last 6 Months</option>
                </select>
              </div>
            </div>
          )}
          
          {mode === 'AREA' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dataset</label>
                <div className="flex bg-gray-100/50 p-1 rounded-lg">
                  <button 
                    onClick={() => setDataset('ALL')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${dataset === 'ALL' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setDataset('LEADS')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${dataset === 'LEADS' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Leads
                  </button>
                  <button 
                    onClick={() => setDataset('CLIENTS')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${dataset === 'CLIENTS' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Clients
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Area</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Area..."
                    value={areaSearchTerm}
                    onChange={(e) => {
                      setAreaSearchTerm(e.target.value);
                      setSelectedArea('ALL');
                    }}
                    className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                  {areaSearchTerm && (
                    <button 
                      onClick={() => { setAreaSearchTerm(''); setSelectedArea('ALL'); }}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}

                  {areaSearchTerm && selectedArea === 'ALL' && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {AREA_OPTIONS.filter(a => a.toLowerCase().includes(areaSearchTerm.toLowerCase())).length > 0 ? (
                        AREA_OPTIONS.filter(a => a.toLowerCase().includes(areaSearchTerm.toLowerCase())).map(a => (
                          <div 
                            key={a}
                            onClick={() => {
                              setSelectedArea(a);
                              setAreaSearchTerm(a);
                            }}
                            className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                          >
                            {a}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 italic text-center">No result found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Time Period</label>
                <select 
                  value={timeFilter} 
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                >
                  <option value="ALL">All Time</option>
                  <option value="1M">Last 1 Month</option>
                  <option value="3M">Last 3 Months</option>
                  <option value="6M">Last 6 Months</option>
                  <option value="1Y">Last 1 Year</option>
                </select>
              </div>
            </div>
          )}
          
          {mode === 'PINCODE' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dataset</label>
                <div className="flex bg-gray-100/50 p-1 rounded-lg">
                  <button 
                    onClick={() => setDataset('ALL')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${dataset === 'ALL' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setDataset('LEADS')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${dataset === 'LEADS' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Leads
                  </button>
                  <button 
                    onClick={() => setDataset('CLIENTS')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${dataset === 'CLIENTS' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Clients
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pincode</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Pincode..."
                    value={pincodeSearchTerm}
                    onChange={(e) => {
                      setPincodeSearchTerm(e.target.value);
                      setSelectedPincode('ALL');
                    }}
                    className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                  {pincodeSearchTerm && (
                    <button 
                      onClick={() => { setPincodeSearchTerm(''); setSelectedPincode('ALL'); }}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}

                  {pincodeSearchTerm && selectedPincode === 'ALL' && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {PINCODE_OPTIONS.filter(p => p.toLowerCase().includes(pincodeSearchTerm.toLowerCase())).length > 0 ? (
                        PINCODE_OPTIONS.filter(p => p.toLowerCase().includes(pincodeSearchTerm.toLowerCase())).map(p => (
                          <div 
                            key={p}
                            onClick={() => {
                              setSelectedPincode(p);
                              setPincodeSearchTerm(p);
                            }}
                            className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                          >
                            {p}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 italic text-center">No result found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Time Period</label>
                <select 
                  value={timeFilter} 
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                >
                  <option value="ALL">All Time</option>
                  <option value="1M">Last 1 Month</option>
                  <option value="3M">Last 3 Months</option>
                  <option value="6M">Last 6 Months</option>
                  <option value="1Y">Last 1 Year</option>
                </select>
              </div>
            </div>
          )}

          {mode === 'BRANCH' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dataset</label>
                <div className="flex bg-gray-100/50 p-1 rounded-lg">
                  <button 
                    onClick={() => setDataset('ALL')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${dataset === 'ALL' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setDataset('LEADS')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${dataset === 'LEADS' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Leads
                  </button>
                  <button 
                    onClick={() => setDataset('CLIENTS')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${dataset === 'CLIENTS' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Clients
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Branch</label>
                <select 
                  value={selectedBranch} 
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                >
                  <option value="ALL">All Branches</option>
                  {BRANCH_OPTIONS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Time Period</label>
                <select 
                  value={timeFilter} 
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                >
                  <option value="ALL">All Time</option>
                  <option value="1M">Last 1 Month</option>
                  <option value="3M">Last 3 Months</option>
                  <option value="6M">Last 6 Months</option>
                  <option value="1Y">Last 1 Year</option>
                </select>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* RIGHT PANE: Results Table */}
      <div className="flex-1 flex flex-col min-w-0 bg-white md:h-full md:overflow-hidden">
        
        {/* Results Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {filteredEntries.length} Record{filteredEntries.length !== 1 ? 's' : ''} Found
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {mode === 'PRODUCT' 
                ? `Showing ${product === 'ALL' ? 'all products' : product} in ${dataset.toLowerCase()}`
                : mode === 'EMPLOYEE'
                ? `Showing customer history for ${employeeId === 'ALL' ? 'all employees' : employees.find(e => e._id === employeeId)?.name || 'selected employee'}`
                : mode === 'AREA'
                ? `Showing records for ${selectedArea === 'ALL' && !areaSearchTerm ? 'all areas' : (selectedArea !== 'ALL' ? selectedArea : 'searched areas')}`
                : mode === 'PINCODE'
                ? `Showing records for ${selectedPincode === 'ALL' && !pincodeSearchTerm ? 'all pincodes' : (selectedPincode !== 'ALL' ? selectedPincode : 'searched pincodes')}`
                : `Showing records for ${selectedBranch === 'ALL' ? 'all branches' : selectedBranch}`
              }
            </p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Search Input Bar */}
            <div className="relative flex-1 md:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                placeholder="Search Product, Name, Phone..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-gray-50/80 border border-gray-200 rounded-full text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
              />
              {(searchTerm || globalSearch) && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {mode === 'EMPLOYEE' && (
              <div className="hidden lg:flex gap-3 items-center">
                <button 
                  onClick={downloadCSV}
                  className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors"
                >
                  <Download size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Download</span>
                </button>
                <div className="bg-blue-50/50 px-3 py-1.5 border border-blue-100 rounded-xl flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Users size={14} /></div>
                  <div>
                    <div className="text-[9px] text-blue-500 font-bold uppercase tracking-wider">Leads</div>
                    <div className="text-sm font-bold text-blue-700 leading-tight">{employeeStats.leads}</div>
                  </div>
                </div>
                <div className="bg-green-50/50 px-3 py-1.5 border border-green-100 rounded-xl flex items-center gap-2">
                  <div className="p-1.5 bg-green-100 text-green-600 rounded-lg"><Briefcase size={14} /></div>
                  <div>
                    <div className="text-[9px] text-green-500 font-bold uppercase tracking-wider">Clients</div>
                    <div className="text-sm font-bold text-green-700 leading-tight">{employeeStats.clients}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="m-8 mb-0 bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 shrink-0">
            {error}
          </div>
        )}

        {/* Table Area */}
        <div className="flex-1 overflow-auto bg-gray-50/30">
          {filteredEntries.length > 0 ? (
            <>
            <div className="hidden md:block">
            <table className="w-full min-w-[1000px] text-left border-collapse">
              <thead className="bg-white sticky top-0 z-10 border-b border-gray-100 shadow-sm">
                <tr>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Attended By</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm bg-white">
                {filteredEntries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-8 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                          {entry.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800 flex items-center gap-2">
                            {entry.name}
                            {entry.brand === 'Bosch' && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Bosch Lead"></span>}
                          </div>
                          <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Phone size={10} /> {entry.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded border border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wide bg-gray-50">
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-xs font-semibold">
                      {entry.serviceInterest !== '-' ? entry.serviceInterest : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs">
                      {getEntryDate(entry) ? getEntryDate(entry).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                          {entry.employeeId?.name?.charAt(0) || '?'}
                        </div>
                        <span className="text-xs font-medium text-gray-700" style={{ borderBottom: entry.employeeId?.brand === 'Bosch' ? '2px solid blue' : entry.employeeId?.brand === 'Furniture' ? '2px solid orange' : 'none', paddingBottom: '2px', display: 'inline-block' }}>
                          {entry.employeeId?.name || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => {
                          setSelectedEntry(entry);
                          setIsDetailsDrawerOpen(true);
                        }}
                        className="text-primary hover:text-primary-dark transition-colors px-3 py-1.5 bg-primary/5 hover:bg-primary/10 rounded-lg text-xs font-bold flex items-center gap-2 ml-auto opacity-100"
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col gap-4 p-4">
              {filteredEntries.map((entry) => (
                <div key={entry._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 relative">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                        {entry.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="font-bold text-gray-900 text-base flex items-center gap-2 truncate">
                          {entry.name}
                          {entry.brand === 'Bosch' && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Bosch Lead"></span>}
                        </h3>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Phone size={12} /> {entry.phone}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded border border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wide bg-gray-50 shrink-0 ml-2">
                      {entry.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 bg-gray-50/50 p-3 rounded-lg border border-gray-50 mt-1">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Product</span>
                      <span className="font-semibold text-gray-700">{entry.serviceInterest !== '-' ? entry.serviceInterest : 'N/A'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Date</span>
                      <span className="text-gray-600">{getEntryDate(entry) ? getEntryDate(entry).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A'}</span>
                    </div>
                    <div className="flex flex-col gap-1 col-span-2 border-t border-gray-100 pt-2 mt-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Attended By</span>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                          {entry.employeeId?.name?.charAt(0) || '?'}
                        </div>
                        <span className="font-medium" style={{ borderBottom: entry.employeeId?.brand === 'Bosch' ? '2px solid blue' : entry.employeeId?.brand === 'Furniture' ? '2px solid orange' : 'none', paddingBottom: '2px', display: 'inline-block' }}>{entry.employeeId?.name || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-gray-100 mt-1">
                    <button 
                      onClick={() => {
                        setSelectedEntry(entry);
                        setIsDetailsDrawerOpen(true);
                      }}
                      className="text-primary font-bold text-sm bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 w-full justify-center"
                    >
                      <Eye size={16} /> View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 py-20">
              <Filter size={48} className="text-gray-200 opacity-50" />
              <p>No records found matching your filters.</p>
            </div>
          )}
        </div>
      </div>

      {isDetailsDrawerOpen && selectedEntry && (
        <CustomerDetailsDrawer 
          isOpen={isDetailsDrawerOpen}
          onClose={() => setIsDetailsDrawerOpen(false)}
          lead={selectedEntry}
        />
      )}

    </div>
  );
};

export default AdminReports;
