import React, { useState, useContext, useEffect } from 'react';
import { X, User, Building, Mail, Phone, CheckCircle, MapPin, Eye } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const CustomerEntryDrawer = ({ isOpen, onClose, onSuccess, onViewClient }) => {
  const { user } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    source: 'Website',
    referrerName: '',
    serviceInterest: 'Washing Machine',
    budget: '',
    area: '',
    status: 'New',
    priority: 'Warm'
  });
  const [otherServiceInterest, setOtherServiceInterest] = useState('');
  const [selectedMultipleProducts, setSelectedMultipleProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingClient, setExistingClient] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [availableAreas, setAvailableAreas] = useState([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState([]);
  const [hidePhoneSuggestions, setHidePhoneSuggestions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAreas();
    }
  }, [isOpen]);

  useEffect(() => {
    const searchPhone = async () => {
      if (formData.phone.length >= 8) {
        try {
          const res = await api.get(`/customer-entries/search?phone=${formData.phone}`);
          setPhoneSuggestions(res.data);
        } catch (err) {
          console.error('Failed to search phone:', err);
        }
      } else {
        setPhoneSuggestions([]);
      }
    };
    const delayDebounceFn = setTimeout(() => {
      searchPhone();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [formData.phone]);

  const getProductOptions = () => {
    if (user?.brand === 'Furniture') {
      return ['Cot', 'Mattress', 'Dinning Table', 'Office Table', 'Sofas', 'cupboard'];
    } else if (user?.brand === 'Bosch') {
      return ['Frontload Washing Machine', 'Topload washing machine', 'Fridge', 'Dishwasher', 'Mixxie', 'Chimney'];
    } else {
      return ['Washing Machine', 'Fridge', 'Chimney', 'Dishwasher'];
    }
  };

  const handleMultipleProductChange = (product) => {
    setSelectedMultipleProducts(prev => 
      prev.includes(product) 
        ? prev.filter(p => p !== product)
        : [...prev, product]
    );
  };

  const fetchAreas = async () => {
    try {
      const res = await api.get('/customer-entries/areas');
      setAvailableAreas(res.data);
    } catch (err) {
      console.error('Failed to fetch areas:', err);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (e.target.name === 'phone') {
      setHidePhoneSuggestions(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setExistingClient(null);

    // Transform fields to match backend enum constraints
    let finalServiceInterest = formData.serviceInterest;
    if (finalServiceInterest === 'Others') {
      finalServiceInterest = otherServiceInterest;
    } else if (finalServiceInterest === 'Multiple Products') {
      const selected = [...selectedMultipleProducts];
      if (otherServiceInterest.trim()) {
        selected.push(otherServiceInterest.trim());
      }
      finalServiceInterest = selected.length > 0 ? selected.join(', ') : 'Multiple Products';
    }

    const payloadData = {
      ...formData,
      serviceInterest: finalServiceInterest,
      status: formData.status.toUpperCase() + ' LEAD',
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
      await api.post('/customer-entries', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      onSuccess('Lead created successfully!');
      onClose();
      // Reset form
      setFormData({
        name: '',
        company: '',
        email: '',
        phone: '',
        source: 'Website',
        referrerName: '',
        serviceInterest: 'Washing Machine',
        budget: '',
        area: '',
        status: 'New',
        priority: 'Warm'
      });
      setOtherServiceInterest('');
      setSelectedMultipleProducts([]);
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err) {
      if (err.response?.status === 409) {
        setError('User already exists');
        setExistingClient(err.response.data.existingLead);
      } else {
        setError(err.response?.data?.message || 'Failed to save lead');
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
            <h2 className="text-2xl font-bold text-gray-900">Create New Lead</h2>
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

                <div className="relative">
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
                      autoComplete="off"
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm placeholder:text-gray-400"
                    />
                  </div>
                  {!hidePhoneSuggestions && phoneSuggestions.length > 0 && (
                    <div className="absolute z-20 w-[150%] md:w-[200%] mt-2 bg-white border border-red-200 rounded-2xl shadow-xl overflow-hidden left-0 md:-left-10">
                      <div className="flex justify-between items-center bg-red-50 px-4 py-3 border-b border-red-100">
                        <p className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                           Possible Duplicates Found
                        </p>
                        <button type="button" onClick={() => setHidePhoneSuggestions(true)} className="text-red-400 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto p-2 space-y-2 bg-gray-50/50">
                        {phoneSuggestions.map(s => (
                          <div key={s._id} className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-bold text-gray-900 text-base">{s.name}</h4>
                                <p className="text-sm font-medium text-gray-500">{s.phone}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${s.status === 'Qualified' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {s.status}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onViewClient && onViewClient(s)}
                                  className="text-[10px] font-bold px-2 py-1 rounded border border-primary/20 text-primary hover:bg-primary/5 transition-colors uppercase tracking-wider flex items-center gap-1 mt-1"
                                >
                                  <Eye size={12} /> View
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-50">
                              <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Email</p>
                                <p className="text-xs font-medium text-gray-700 truncate">{s.email || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Assigned To</p>
                                <p className="text-xs font-medium text-gray-700 truncate">{s.employeeId?.name || 'Unknown'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Area <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-4 top-3.5 text-gray-400" />
                    <input
                      type="text"
                      name="area"
                      value={formData.area}
                      onChange={handleChange}
                      list="area-suggestions"
                      placeholder="e.g. Downtown, Northside..."
                      required
                      autoComplete="off"
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm placeholder:text-gray-400"
                    />
                    <datalist id="area-suggestions">
                      {availableAreas.map((area, idx) => (
                        <option key={idx} value={area} />
                      ))}
                    </datalist>
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
                      <option value="General">General</option>
                      <option value="Referral">Referral</option>
                      <option value="Google">Google</option>
                      <option value="Website">Website</option>
                      <option value="Social Media Ads">Social Media Ads</option>
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                  {formData.source === 'Referral' && (
                    <div className="mt-3 transition-all">
                      <input
                        type="text"
                        name="referrerName"
                        value={formData.referrerName}
                        onChange={handleChange}
                        placeholder="Referred by whom?"
                        required
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm placeholder:text-gray-400"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Service Interest</label>
                  <div className="relative">
                    <select
                      name="serviceInterest"
                      value={formData.serviceInterest}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none text-sm text-gray-700"
                    >
                      {user?.brand === 'Furniture' ? (
                        <>
                          <option value="Cot">Cot</option>
                          <option value="Mattress">Mattress</option>
                          <option value="Dinning Table">Dinning Table</option>
                          <option value="Office Table">Office Table</option>
                          <option value="Sofas">Sofas</option>
                          <option value="cupboard">Cupboard</option>
                          <option value="Multiple Products">Multiple Products</option>
                          <option value="Others">Others</option>
                        </>
                      ) : user?.brand === 'Bosch' ? (
                        <>
                          <option value="Frontload Washing Machine">Frontload Washing Machine</option>
                          <option value="Topload washing machine">Topload Washing Machine</option>
                          <option value="Fridge">Fridge</option>
                          <option value="Dishwasher">Dishwasher</option>
                          <option value="Mixxie">Mixxie</option>
                          <option value="Chimney">Chimney</option>
                          <option value="Multiple Products">Multiple Products</option>
                          <option value="Others">Others</option>
                        </>
                      ) : (
                        <>
                          <option value="Washing Machine">Washing Machine</option>
                          <option value="Fridge">Fridge</option>
                          <option value="Chimney">Chimney</option>
                          <option value="Dishwasher">Dishwasher</option>
                          <option value="Multiple Products">Multiple Products</option>
                          <option value="Others">Others</option>
                        </>
                      )}
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                  {formData.serviceInterest === 'Others' && (
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
                  {formData.serviceInterest === 'Multiple Products' && (
                    <div className="mt-3 transition-all">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Products</p>
                      <div className="flex flex-col gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-48 overflow-y-auto mb-2">
                        {getProductOptions().map(opt => (
                          <label key={opt} className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={selectedMultipleProducts.includes(opt)}
                              onChange={() => handleMultipleProductChange(opt)}
                              className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 mt-0.5 shrink-0"
                            />
                            <span className="leading-tight">{opt}</span>
                          </label>
                        ))}
                      </div>
                      <input
                        type="text"
                        name="otherServiceInterest"
                        value={otherServiceInterest}
                        onChange={(e) => setOtherServiceInterest(e.target.value)}
                        placeholder="Other products (comma separated)"
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
                  <div>
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
                Register Lead
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default CustomerEntryDrawer;
