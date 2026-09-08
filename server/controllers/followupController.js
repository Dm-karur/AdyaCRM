const Followup = require('../models/Followup');

// @desc    Create a new follow-up
// @route   POST /api/followups
// @access  Private
const createFollowup = async (req, res) => {
  try {
    const { leadId, date, description } = req.body;

    if (!leadId || !date || !description) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const followup = await Followup.create({
      leadId,
      date,
      description,
      createdBy: req.user._id
    });

    res.status(201).json(followup);
  } catch (error) {
    console.error('CREATE FOLLOWUP ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all follow-ups (Admin)
// @route   GET /api/followups
// @access  Private/Admin
const getAllFollowups = async (req, res) => {
  try {
    let matchQuery = {};
    if (req.user.role?.toLowerCase() !== 'admin') {
      const CustomerEntry = require('../models/CustomerEntry');
      const leads = await CustomerEntry.find({ branch: req.user.branch }, '_id');
      const leadIds = leads.map(l => l._id);
      matchQuery.leadId = { $in: leadIds };
    }

    const followupsRaw = await Followup.find(matchQuery)
      .populate({
        path: 'leadId',
        select: 'name company email phone status source priority employeeId',
        populate: { path: 'employeeId', select: 'name' }
      })
      .populate('createdBy', 'name')
      .sort({ date: 1 }); // Sort by upcoming
      
    // Transform to include creatorName
    const followups = followupsRaw.map(f => {
      const obj = f.toObject();
      obj.creatorName = obj.createdBy?.name || obj.leadId?.employeeId?.name || 'Unknown';
      return obj;
    });

    res.json(followups);
  } catch (error) {
    console.error('GET ALL FOLLOWUPS ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get follow-ups for a specific lead
// @route   GET /api/followups/lead/:leadId
// @access  Private
const getFollowupsByLead = async (req, res) => {
  try {
    const followupsRaw = await Followup.find({ leadId: req.params.leadId })
      .populate({
        path: 'leadId',
        select: 'name company email phone status source priority employeeId',
        populate: { path: 'employeeId', select: 'name' }
      })
      .populate('createdBy', 'name')
      .sort({ date: 1 });
      
    // Transform to include creatorName
    const followups = followupsRaw.map(f => {
      const obj = f.toObject();
      obj.creatorName = obj.createdBy?.name || obj.leadId?.employeeId?.name || 'Unknown';
      return obj;
    });

    res.json(followups);
  } catch (error) {
    console.error('GET LEAD FOLLOWUPS ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update follow-up status
// @route   PUT /api/followups/:id/status
// @access  Private
const updateFollowupStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const followup = await Followup.findById(req.params.id);

    if (!followup) {
      return res.status(404).json({ message: 'Follow-up not found' });
    }

    followup.status = status;
    const updatedFollowup = await followup.save();
    res.json(updatedFollowup);
  } catch (error) {
    console.error('UPDATE FOLLOWUP STATUS ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createFollowup,
  getAllFollowups,
  getFollowupsByLead,
  updateFollowupStatus
};
