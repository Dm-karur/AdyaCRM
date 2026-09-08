const Quote = require('../models/Quote');
const Followup = require('../models/Followup');

// @desc    Create a new quote
// @route   POST /api/quotes
// @access  Private
const createQuote = async (req, res) => {
  try {
    const { leadId, items, product, model, mrp, discountedPrice, customerAddress } = req.body;

    if (!leadId) {
      return res.status(400).json({ message: 'Lead ID is required' });
    }

    // Support both single item (legacy) and multiple items
    let quoteItems = items;
    if (!items || items.length === 0) {
      if (product && model && mrp && discountedPrice) {
        quoteItems = [{ product, model, mrp, discountedPrice, quantity: 1 }];
      } else {
        return res.status(400).json({ message: 'Please provide items for the quote' });
      }
    }

    const quote = await Quote.create({
      leadId,
      items: quoteItems,
      // store legacy fields from the first item to avoid breaking older UI views if any
      product: quoteItems[0].product,
      model: quoteItems[0].model,
      mrp: quoteItems[0].mrp,
      discountedPrice: quoteItems[0].discountedPrice,
      customerAddress,
      createdBy: req.user._id
    });

    // Automatically generate a followup for this quote
    const productNames = quoteItems.map(item => item.product).join(', ');
    const totalDiscounted = quoteItems.reduce((sum, item) => sum + (Number(item.discountedPrice) * Number(item.quantity)), 0);
    
    await Followup.create({
      leadId,
      date: new Date(),
      description: `Generated Quote for: ${productNames} - Total: ₹${totalDiscounted.toLocaleString()}`,
      status: 'DONE',
      createdBy: req.user._id
    });

    const populatedQuote = await Quote.findById(quote._id).populate('createdBy', 'name');

    res.status(201).json(populatedQuote);
  } catch (error) {
    console.error('CREATE QUOTE ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get quotes for a specific lead
// @route   GET /api/quotes/lead/:leadId
// @access  Private
const getQuotesByLead = async (req, res) => {
  try {
    const quotes = await Quote.find({ leadId: req.params.leadId })
      .populate('createdBy', 'name')
      .sort({ date: -1 }); // Newest first
    res.json(quotes);
  } catch (error) {
    console.error('GET LEAD QUOTES ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createQuote,
  getQuotesByLead
};
