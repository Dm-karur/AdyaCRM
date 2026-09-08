import React, { useState } from 'react';
import api from '../services/api';
import { Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../context/ConfirmContext';

const AdminHolidays = () => {
  const [formData, setFormData] = useState({ date: '', reason: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const confirm = useConfirm();

  const handleHolidaySubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.date || !formData.reason) return toast.error('Please provide both date and reason.');
    setIsSubmitting(true);
    try {
      await api.post('/admin/attendance/mark-holiday', {
        date: formData.date,
        reason: formData.reason
      });
      toast.success('Holiday marked for all employees successfully');
      setFormData({ date: '', reason: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark holiday');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveHoliday = async () => {
    if (!formData.date) return toast.error('Please select a date to remove the holiday from.');
    if (!(await confirm('Are you sure you want to remove the holiday for this date? This will delete all holiday attendance records for that day.'))) return;
    
    setIsSubmitting(true);
    try {
      await api.post('/admin/attendance/remove-holiday', {
        date: formData.date
      });
      toast.success('Holiday removed for all employees successfully');
      setFormData({ date: '', reason: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove holiday');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-red-100 rounded-xl text-danger">
          <Calendar size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mark Holidays</h1>
          <p className="text-gray-500 text-sm">Marks a holiday for all active employees on the selected date.</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm p-6 md:p-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Date</label>
            <input 
              type="date" 
              required 
              className="input-field w-full text-lg py-3" 
              value={formData.date} 
              onChange={e => setFormData({...formData, date: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Reason / Event Name</label>
            <input 
              type="text" 
              required 
              className="input-field w-full text-lg py-3" 
              placeholder="e.g. National Holiday" 
              value={formData.reason} 
              onChange={e => setFormData({...formData, reason: e.target.value})} 
            />
          </div>
          <div className="flex gap-4 mt-4">
            <button 
              type="button" 
              onClick={handleHolidaySubmit}
              disabled={isSubmitting || !formData.date || !formData.reason} 
              className="flex-1 bg-primary hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-colors shadow-soft text-lg"
            >
              {isSubmitting ? 'Processing...' : 'Mark Holiday'}
            </button>
            <button 
              type="button" 
              onClick={handleRemoveHoliday}
              disabled={isSubmitting || !formData.date} 
              className="flex-1 bg-red-50 hover:bg-red-100 text-danger border-2 border-danger py-3 rounded-xl font-bold transition-colors shadow-soft text-lg"
            >
              Remove Holiday
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHolidays;
