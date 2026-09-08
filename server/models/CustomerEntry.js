const mongoose = require('mongoose');

const customerEntrySchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  company: {
    type: String,
    default: '-'
  },
  email: {
    type: String,
    default: '-'
  },
  area: {
    type: String,
    default: '-'
  },
  pincode: {
    type: String,
    default: '-'
  },
  phone: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'NEW LEAD'
  },
  source: {
    type: String,
    default: 'WEBSITE'
  },
  referredBy: {
    type: String,
    default: '-'
  },
  serviceInterest: {
    type: String,
    default: '-'
  },
  budget: {
    type: String,
    default: '-'
  },
  priority: {
    type: String,
    enum: ['WARM', 'COLD', 'HOT'],
    default: 'WARM'
  },
  photo: {
    type: String,
    default: null
  },
  bills: [{
    url: String,
    originalName: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  purchaseBills: [{
    billNumber: { type: String, required: true },
    billedDate: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  brand: {
    type: String,
    enum: ['Bosch', 'Furniture', 'None'],
    default: 'None'
  },
  branch: {
    type: String,
    default: 'Main'
  }
}, {
  timestamps: true
});

const CustomerEntry = mongoose.model('CustomerEntry', customerEntrySchema);
module.exports = CustomerEntry;
