const express = require('express');
const router = express.Router();

const {
  clockIn,
  clockOut,
  getCurrentTimeEntry,
  getTimeEntries,
  adjustTimeEntry,
  getTimeEntrySummary
} = require('../controllers/timeEntryController');

const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Clock in
router.post('/clock-in', authorize('employee', 'manager', 'admin'), clockIn);

// Clock out
router.post('/clock-out', authorize('employee', 'manager', 'admin'), clockOut);

// Get current active time entry
router.get('/current', getCurrentTimeEntry);

// Get time entry summary
router.get('/summary', getTimeEntrySummary);

// Get time entries
router.get('/', getTimeEntries);

// Adjust time entry (manager, admin only)
router.put('/:id', authorize('manager', 'admin'), adjustTimeEntry);

module.exports = router;
