import React, { useState, useContext } from 'react';
import { X, User, Building, Mail, Phone, CheckCircle, ChevronDown, Search } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const CustomerEntryDrawer = ({ isOpen, onClose, onSuccess, onViewClient, mode = 'lead', isClient = false }) => {
  const { user } = useContext(AuthContext);
  const activeIsClient = isClient || mode === 'client';

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    area: '',
    pincode: '',
    source: '',
    referredBy: '',
    serviceInterest: [],
    budget: '',
    status: activeIsClient ? 'Qualified' : 'New',
    priority: 'Warm'
  });
  const [otherServiceInterest, setOtherServiceInterest] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingClient, setExistingClient] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  
  const [allEntries, setAllEntries] = useState([]);
  const [matchingEntries, setMatchingEntries] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        company: '',
        email: '',
        phone: '',
        area: '',
        pincode: '',
        source: '',
        referredBy: '',
        serviceInterest: [],
        budget: '',
        status: activeIsClient ? 'Qualified' : 'New',
        priority: 'Warm'
      });
      setOtherServiceInterest('');
      setPhotoFile(null);
      setPhotoPreview(null);
      setError('');
      setExistingClient(null);
      fetchEntries();
    }
  }, [isOpen, activeIsClient]);

  const fetchEntries = async () => {
    try {
      const endpoint = user?.role === 'Admin' ? '/customer-entries/all' : '/customer-entries';
      const { data } = await api.get(endpoint);
      setAllEntries(data);
    } catch (err) {
      console.error('Failed to fetch entries for suggestions', err);
    }
  };

  React.useEffect(() => {
    if (formData.phone && formData.phone.replace(/\D/g, '').length >= 6) {
      const cleanPhone = formData.phone.replace(/\D/g, '');
      const matches = allEntries.filter(entry => 
        entry.phone && entry.phone.replace(/\D/g, '').includes(cleanPhone)
      );
      setMatchingEntries(matches);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [formData.phone, allEntries]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setExistingClient(null);

    // Transform fields to match backend enum constraints
    let finalServiceInterest = [...formData.serviceInterest];
    if (finalServiceInterest.includes('Others') && otherServiceInterest.trim()) {
      // Remove 'Others' and add the custom text
      finalServiceInterest = finalServiceInterest.filter(item => item !== 'Others');
      finalServiceInterest.push(otherServiceInterest.trim());
    }
    const serviceInterestString = finalServiceInterest.length > 0 ? finalServiceInterest.join(', ') : '-';

    let rawStatus = formData.status.toUpperCase();
    let formattedStatus = rawStatus;
    if (rawStatus === 'QUALIFIED') {
      formattedStatus = 'QUALIFIED LEAD';
    } else if (!rawStatus.includes('LEAD')) {
      formattedStatus = rawStatus + ' LEAD';
    }

    const payloadData = {
      ...formData,
      serviceInterest: serviceInterestString,
      status: formattedStatus,
      source: formData.source.toUpperCase(),
      priority: formData.priority.toUpperCase()
    };

    const formDataToSend = new FormData();
    Object.keys(payloadData).forEach(key => {
      formDataToSend.append(key, payloadData[key]);
    });
    if (photoFile) {
      formDataToSend.append('photo', photoFile);
    }

    try {
      await api.post('/customer-entries', formDataToSend);
      onSuccess(activeIsClient ? 'Client created successfully!' : 'Lead created successfully!');
      onClose();
      // Reset form
      setFormData({
        name: '',
        company: '',
        email: '',
        phone: '',
        area: '',
        pincode: '',
        source: '',
        referredBy: '',
        serviceInterest: [],
        budget: '',
        status: activeIsClient ? 'Qualified' : 'New',
        priority: 'Warm'
      });
      setOtherServiceInterest('');
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err) {
      if (err.response?.status === 409) {
        setError('User already exists');
        setExistingClient(err.response.data.existingLead);
      } else {
        setError(err.response?.data?.message || (activeIsClient ? 'Failed to save client' : 'Failed to save lead'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[450px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex items-start justify-between p-8 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {activeIsClient ? 'Create New Client' : 'Create New Lead'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors mt-1"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100 flex items-center justify-between">
              <span>{error}</span>
              {existingClient && onViewClient && (
                <button 
                  type="button"
                  onClick={() => onViewClient(existingClient)}
                  className="bg-white px-3 py-1.5 text-xs font-bold text-red-700 border border-red-200 rounded hover:bg-red-50 transition-colors shrink-0"
                >
                  View Client
                </button>
              )}
            </div>
          )}

          <form id="leadForm" onSubmit={handleSubmit} className="space-y-8">

            {/* Avatar Placeholder / Upload */}
            <div className="flex justify-center mb-8">
              <label className="cursor-pointer relative group">
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 overflow-hidden relative">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <User size={24} className="mb-1 text-gray-300 group-hover:text-primary transition-colors" />
                      <span className="text-[10px] font-bold tracking-widest uppercase group-hover:text-primary transition-colors">Photo</span>
                    </>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-bold uppercase tracking-wider">{photoPreview ? 'Change' : 'Upload'}</span>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setPhotoFile(e.target.files[0]);
                      setPhotoPreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                />
              </label>
            </div>

            {/* Section 1 */}
            <div>
              <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded mb-6">
                Contact Details
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-3.5 text-gray-400" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Full Name"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Phone <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-4 top-3.5 text-gray-400" />
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1 000-000-0000"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm placeholder:text-gray-400"
                    />
                    
                    {/* Suggestions Dropdown */}
                    {showSuggestions && matchingEntries.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                        <div className="flex justify-between items-center p-3 border-b border-gray-100 bg-gray-50 sticky top-0">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Suggested Matches</span>
                          <button type="button" onClick={() => setShowSuggestions(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                            <X size={14} />
                          </button>
                        </div>
                        {matchingEntries.map(entry => (
                          <div key={entry._id} className="p-3 border-b border-gray-50 flex flex-col gap-2 hover:bg-gray-50/50 transition-colors">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                  {entry.name}
                                  {entry.brand === 'Bosch' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                                </div>
                                <div className="text-xs font-medium text-gray-500 mt-0.5 flex items-center gap-1">
                                  <Phone size={10} /> {entry.phone}
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded border border-gray-200 text-[9px] font-bold text-gray-500 uppercase tracking-wide bg-white">
                                {entry.status}
                              </span>
                            </div>
                            {onViewClient && (
                              <button 
                                type="button" 
                                onClick={() => {
                                  onViewClient(entry);
                                  setShowSuggestions(false);
                                }}
                                className="w-full py-1.5 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors border border-primary/10 mt-1"
                              >
                                View Details
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-3.5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="email@address.com"
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Company</label>
                  <div className="relative">
                    <Building size={18} className="absolute left-4 top-3.5 text-gray-400" />
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="Company Name"
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Area <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <svg className="absolute left-4 top-3.5 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <input
                      type="text"
                      name="area"
                      value={formData.area}
                      onChange={handleChange}
                      placeholder="Area / Location"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Pincode <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <svg className="absolute left-4 top-3.5 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path></svg>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      placeholder="Pincode"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Section 2 */}
            <div>
              <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded mb-6">
                Profile Details
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Marketing Source <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      name="source"
                      value={formData.source}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none text-sm text-gray-700"
                    >
                      <option value="" disabled>Select Source</option>
                      <option value="Walk-in">Walk-in</option>
                      <option value="Referral">Referral</option>
                      <option value="Google">Google</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Banners">Banners</option>
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                  {formData.source === 'Referral' && (
                    <div className="mt-3 transition-all">
                      <input
                        type="text"
                        name="referredBy"
                        value={formData.referredBy}
                        onChange={handleChange}
                        placeholder="By Whom?"
                        required
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm placeholder:text-gray-400"
                      />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 relative">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Product Interested</label>
                  
                  {/* Custom Searchable Multi-Select Dropdown */}
                  <div className="relative">
                    <div 
                      className="min-h-[46px] w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl cursor-pointer flex flex-wrap items-center gap-2 transition-all hover:border-primary/50"
                      onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                    >
                      {formData.serviceInterest.length > 0 ? (
                        formData.serviceInterest.map(item => (
                          <span key={item} className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1.5 border border-primary/20">
                            {item}
                            <button 
                              type="button" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData({ ...formData, serviceInterest: formData.serviceInterest.filter(i => i !== item) });
                              }}
                              className="hover:text-primary/70 focus:outline-none"
                            >
                              <X size={12} strokeWidth={3} />
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">Select products...</span>
                      )}
                      <div className="ml-auto text-gray-400">
                        <ChevronDown size={18} className={`transition-transform duration-200 ${isProductDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {isProductDropdownOpen && (
                      <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden">
                        <div className="p-2 border-b border-gray-50 bg-gray-50/50">
                          <div className="relative">
                            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                            <input 
                              type="text" 
                              placeholder="Search products..." 
                              value={productSearch}
                              onChange={(e) => setProductSearch(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto p-1">
                          {(user?.brand === 'Furniture' 
                            ? ['Cot', 'Mattress', 'Dinning Table', 'Office Table', 'Sofas', 'Cupboard', 'Others']
                            : user?.brand === 'Bosch'
                            ? ['Frontload Washing Machine', 'Topload Washing Machine', 'Fridge', 'Dishwasher', 'Mixxie', 'Chimney', 'Others']
                            : ['Washing Machine', 'Fridge', 'Chimney', 'Dishwasher', 'Others']
                          )
                          .filter(option => option.toLowerCase().includes(productSearch.toLowerCase()))
                          .map(option => {
                            const isSelected = formData.serviceInterest.includes(option);
                            return (
                              <div 
                                key={option}
                                onClick={() => {
                                  const current = formData.serviceInterest;
                                  if (isSelected) {
                                    setFormData({ ...formData, serviceInterest: current.filter(item => item !== option) });
                                  } else {
                                    setFormData({ ...formData, serviceInterest: [...current, option] });
                                  }
                                }}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 text-primary' : 'hover:bg-gray-50 text-gray-700'}`}
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                                  {isSelected && <CheckCircle size={12} className="text-white" strokeWidth={3} />}
                                </div>
                                <span className={`text-sm ${isSelected ? 'font-bold' : 'font-medium'}`}>{option}</span>
                              </div>
                            );
                          })}
                          {(user?.brand === 'Furniture' 
                            ? ['Cot', 'Mattress', 'Dinning Table', 'Office Table', 'Sofas', 'Cupboard', 'Others']
                            : user?.brand === 'Bosch'
                            ? ['Frontload Washing Machine', 'Topload Washing Machine', 'Fridge', 'Dishwasher', 'Mixxie', 'Chimney', 'Others']
                            : ['Washing Machine', 'Fridge', 'Chimney', 'Dishwasher', 'Others']
                          ).filter(option => option.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                            <div className="px-4 py-6 text-center text-sm text-gray-500">
                              No products found matching "{productSearch}"
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {formData.serviceInterest.includes('Others') && (
                    <div className="mt-3 transition-all">
                      <input
                        type="text"
                        name="otherServiceInterest"
                        value={otherServiceInterest}
                        onChange={(e) => setOtherServiceInterest(e.target.value)}
                        placeholder="Please specify product enquiry"
                        required
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm placeholder:text-gray-400"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Budget Est.</label>
                  <input
                    type="text"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    placeholder="$0 - $5,000"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm placeholder:text-gray-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className={formData.status === 'Qualified' ? 'col-span-2' : ''}>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none text-sm text-gray-700"
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Qualified">Qualified</option>
                    </select>
                  </div>
                  {formData.status !== 'Qualified' && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Priority</label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none text-sm text-gray-700"
                      >
                        <option value="Warm">Warm</option>
                        <option value="Cold">Cold</option>
                        <option value="Hot">Hot</option>
                      </select>
                    </div>
                  )}
                </div>

              </div>
            </div>

          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-4 shrink-0 rounded-bl-2xl rounded-br-2xl md:rounded-br-none">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            form="leadForm"
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-[#0f172a] text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50"
          >
            {loading ? (
              'Saving...'
            ) : (
              <>
                <CheckCircle size={18} className="text-primary" />
                {activeIsClient ? 'Register Client' : 'Register Lead'}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default CustomerEntryDrawer;
