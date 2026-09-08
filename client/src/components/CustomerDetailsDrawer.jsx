import React, { useState, useEffect } from 'react';
import { Phone, MoreHorizontal, Upload, FileText, ChevronLeft, Clock, CheckCircle2, FilePlus, X, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
applyPlugin(jsPDF);
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';

const numberToWords = (num) => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];
  if ((num = num.toString()).length > 9) return 'Amount too large';
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + a[n[5][1]]) + 'Rupees Only' : 'Rupees Only';
  return str.trim();
};

const CustomerDetailsDrawer = ({ isOpen, onClose, lead, onLeadUpdated }) => {
  const { user } = React.useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('Details');
  const [leftTab, setLeftTab] = useState('Activities');
  const [followups, setFollowups] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);

  // Quote modal state
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isUploadingBill, setIsUploadingBill] = useState(false);
  const [quoteItems, setQuoteItems] = useState([
    { product: '', model: '', mrp: '', discountedPrice: '', quantity: 1 }
  ]);
  const [customerAddress, setCustomerAddress] = useState('');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [followupForm, setFollowupForm] = useState({
    date: '',
    description: ''
  });
  const [isSubmittingFollowup, setIsSubmittingFollowup] = useState(false);

  // Purchase Bill state
  const [purchaseBillForm, setPurchaseBillForm] = useState({ billNumber: '', billedDate: '', product: '' });
  const [isSubmittingPurchaseBill, setIsSubmittingPurchaseBill] = useState(false);

  useEffect(() => {
    if (isOpen && lead) {
      fetchFollowups();
      fetchQuotes();
    }
  }, [isOpen, lead]);

  const fetchFollowups = async () => {
    try {
      const { data } = await api.get(`/followups/lead/${lead._id}`);
      setFollowups(data);
    } catch (error) {
      console.error('Failed to fetch followups', error);
    }
  };

  const fetchQuotes = async () => {
    try {
      const { data } = await api.get(`/quotes/lead/${lead._id}`);
      setQuotes(data);
    } catch (error) {
      console.error('Failed to fetch quotes', error);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const { data } = await api.post(`/customer-entries/${lead._id}/photo`, formData);
      if (onLeadUpdated) onLeadUpdated(data);
    } catch (error) {
      console.error('Failed to upload photo', error);
      toast.error('Failed to upload photo');
    }
  };

  const handleBillUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingBill(true);
    const formData = new FormData();
    formData.append('bill', file);

    try {
      const { data } = await api.post(`/customer-entries/${lead._id}/bills`, formData);
      if (onLeadUpdated) onLeadUpdated(data);
      toast.success('Bill uploaded successfully!');
    } catch (error) {
      console.error('Failed to upload bill', error);
      toast.error(error.response?.data?.message || 'Failed to upload bill');
    } finally {
      setIsUploadingBill(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingQuote(true);
    try {
      const { data } = await api.post('/quotes', {
        leadId: lead._id,
        items: quoteItems,
        customerAddress: customerAddress
      });
      toast.success('Quote generated successfully! The PDF will now download.');
      setIsQuoteModalOpen(false);
      setQuoteItems([{ product: '', model: '', mrp: '', discountedPrice: '', quantity: 1 }]);
      setCustomerAddress('');
      fetchQuotes();
      fetchFollowups(); // Refresh activities to show the newly created followup
      setActiveTab('Quotes');

      // Automatically download the generated PDF
      downloadQuotePDF(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate quote.');
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  const handleFollowupSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingFollowup(true);
    try {
      await api.post('/followups', {
        leadId: lead._id,
        ...followupForm
      });
      setIsFollowupModalOpen(false);
      setFollowupForm({ date: '', description: '' });
      fetchFollowups(); // Refresh activities and follow-ups list
    } catch (error) {
      console.error(error);
      toast.error('Failed to add follow-up.');
    } finally {
      setIsSubmittingFollowup(false);
    }
  };

  const handlePurchaseBillSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingPurchaseBill(true);
    try {
      const { data } = await api.post(`/customer-entries/${lead._id}/purchase-bills`, purchaseBillForm);
      if (onLeadUpdated) onLeadUpdated(data);
      setPurchaseBillForm({ billNumber: '', billedDate: '', product: '' });
      toast.success('Purchase bill added successfully!');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to add purchase bill.');
    } finally {
      setIsSubmittingPurchaseBill(false);
    }
  };

  const viewPurchaseBill = (bill) => {
    const html = `
      <html>
        <head>
          <title>Purchase Bill Details</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; background-color: #f9fafb; color: #111827; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            h1 { color: #4F46E5; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
            .detail { margin: 15px 0; font-size: 16px; }
            .label { font-weight: bold; color: #6b7280; width: 120px; display: inline-block; }
            .value { font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Purchase Bill Details</h1>
            <div class="detail"><span class="label">Bill Number:</span> <span class="value">${bill.billNumber}</span></div>
            <div class="detail"><span class="label">Billed Date:</span> <span class="value">${new Date(bill.billedDate).toLocaleDateString()}</span></div>
            <div class="detail"><span class="label">Product:</span> <span class="value">${bill.product || 'N/A'}</span></div>
          </div>
        </body>
      </html>
    `;
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  const downloadQuotePDF = (quote) => {
    try {
      const doc = new jsPDF();
      
      const isBosch = lead?.employeeId?.brand === 'Bosch';
      
      const primaryColor = isBosch ? [0, 0, 128] : [139, 0, 0]; // Navy Blue or Dark Red
      const companyName = isBosch ? 'SRI NAVALADI ASSOCIATES' : 'ADYA FURNITURE';
      const addressLine1 = isBosch ? 'Trichy,Dindigul,karur' : 'Salem By Pass Road, Opposite to Indian Oil Petrol Bunk,RamNagar ';
      const addressLine2 = isBosch ? '' : 'Karur  - 639006';
      const phone = isBosch ? '9750990024,9842320024' : '9095060024';
      const email = isBosch ? 'srinavaladiassociates@gmail.com' : 'adyaathome@gmail.com';
      const rightSubText = isBosch ? 'HOME APPLIANCES' : 'FURNITURE';

      const textColor = [0, 0, 0];

      // Header Left
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(companyName, 14, 20);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(addressLine1, 14, 26);
      if (addressLine2) doc.text(addressLine2, 14, 31);
      const phoneY = addressLine2 ? 36 : 31;
      const emailY = addressLine2 ? 41 : 36;
      doc.text(`Phone no.: ${phone}`, 14, phoneY);
      doc.text(`Email: ${email}`, 14, emailY);

      // Header Right (Logo substitute)
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(companyName, 196, 25, { align: 'right' });
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(rightSubText, 196, 30, { align: 'right' });

      // Red Horizontal Line
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(14, 45, 196, 45);

      // Title 'Estimate'
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Estimate', 105, 53, { align: 'center' });

      // Customer & Details
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Estimate For', 14, 65);
      doc.text('Estimate Details', 196, 65, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.text(`Estimate No.: ${String(quote._id || '').slice(-6).toUpperCase()}`, 196, 73, { align: 'right' });
      doc.text(`Date: ${formatDate(quote.date)}`, 196, 78, { align: 'right' });
      
      const creatorName = quote.createdBy?.name || user?.name || lead.employeeId?.name || 'Unknown';
      doc.text(`Created By: ${creatorName}`, 196, 83, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      const customerName = String(lead.name || 'Unknown Lead');
      doc.text(customerName, 14, 73);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      if (quote.customerAddress) {
        // Handle address wrapping if too long
        const splitAddress = doc.splitTextToSize(quote.customerAddress, 80);
        doc.text(splitAddress, 14, 78);
        const addressHeight = splitAddress.length * 4;
        doc.text(`Phone: ${lead.phone || 'N/A'}`, 14, 78 + addressHeight);
      } else {
        doc.text(`Phone: ${lead.phone || 'N/A'}`, 14, 78);
      }

      // Table using autoTable
      const items = quote.items && quote.items.length > 0 ? quote.items : [quote];
      
      const tableData = items.map((item, index) => [
        (index + 1).toString(),
        `${item.product} - ${item.model}`,
        item.quantity ? item.quantity.toString() : '1',
        `Rs. ${Number(item.mrp).toLocaleString()}`,
        `Rs. ${Number(item.discountedPrice * (item.quantity || 1)).toLocaleString()}`
      ]);

      const totalDiscounted = items.reduce((sum, item) => sum + (Number(item.discountedPrice) * (item.quantity || 1)), 0);

      doc.autoTable({
        startY: 90,
        head: [['#', 'Item name', 'Quantity', 'Price/ unit', 'Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4, textColor: [0, 0, 0], lineColor: [200, 200, 200] },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 35, halign: 'right' },
          4: { cellWidth: 35, halign: 'right' }
        },
        foot: [['', 'Total', items.reduce((sum, item) => sum + Number(item.quantity || 1), 0).toString(), '', `Rs. ${totalDiscounted.toLocaleString()}`]],
        footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' }
      });

      const finalY = doc.lastAutoTable.finalY + 15;

      // Estimate Amount In Words
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Estimate Amount In Words', 14, finalY);

      doc.setFont('helvetica', 'normal');
      const amountInWords = numberToWords(totalDiscounted);
      doc.text(amountInWords, 14, finalY + 8);

      // Totals section (bottom right)
      doc.setFont('helvetica', 'bold');
      doc.text('Sub Total', 130, finalY);
      doc.text(`Rs. ${totalDiscounted.toLocaleString()}`, 196, finalY, { align: 'right' });

      // Red Total Block
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(130, finalY + 4, 66, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('Total', 132, finalY + 9.5);
      doc.text(`Rs. ${totalDiscounted.toLocaleString()}`, 194, finalY + 9.5, { align: 'right' });

      const safeName = String(lead.name || 'Client').replace(/\s+/g, '_');
      const safeProduct = String(items[0].product || 'Product').replace(/\s+/g, '_');
      doc.save(`Estimate_${safeName}_${safeProduct}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(`Error generating PDF: ${error.message}`);
    }
  };

  if (!isOpen || !lead) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const tabs = ['Details', 'Quotes', 'Follow Ups', 'Bills', 'Purchases'];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[90%] max-w-6xl bg-[#f8fafc] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col overflow-hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0 z-20">
          <div className="flex items-center gap-2 font-bold text-gray-800">
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors -ml-1">
              <ChevronLeft size={20} />
            </button>
            <span className="truncate max-w-[200px]">{lead.name}</span>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Desktop Flex Container / Mobile Scroll Container */}
        <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden w-full relative">

          {/* Left Sidebar */}
          <div className="w-full md:w-[300px] bg-white border-b md:border-b-0 md:border-r border-gray-100 flex flex-col shrink-0">
            <div className="p-8 flex flex-col items-center border-b border-gray-100">
              <div className="relative mb-4 group cursor-pointer">
                {lead.photo ? (
                  <div className="relative w-24 h-24 rounded-full shadow-lg border-2 border-white overflow-visible">
                    <img
                      src={`${api.defaults.baseURL.replace('/api', '')}${lead.photo}`}
                      alt={lead.name}
                      className="w-full h-full object-cover rounded-full cursor-pointer"
                      onClick={() => setIsPhotoViewerOpen(true)}
                    />
                    <label className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-md border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors z-20" title="Update Photo">
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                      <Upload size={14} className="text-gray-600" />
                    </label>
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-full" onClick={() => setIsPhotoViewerOpen(true)}>
                      <span className="text-white text-xs font-bold uppercase tracking-wider">View</span>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer block relative">
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex flex-col items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden">
                      <span className="group-hover:opacity-0 transition-opacity">{lead.name?.charAt(0).toUpperCase()}</span>
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload size={20} className="text-white mb-1" />
                        <span className="text-[9px] uppercase font-bold tracking-wider">Upload</span>
                      </div>
                    </div>
                    <div className="absolute top-0 left-0 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full z-10 pointer-events-none"></div>
                  </label>
                )}
              </div>

              <h2 className="text-xl font-bold text-gray-900">{lead.name}</h2>
              <p className="text-sm text-gray-400 font-medium mt-1">Direct Client</p>

              <div className="flex gap-4 mt-6 w-full justify-center">
                {/* Removed Call Button */}

                {/* More Button */}
                <button className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-600 border border-gray-100 flex items-center justify-center group-hover:-translate-y-1 transition-transform">
                    <MoreHorizontal size={20} />
                  </div>
                  <span className="text-xs font-bold text-gray-600">More</span>
                </button>
              </div>
            </div>

            <div className="flex border-b border-gray-100">
              <button
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider ${leftTab === 'Deal Info' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
                onClick={() => setLeftTab('Deal Info')}
              >
                Deal Info
              </button>
              <button
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider ${leftTab === 'Activities' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
                onClick={() => setLeftTab('Activities')}
              >
                Activities
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              {leftTab === 'Activities' && (
                <div className="space-y-4">
                  {/* System Activity */}
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-gray-900 text-sm">System</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">{formatDate(lead.createdAt)}</span>
                    </div>
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="font-medium">New Lead Created:</p>
                      <p className="text-gray-500 mt-1">{lead.serviceInterest || lead.source}</p>
                    </div>
                  </div>

                  {/* Followups */}
                  {followups.map(f => {
                    const d = new Date(f.date);
                    const isOverdue = d < new Date() && f.status !== 'DONE';
                    return (
                      <div key={f._id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
                        {isOverdue && <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>}
                        {f.status === 'DONE' && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>}

                        <div className="flex justify-between items-start mb-2 pl-2">
                          <span className="font-bold text-gray-900 text-sm flex items-center gap-1">
                            <Clock size={14} className={f.status === 'DONE' ? 'text-emerald-500' : 'text-primary'} />
                            {!isNaN(d.getTime()) ? d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A'}
                          </span>
                          {f.status === 'DONE' && (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                          )}
                        </div>
                        <div className="text-sm text-gray-600 bg-blue-50/50 p-3 rounded-lg border border-blue-100 ml-2 mt-1">
                          <p className="text-gray-700 font-medium text-xs">{f.description}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Created by: <span className="text-primary">{f.creatorName || 'Unknown'}</span></p>
                        </div>
                      </div>
                    );
                  })}

                  {followups.length === 0 && (
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                      <p className="text-gray-400 font-medium text-xs">No follow-ups recorded yet</p>
                    </div>
                  )}
                </div>
              )}

              {leftTab === 'Deal Info' && (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Company</p>
                    <p className="text-sm font-semibold text-gray-800">{lead.company}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Status</p>
                    <p className="text-sm font-semibold text-gray-800">{lead.status}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Budget</p>
                    <p className="text-sm font-semibold text-gray-800">{lead.budget}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Main Content */}
          <div className="flex-1 flex flex-col bg-white overflow-visible md:overflow-hidden shrink-0">
            {/* Header */}
            <div className="px-6 md:px-10 py-6 md:py-8 shrink-0">
              <div className="hidden md:flex items-center gap-2 text-sm font-bold text-gray-400 mb-6">
                <button onClick={onClose} className="hover:text-gray-800 flex items-center gap-1 transition-colors">
                  <ChevronLeft size={16} /> Back
                </button>
                <span>›</span>
                <span className="text-gray-300">{lead.name}</span>
              </div>

              <div className="flex items-end justify-between mb-8">
                <div>
                  <h1 className="text-4xl font-extrabold text-[#1e293b] tracking-tight">{lead.serviceInterest && lead.serviceInterest !== '-' ? lead.serviceInterest : (lead.source || '')}</h1>
                  <div className="flex items-center gap-4 mt-4 text-sm font-bold text-gray-400">
                    <span>Created: {formatDate(lead.createdAt)}</span>
                    <button
                      onClick={() => setIsQuoteModalOpen(true)}
                      className="flex items-center gap-2 px-3 py-1.5 border border-primary text-primary rounded-full hover:bg-primary/5 transition-colors"
                    >
                      <FilePlus size={14} /> Generate Quote
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-gray-100">
                {tabs.map(tab => (
                  <button
                    key={tab}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${activeTab === tab
                      ? 'bg-[#1e293b] text-white border-[#1e293b] shadow-md'
                      : 'bg-white text-gray-500 border-gray-200 shadow-sm hover:bg-gray-50'
                      }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    <span>{tab}</span>
                    {tab === 'Purchases' && lead?.purchaseBills?.length > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>
                        {lead.purchaseBills.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-10 bg-[#f8fafc] m-6 rounded-3xl border border-gray-100 mt-0">


              {activeTab === 'Details' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-gray-100">
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Email</p>
                      <p className="font-medium text-gray-800">{lead.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Phone</p>
                      <p className="font-medium text-gray-800">{lead.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Source</p>
                      <p className="font-medium text-gray-800">{lead.source}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Priority</p>
                      <p className="font-medium text-gray-800">{lead.priority}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Attended by</p>
                      <p className="font-medium text-gray-800">{lead.employeeId?.name || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'Quotes' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Generated Quotations</h3>
                  </div>

                  {quotes.length === 0 ? (
                    <div className="h-48 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 bg-white">
                      <p className="font-bold text-sm uppercase tracking-widest text-gray-400">No Quotes Generated</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {quotes.map(quote => {
                        const items = quote.items && quote.items.length > 0 ? quote.items : [quote];
                        const title = items.length > 1 ? `${items[0].product} + ${items.length - 1} more` : items[0].product;
                        const subTitle = items.length > 1 ? `${items.length} items` : `Model: ${items[0].model}`;
                        const totalMrp = items.reduce((sum, item) => sum + (Number(item.mrp) * (item.quantity || 1)), 0);
                        const totalDiscounted = items.reduce((sum, item) => sum + (Number(item.discountedPrice) * (item.quantity || 1)), 0);
                        
                        return (
                          <div key={quote._id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:border-primary/30 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                              <FileText size={48} />
                            </div>
                            <div className="relative z-10">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="text-lg font-bold text-gray-900 truncate max-w-[180px]">{title}</h4>
                                  <p className="text-sm font-medium text-gray-500">{subTitle}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase">{formatDate(quote.date)}</span>
                                  {quote.createdBy?.name && (
                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                                      By: <span className="text-primary">{quote.createdBy.name}</span>
                                    </span>
                                  )}
                                  <button
                                    onClick={() => downloadQuotePDF(quote)}
                                    className="text-primary hover:text-primary-dark transition-colors bg-primary/10 p-1.5 rounded-md flex items-center gap-1.5 mt-1"
                                  >
                                    <Download size={14} /> <span className="text-[10px] font-bold uppercase">PDF</span>
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2 mt-6">
                                <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total MRP</span>
                                  <span className="font-bold text-gray-400 line-through">₹{totalMrp.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                  <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Final Price</span>
                                  <span className="text-xl font-black text-emerald-600">₹{totalDiscounted.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'Follow Ups' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Follow-ups</h3>
                    <button
                      onClick={() => setIsFollowupModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-sm font-bold hover:bg-primary-dark transition-colors shadow-sm"
                    >
                      <FilePlus size={16} /> Add Follow-up
                    </button>
                  </div>

                  {followups.length === 0 ? (
                    <div className="h-48 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 bg-white">
                      <p className="font-bold text-sm uppercase tracking-widest text-gray-400">No Follow-ups Found</p>
                      <p className="text-xs mt-2">Click the button above to schedule one.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {followups.map(f => {
                        const d = new Date(f.date);
                        const isOverdue = d < new Date() && f.status !== 'DONE';
                        return (
                          <div key={f._id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                            {isOverdue && <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>}
                            {f.status === 'DONE' && <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>}

                            <div className="flex justify-between items-start mb-3">
                              <span className="font-bold text-gray-900 flex items-center gap-2">
                                <Clock size={16} className={f.status === 'DONE' ? 'text-emerald-500' : 'text-primary'} />
                                {!isNaN(d.getTime()) ? d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A'}
                              </span>
                              <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider ${f.status === 'DONE' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                {f.status}
                              </span>
                            </div>
                            <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100 mt-1">
                              {f.description}
                              <p className="text-[10px] text-gray-400 font-bold uppercase mt-2">Created by: <span className="text-primary">{f.creatorName || 'Unknown'}</span></p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'Bills' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Previous Bills</h3>
                    <label className={`flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-sm font-bold hover:bg-primary-dark transition-colors shadow-sm cursor-pointer ${isUploadingBill ? 'opacity-50 pointer-events-none' : ''}`}>
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleBillUpload} disabled={isUploadingBill} />
                      <Upload size={16} /> {isUploadingBill ? 'Uploading...' : 'Upload Bill'}
                    </label>
                  </div>

                  {!lead.bills || lead.bills.length === 0 ? (
                    <div className="h-48 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 bg-white">
                      <p className="font-bold text-sm uppercase tracking-widest text-gray-400">No Bills Uploaded</p>
                      <p className="text-xs mt-2">Use the upload button to add previous bills.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {lead.bills.map((bill, index) => (
                        <div key={index} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-colors">
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <FileText size={24} />
                            </div>
                            <div className="overflow-hidden">
                              <p className="font-bold text-gray-900 text-sm truncate">{bill.originalName}</p>
                              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                <Clock size={12} /> {formatDate(bill.uploadedAt)}
                              </p>
                            </div>
                          </div>
                          <a
                            href={`${api.defaults.baseURL.replace('/api', '')}${bill.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                            title="Download/View"
                          >
                            <Download size={18} />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'Purchases' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Frequent Purchases</h3>
                  </div>

                  {user?.role !== 'Admin' && (
                    <form onSubmit={handlePurchaseBillSubmit} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row items-end gap-4">
                      <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Bill Number <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={purchaseBillForm.billNumber}
                          onChange={(e) => setPurchaseBillForm({ ...purchaseBillForm, billNumber: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm text-gray-700"
                          placeholder="Enter Bill Number"
                        />
                      </div>
                      <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Product <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={purchaseBillForm.product}
                          onChange={(e) => setPurchaseBillForm({ ...purchaseBillForm, product: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm text-gray-700"
                          placeholder="Enter Product"
                        />
                      </div>
                      <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Billed Date <span className="text-red-500">*</span></label>
                        <input
                          type="date"
                          required
                          value={purchaseBillForm.billedDate}
                          onChange={(e) => setPurchaseBillForm({ ...purchaseBillForm, billedDate: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm text-gray-700"
                        />
                      </div>
                      <button type="submit" disabled={isSubmittingPurchaseBill} className="w-full md:w-auto bg-primary text-white px-5 py-2 h-[38px] rounded-lg text-sm font-bold hover:bg-primary-dark transition-colors disabled:opacity-50">
                        {isSubmittingPurchaseBill ? 'Adding...' : 'Add Bill'}
                      </button>
                    </form>
                  )}

                  {!lead.purchaseBills || lead.purchaseBills.length === 0 ? (
                    <div className="h-48 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 bg-white">
                      <p className="font-bold text-sm uppercase tracking-widest text-gray-400">No Purchase Bills</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {lead.purchaseBills.map((bill, index) => (
                        <div 
                          key={index} 
                          onClick={() => viewPurchaseBill(bill)}
                          className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-colors cursor-pointer"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900">Bill: {bill.billNumber}</span>
                            {bill.product && <span className="text-sm text-gray-700 mt-0.5">{bill.product}</span>}
                            <span className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <Clock size={12} /> {formatDate(bill.billedDate)}
                            </span>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <FileText size={18} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab !== 'Details' && activeTab !== 'Quotes' && activeTab !== 'Follow Ups' && activeTab !== 'Bills' && activeTab !== 'Purchases' && (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                  <p className="font-bold text-sm uppercase tracking-widest text-gray-400">Content for {activeTab} coming soon</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Followup Modal */}
      {isFollowupModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Add Follow-up</h3>
                <p className="text-sm text-gray-500 mt-1">For {lead.name}</p>
              </div>
              <button onClick={() => setIsFollowupModalOpen(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleFollowupSubmit} className="flex flex-col overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Date & Time <span className="text-red-500">*</span></label>
                  <input
                    type="datetime-local"
                    required
                    value={followupForm.date}
                    onChange={(e) => setFollowupForm({ ...followupForm, date: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Description <span className="text-red-500">*</span></label>
                  <textarea
                    required
                    rows="3"
                    placeholder="e.g. Call to discuss quotation..."
                    value={followupForm.description}
                    onChange={(e) => setFollowupForm({ ...followupForm, description: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-gray-700 resize-none"
                  />
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-gray-50/50 rounded-b-2xl">
                <button type="button" onClick={() => setIsFollowupModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
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

      {/* Quote Modal */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Generate Quotation</h3>
                <p className="text-sm text-gray-500 mt-1">For {lead.name}</p>
              </div>
              <button onClick={() => setIsQuoteModalOpen(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleQuoteSubmit} className="flex flex-col overflow-hidden max-h-[70vh]">
              <div className="p-5 space-y-6 overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Customer Address <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <textarea
                    rows="2"
                    placeholder="Enter customer address for quotation..."
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-gray-700 resize-none"
                  />
                </div>
                {quoteItems.map((item, index) => (
                  <div key={index} className="relative bg-gray-50 p-4 rounded-xl border border-gray-100">
                    {quoteItems.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => setQuoteItems(quoteItems.filter((_, i) => i !== index))}
                        className="absolute -top-2 -right-2 bg-white text-red-500 hover:bg-red-50 p-1.5 rounded-full shadow-sm border border-gray-100 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Product {index + 1} <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Washing Machine"
                          value={item.product}
                          onChange={(e) => {
                            const newItems = [...quoteItems];
                            newItems[index].product = e.target.value;
                            setQuoteItems(newItems);
                          }}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-gray-700"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Model <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. WM-2023-X"
                            value={item.model}
                            onChange={(e) => {
                              const newItems = [...quoteItems];
                              newItems[index].model = e.target.value;
                              setQuoteItems(newItems);
                            }}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-gray-700"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Qty <span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...quoteItems];
                              newItems[index].quantity = parseInt(e.target.value) || 1;
                              setQuoteItems(newItems);
                            }}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-gray-700"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">MRP (₹) <span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={item.mrp}
                            onChange={(e) => {
                              const newItems = [...quoteItems];
                              newItems[index].mrp = e.target.value;
                              setQuoteItems(newItems);
                            }}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-gray-700"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Discounted/Unit (₹) <span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={item.discountedPrice}
                            onChange={(e) => {
                              const newItems = [...quoteItems];
                              newItems[index].discountedPrice = e.target.value;
                              setQuoteItems(newItems);
                            }}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-gray-700"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => setQuoteItems([...quoteItems, { product: '', model: '', quantity: 1, mrp: '', discountedPrice: '' }])}
                  className="w-full py-3 border-2 border-dashed border-gray-200 text-gray-500 font-bold text-sm rounded-xl hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                  <FilePlus size={16} /> Add Another Product
                </button>
              </div>
              <div className="p-4 border-t border-gray-100 flex justify-between items-center shrink-0 bg-white">
                <div className="text-sm font-bold text-gray-700">
                  Total: ₹{quoteItems.reduce((acc, item) => acc + ((Number(item.discountedPrice) || 0) * (item.quantity || 1)), 0).toLocaleString()}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsQuoteModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmittingQuote} className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-dark transition-colors disabled:opacity-50">
                    {isSubmittingQuote ? 'Generating...' : 'Create Quote'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Photo Viewer Modal */}
      {isPhotoViewerOpen && lead.photo && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex flex-col items-center justify-center p-4">
          <div className="absolute top-4 right-4 flex gap-4">
            <button onClick={() => setIsPhotoViewerOpen(false)} className="p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
          <img
            src={`${api.defaults.baseURL.replace('/api', '')}${lead.photo}`}
            alt={lead.name}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </>
  );
};

const UserPlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <line x1="19" y1="8" x2="19" y2="14"></line>
    <line x1="22" y1="11" x2="16" y2="11"></line>
  </svg>
)

export default CustomerDetailsDrawer;

