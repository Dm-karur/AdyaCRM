import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Building2, MapPin, Loader2, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminBranches = () => {
  const [branches, setBranches] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newRadius, setNewRadius] = useState('100');
  const [newLat, setNewLat] = useState('');
  const [newLng, setNewLng] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [updatingBranchId, setUpdatingBranchId] = useState(null);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data } = await api.get('/branches');
      setBranches(data);
    } catch (err) {
      console.error('Failed to fetch branches', err);
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  };

  const handleUseMyLocation = async () => {
    setIsGettingLocation(true);
    try {
      const loc = await getCurrentLocation();
      setNewLat(loc.latitude.toFixed(8));
      setNewLng(loc.longitude.toFixed(8));
      setNewGoogleMapsLink(''); // Clear maps link since we're using GPS
      toast.success(`Location acquired! Accuracy: ${Math.round(loc.accuracy)}m`);
    } catch (err) {
      toast.error('Failed to get location. Please allow GPS access.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleUpdateBranchLocation = async (branch) => {
    setUpdatingBranchId(branch._id || branch.id);
    try {
      const loc = await getCurrentLocation();
      const payload = {
        name: branch.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
        attendance_radius: branch.attendance_radius || 100
      };
      await api.put(`/branches/${branch._id || branch.id}`, payload);
      toast.success(`Branch "${branch.name}" location updated! Accuracy: ${Math.round(loc.accuracy)}m`);
      fetchBranches(); // Refresh list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update branch location');
    } finally {
      setUpdatingBranchId(null);
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    
    setIsCreating(true);
    try {
      const payload = {
        name: newBranchName,
        attendance_radius: newRadius ? parseInt(newRadius) : 100
      };

      // If GPS coordinates are set, use them directly
      if (newLat && newLng) {
        payload.latitude = parseFloat(newLat);
        payload.longitude = parseFloat(newLng);
      }

      const { data } = await api.post('/branches', payload);
      setBranches([data, ...branches]);
      setNewBranchName('');
      setNewRadius('100');
      setNewLat('');
      setNewLng('');
      toast.success(`Branch ${data.name} created successfully with code ${data.code}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create branch');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col px-4 md:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0 mt-4 md:mt-0">
        <h1 className="text-lg md:text-2xl font-bold text-primary flex items-center gap-2">
          <Building2 size={24} /> Company Branches
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Create Branch Form */}
        <div className="col-span-1">
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 md:p-8 sticky top-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary/10 p-2.5 rounded-xl">
                <Building2 className="text-primary" size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">New Branch</h2>
            </div>
            
            <form onSubmit={handleCreateBranch} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Branch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Trichy Downtown"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 bg-gray-50/50 outline-none text-gray-800"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                />
              </div>

              {/* Location Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Branch Location</label>
                
                {/* Use My Location Button */}
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={isGettingLocation}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white rounded-xl font-bold shadow-lg shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 text-sm"
                >
                  {isGettingLocation ? (
                    <><Loader2 size={16} className="animate-spin" /> Getting GPS Location...</>
                  ) : (
                    <><Navigation size={16} /> Use My Current Location</>
                  )}
                </button>

                {/* Show GPS coords if set */}
                {newLat && newLng && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 mt-3 flex items-center gap-2">
                    <MapPin size={16} className="text-green-600 shrink-0" />
                    <div className="text-sm">
                      <span className="font-bold text-green-700">GPS Location Set</span>
                      <span className="text-green-600 ml-2">Lat: {newLat}, Lng: {newLng}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Attendance Radius (Meters)</label>
                <input
                  type="number"
                  placeholder="e.g. 100"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 bg-gray-50/50 outline-none text-gray-800"
                  value={newRadius}
                  onChange={(e) => setNewRadius(e.target.value)}
                />
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50 text-blue-800 p-4 rounded-xl text-sm flex gap-3 shadow-sm">
                <span className="font-bold shrink-0 mt-0.5">Tip:</span>
                <span className="leading-relaxed opacity-90">For best accuracy, go to your branch location and tap <strong>"Use My Current Location"</strong> to set the precise GPS coordinates.</span>
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full flex items-center justify-center gap-2 py-2.5 mt-4 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white rounded-xl font-bold shadow-lg shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 text-sm"
              >
                {isCreating ? 'Creating...' : <><Plus size={16} /> Create Branch</>}
              </button>
            </form>
          </div>
        </div>

        {/* Branches List */}
        <div className="col-span-1 md:col-span-2">
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex-1 overflow-hidden h-full flex flex-col transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800">Existing Branches</h2>
              <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">{branches.length} Branches</span>
            </div>
            
            {/* Desktop Table View */}
            <div className="overflow-x-auto flex-1 hidden md:block">
              <table className="w-full text-left">
                <thead className="bg-white">
                  <tr className="text-xs text-gray-400 font-bold uppercase tracking-widest border-b border-gray-100">
                    <th className="px-6 py-4">Branch Details</th>
                    <th className="px-6 py-4">Branch Code</th>
                    <th className="px-6 py-4">Location Settings</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {branches.length > 0 ? (
                    branches.map((branch) => (
                      <tr key={branch._id || branch.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-white group-hover:border-blue-100 group-hover:shadow-sm transition-all">
                              <Building2 size={18} className="text-gray-500 group-hover:text-primary transition-colors" />
                            </div>
                            <span className="font-bold text-gray-800 text-base">{branch.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-bold text-sm tracking-widest shadow-sm inline-block">
                            {branch.code}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-sm text-gray-500 font-medium">
                          <div className="flex flex-col gap-1">
                            {branch.latitude && branch.longitude ? (
                              <>
                                <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs font-bold w-max">Configured</span>
                                <span className="text-xs">Radius: {branch.attendance_radius || 100}m</span>
                                <span className="text-xs font-mono text-gray-400">{branch.latitude}, {branch.longitude}</span>
                              </>
                            ) : (
                              <span className="text-orange-500 bg-orange-50 px-2 py-0.5 rounded text-xs font-bold w-max">Not Configured</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button
                            onClick={() => handleUpdateBranchLocation(branch)}
                            disabled={updatingBranchId === (branch._id || branch.id)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white rounded-lg shadow-md shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5 font-bold text-xs disabled:opacity-50 disabled:hover:translate-y-0"
                          >
                            {updatingBranchId === (branch._id || branch.id) ? (
                              <><Loader2 size={14} className="animate-spin" /> Updating...</>
                            ) : (
                              <><Navigation size={14} /> Set My Location</>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <Building2 size={48} className="mb-4 opacity-20" />
                          <p className="font-medium text-gray-500">No branches found</p>
                          <p className="text-sm mt-1">Create your first branch using the form.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col gap-4 p-4">
              {branches.length > 0 ? (
                branches.map((branch) => (
                  <div key={branch._id || branch.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 size={18} className="text-primary" />
                        <span className="font-bold text-gray-800">{branch.name}</span>
                      </div>
                      <span className="bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold text-xs tracking-wider">{branch.code}</span>
                    </div>
                    
                    <div className="flex flex-col gap-1 text-sm">
                      {branch.latitude && branch.longitude ? (
                        <>
                          <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs font-bold w-max">Configured • Radius: {branch.attendance_radius || 100}m</span>
                          <span className="text-xs font-mono text-gray-400">{branch.latitude}, {branch.longitude}</span>
                        </>
                      ) : (
                        <span className="text-orange-500 bg-orange-50 px-2 py-0.5 rounded text-xs font-bold w-max">Not Configured</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleUpdateBranchLocation(branch)}
                      disabled={updatingBranchId === (branch._id || branch.id)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white rounded-xl font-bold shadow-lg shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5 text-sm disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {updatingBranchId === (branch._id || branch.id) ? (
                        <><Loader2 size={14} className="animate-spin" /> Updating...</>
                      ) : (
                        <><Navigation size={14} /> Set My Location</>
                      )}
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400 py-12">
                  <Building2 size={48} className="mb-4 opacity-20" />
                  <p className="font-medium text-gray-500">No branches found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBranches;
