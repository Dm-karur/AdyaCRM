const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerEntry',
    required: true
  },
  items: [{
    product: { type: String, required: true },
    model: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    mrp: { type: Number, required: true },
    discountedPrice: { type: Number, required: true }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Legacy fields (optional)
  product: { type: String },
  model: { type: String },
  mrp: { type: Number },
  discountedPrice: { type: Number },
  date: {
    type: Date,
    default: Date.now
  },
  customerAddress: {
    type: String
  }
}, {
  timestamps: true
});

const Quote = mongoose.model('Quote', quoteSchema);
module.exports = Quote;
