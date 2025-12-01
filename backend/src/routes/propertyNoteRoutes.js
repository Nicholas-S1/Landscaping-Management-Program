const express = require('express');
const router = express.Router();

const {
  getPropertyNotes,
  getPropertyNoteById,
  createPropertyNote,
  updatePropertyNote,
  deletePropertyNote
} = require('../controllers/propertyNoteController');

const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get all property notes
router.get('/', getPropertyNotes);

// Get property note by ID
router.get('/:id', getPropertyNoteById);

// Create property note
router.post('/', createPropertyNote);

// Update property note
router.put('/:id', updatePropertyNote);

// Delete property note
router.delete('/:id', deletePropertyNote);

module.exports = router;
