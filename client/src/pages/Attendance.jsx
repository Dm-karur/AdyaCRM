import React, { useState, useContext, useEffect, useRef } from 'react';
import CameraCapture from '../components/CameraCapture';
import useGeolocation from '../hooks/useGeolocation';
import useOfflineStatus from '../hooks/useOfflineStatus';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { savePunchOffline, getOfflinePunches, clearOfflinePunches } from '../services/indexedDB';
import { MapPin, Clock, WifiOff, CheckCircle, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import stampAttendanceImage from '../utils/imageStamper';

// Client-side reverse geocode using BigDataCloud
const reverseGeocodeClient = async (latitude, longitude) => {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    if (!res.ok) return 'Address Not Available';
    const data = await res.json();

    const parts = [];
    if (data.locality) parts.push(data.locality);
    if (data.city && data.city !== data.locality) parts.push(data.city);
    if (data.principalSubdivision) parts.push(data.principalSubdivision);
    if (data.countryName) parts.push(data.countryName);

    return parts.length > 0 ? parts.join(', ') : 'Address Not Available';
  } catch {
    return 'Address Not Available';
  }
};

const Attendance = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { location, error: geoError, isWithinGeofence, isLoadingLocation, getLocation } = useGeolocation(user?.isFieldWorker);
  const isOffline = useOfflineStatus();

  const cameraRef = useRef();

  const [punchStatus, setPunchStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [processingStep, setProcessingStep] = useState('');

  // Check today's status on mount
  useEffect(() => {
    const checkTodayStatus = async () => {
      try {
        const { data } = await api.get('/attendance/me');
        if (data && data.length > 0) {
          const latestRecord = data[0];
          const today = new Date();
          const recordDate = new Date(latestRecord.date);

          if (
            recordDate.getDate() === today.getDate() &&
            recordDate.getMonth() === today.getMonth() &&
            recordDate.getFullYear() === today.getFullYear()
          ) {
            if (latestRecord.punchIn?.time && !latestRecord.punchOut?.time) {
              setPunchStatus('Present');
            } else if (latestRecord.punchOut?.time) {
              setPunchStatus('Punched Out');
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch today status', err);
      }
    };
    if (!isOffline) {
      checkTodayStatus();
    }
  }, [isOffline]);

  // Auto-sync offline punches when back online
  useEffect(() => {
    if (!isOffline) {
      syncOfflinePunches();
    }
  }, [isOffline]);

  const syncOfflinePunches = async () => {
    try {
      const offlinePunches = await getOfflinePunches();
      if (offlinePunches.length > 0) {
        setFeedbackMsg(`Syncing ${offlinePunches.length} offline punches...`);
        for (const punch of offlinePunches) {
          const endpoint = punch.type === 'in' ? '/attendance/punch-in' : '/attendance/punch-out';
          await api.post(endpoint, punch);
        }
        await clearOfflinePunches();
        setFeedbackMsg('Offline punches synced successfully!');
        setTimeout(() => setFeedbackMsg(''), 3000);
      }
    } catch (err) {
      console.error('Failed to sync offline punches', err);
    }
  };

  const handlePunch = async (photoDataUrl, type) => {
    setIsLoading(true);
    setFeedbackMsg('');
    setProcessingStep('Validating location...');

    if (!location && !user?.isFieldWorker) {
      setFeedbackMsg('Location required. Please allow GPS access.');
      setIsLoading(false);
      setProcessingStep('');
      return;
    }

    try {
      // Step 1: Reverse geocode the address
      let address = 'Address Not Available';
      if (location?.latitude && location?.longitude) {
        setProcessingStep('Fetching address...');
        address = await reverseGeocodeClient(location.latitude, location.longitude);
      }

      // Step 2: Stamp the image
      let finalPhoto = photoDataUrl; // stamped image
      if (photoDataUrl) {
        setProcessingStep('Generating attendance image...');
        finalPhoto = await stampAttendanceImage(photoDataUrl, {
          employeeName: user?.name || 'Employee',
          employeeId: user?.employeeId || 'N/A',
          department: user?.department || 'General',
          latitude: location?.latitude || 0,
          longitude: location?.longitude || 0,
          accuracy: location?.accuracy || 0,
          address: address,
          punchType: type === 'in' ? 'Check In' : 'Check Out',
          timestamp: new Date(),
        });
      }

      // Step 3: Send Payload
      setProcessingStep('Saving record...');
      const payload = {
        photo: finalPhoto, // stamped
        originalSelfie: photoDataUrl, // unstamped
        location,
        device: {
          browser: navigator.userAgent,
          os: navigator.platform,
        },
        type,
        isOfflineRecorded: isOffline,
        offlineTimestamp: new Date().toISOString()
      };

      if (isOffline) {
        await savePunchOffline(payload);
        setFeedbackMsg(`Punched ${type} offline successfully. Will sync when online.`);
      } else {
        const endpoint = type === 'in' ? '/attendance/punch-in' : '/attendance/punch-out';
        await api.post(endpoint, payload);
        setFeedbackMsg(`Punched ${type} successfully!`);
        setPunchStatus(type === 'in' ? 'Present' : 'Punched Out');
      }
    } catch (error) {
      setFeedbackMsg(error.response?.data?.message || `Failed to punch ${type}`);
    } finally {
      setIsLoading(false);
      setProcessingStep('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 py-8">
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-500 hover:text-primary mb-4 transition-colors">
        <ArrowLeft size={20} /> Back to Dashboard
      </button>

      <div className="card text-center mb-6 relative overflow-hidden">
        <h1 className="text-2xl font-bold mb-2 text-primary">Mark Attendance</h1>
        <p className="text-gray-500 mb-6">{new Date().toDateString()}</p>

        {isOffline && (
          <div className="bg-orange-50 text-warning p-3 mb-4 rounded-xl flex items-center justify-center gap-2">
            <WifiOff size={18} /> Offline Mode Active
          </div>
        )}

        {/* Location Status Section */}
        <div className="mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center gap-3">
          {isLoadingLocation ? (
            <div className="flex items-center gap-2 text-primary animate-pulse">
              <Loader2 size={18} className="animate-spin" /> Fetching GPS Location...
            </div>
          ) : geoError ? (
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="text-danger flex items-center gap-2">
                <MapPin size={18} /> {geoError}
              </div>
              <button onClick={getLocation} className="btn-secondary py-1.5 px-4 text-sm flex items-center gap-2">
                <RefreshCw size={14} /> Retry Location
              </button>
            </div>
          ) : location ? (
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="text-gray-700 text-sm flex flex-col gap-1 items-center">
                <div className="flex items-center gap-2 font-medium text-primary">
                  <MapPin size={16} /> Location Acquired
                </div>
                <span>Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}</span>
                <span className="text-xs text-gray-400">Accuracy: {Math.round(location.accuracy)} meters</span>
              </div>
              {!isWithinGeofence && !user?.isFieldWorker && (
                <div className="text-danger text-sm font-medium mt-1">
                  Outside Geofence Area
                </div>
              )}
            </div>
          ) : null}
        </div>

        {feedbackMsg && (
          <div className={`p-3 mb-4 rounded-xl flex items-center justify-center gap-2 ${feedbackMsg.includes('success') ? 'bg-green-50 text-success' : 'bg-blue-50 text-accent'}`}>
            {feedbackMsg.includes('success') && <CheckCircle size={18} />}
            {feedbackMsg}
          </div>
        )}

        {/* Processing indicator */}
        {isLoading && processingStep && (
          <div className="bg-indigo-50 text-primary p-3 mb-4 rounded-xl flex items-center justify-center gap-2 animate-pulse">
            <Loader2 size={18} className="animate-spin" />
            {processingStep}
          </div>
        )}

        <div className="mb-6">
          <CameraCapture ref={cameraRef} onCapture={(photo) => handlePunch(photo, punchStatus === 'Present' ? 'out' : 'in')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            disabled={isLoading || punchStatus === 'Present' || isLoadingLocation || (!location && !user?.isFieldWorker)}
            className="btn-primary flex items-center justify-center gap-2 py-4 disabled:opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={() => {
              if (cameraRef.current) {
                cameraRef.current.capturePhoto();
              } else {
                handlePunch(null, 'in');
              }
            }}
          >
            <Clock size={20} /> Punch In
          </button>

          <button
            disabled={isLoading || punchStatus !== 'Present' || isLoadingLocation || (!location && !user?.isFieldWorker)}
            className="btn-secondary bg-red-50 text-danger border-danger hover:bg-red-100 flex items-center justify-center gap-2 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => {
              if (cameraRef.current) {
                cameraRef.current.capturePhoto();
              } else {
                handlePunch(null, 'out');
              }
            }}
          >
            <Clock size={20} /> Punch Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
