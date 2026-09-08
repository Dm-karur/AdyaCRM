const express = require('express');
const router = express.Router();
const { 
  createEntry, 
  getEmployeeEntries, 
  getAllEntries,
  updateEntryStatus,
  deleteEntry,
  updateEntryPhoto,
  uploadEntryBill,
  addPurchaseBill
} = require('../controllers/customerEntryController');
const { protect, admin } = require('../middleware/auth');

const upload = require('../middleware/upload');

router.route('/')
  .post(protect, upload.single('photo'), createEntry)
  .get(protect, getEmployeeEntries);

router.get('/all', protect, admin, getAllEntries);

router.put('/:id/status', protect, updateEntryStatus);
router.post('/:id/photo', protect, upload.single('photo'), updateEntryPhoto);
router.post('/:id/bills', protect, upload.single('bill'), uploadEntryBill);
router.post('/:id/purchase-bills', protect, addPurchaseBill);
router.delete('/:id', protect, deleteEntry);

module.exports = router;
