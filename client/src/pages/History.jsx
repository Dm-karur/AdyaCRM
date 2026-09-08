import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { X, Search, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const History = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const { data } = await api.get(`/attendance/me`);
        setAttendanceRecords(data);
      } catch (err) {
        console.error('Failed to fetch attendance history', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  const getPhotoUrl = (photo) => {
    if (!photo) return null;
    return photo;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">My Attendance History</h1>
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-primary font-medium">
          &larr; Back
        </button>
      </div>

      <div className="card overflow-x-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        {isLoading ? (
          <p className="text-center py-4 text-gray-500">Loading records...</p>
        ) : attendanceRecords.length === 0 ? (
          <div className="flex justify-center items-center py-10 text-gray-400 flex-col gap-2">
            <Search size={32} className="opacity-20" />
            <p>No attendance records found.</p>
          </div>
        ) : (
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead>
              <tr className="border-b text-sm text-gray-500 uppercase tracking-wider font-bold">
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 pr-4 text-center">Images (In/Out)</th>
                <th className="pb-3 pr-4">Punch In</th>
                <th className="pb-3 pr-4">Punch Out</th>
                <th className="pb-3 pr-4 text-center">Status</th>
                <th className="pb-3 pr-4">Location</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.map(record => {
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
                            className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-soft cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                            title="Punch In: Click to view full proof"
                            onClick={() => setPreviewImage(getPhotoUrl(displayPhoto))}
                          />
                        ) : (
                          <span className="text-gray-400 text-[10px] font-medium bg-gray-100 px-1 py-0.5 rounded">No IN Photo</span>
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
                            <span className="text-gray-400 text-[10px] font-medium bg-gray-100 px-1 py-0.5 rounded">No OUT Photo</span>
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
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        record.status === 'Present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
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
        )}
      </div>

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
    </div>
  );
};

export default History;
