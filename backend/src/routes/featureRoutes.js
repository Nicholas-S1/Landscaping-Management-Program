const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');

const { authenticate, authorize } = require('../middleware/auth');
const { httpError } = require('../utils/crud');
const jobs = require('../controllers/jobController');
const equipment = require('../controllers/equipmentController');
const inventory = require('../controllers/inventoryController');
const invoices = require('../controllers/invoiceController');
const plans = require('../controllers/servicePlanController');
const appointments = require('../controllers/appointmentController');
const timeOff = require('../controllers/timeOffController');
const reports = require('../controllers/reportController');
const { sendBroadcast } = require('../controllers/broadcastController');

const router = express.Router();
router.use(authenticate);

const staff = authorize('employee', 'manager', 'admin');
const managers = authorize('manager', 'admin');
const admins = authorize('admin');

// Jobs: customers see and request their own; staff work them; managers manage them.
router.get('/jobs', jobs.listJobs);
router.post('/jobs', jobs.createJob);
router.get('/jobs/:id', jobs.getJob);
router.put('/jobs/:id', jobs.updateJob);
router.post('/jobs/:id/start', staff, jobs.startJob);
router.post('/jobs/:id/complete', staff, jobs.completeJob);
router.delete('/jobs/:id', managers, jobs.deleteJob);

router.get('/equipment', staff, equipment.listEquipment);
router.post('/equipment', managers, equipment.createEquipment);
router.get('/equipment/:id', staff, equipment.getEquipment);
router.put('/equipment/:id', managers, equipment.updateEquipment);
router.delete('/equipment/:id', managers, equipment.deleteEquipment);
router.get('/equipment/:id/maintenance', staff, equipment.listMaintenance);
router.post('/equipment/:id/maintenance', staff, equipment.logMaintenance);

router.get('/inventory', staff, inventory.listInventory);
router.post('/inventory', managers, inventory.createInventory);
router.put('/inventory/:id', managers, inventory.updateInventory);
router.post('/inventory/:id/adjust', managers, inventory.adjustInventory);
router.delete('/inventory/:id', managers, inventory.deleteInventory);

router.get('/invoices', authorize('customer', 'manager', 'admin'), invoices.listInvoices);
router.post('/invoices', managers, invoices.createInvoiceHandler);
router.get('/invoices/:id', authorize('customer', 'manager', 'admin'), invoices.getInvoice);
router.put('/invoices/:id', managers, invoices.updateInvoice);
router.post('/invoices/:id/payments', managers, invoices.recordPayment);
router.post('/invoices/:id/remind', managers, invoices.sendReminder);
router.post('/invoices/:id/pay', authorize('customer'), invoices.payOnline);

router.get('/service-plans', authorize('customer', 'manager', 'admin'), plans.listPlans);
router.post('/service-plans', managers, plans.createPlan);
router.post('/service-plans/run-billing', managers, plans.runBilling);
router.put('/service-plans/:id', managers, plans.updatePlan);
router.delete('/service-plans/:id', managers, plans.deletePlan);

router.get('/appointments', appointments.listAppointments);
router.post('/appointments', appointments.createAppointment);
router.put('/appointments/:id', appointments.updateAppointment);
router.delete('/appointments/:id', managers, appointments.deleteAppointment);

router.get('/time-off', staff, timeOff.listRequests);
router.post('/time-off', staff, timeOff.createRequest);
router.put('/time-off/:id/review', managers, timeOff.reviewRequest);
router.delete('/time-off/:id', staff, timeOff.cancelRequest);

router.get('/reports/operations', managers, reports.operationsReport);
router.get('/reports/finances', admins, reports.financeReport);

router.post('/broadcasts', admins, sendBroadcast);

// Photo uploads (property photos, before/after job photos). Files get random names and are served from /uploads.
const uploadDir = path.resolve(process.env.UPLOAD_PATH || './uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, done) => done(null, `${crypto.randomBytes(16).toString('hex')}${IMAGE_TYPES[file.mimetype]}`)
  }),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024 },
  fileFilter: (req, file, done) =>
    IMAGE_TYPES[file.mimetype] ? done(null, true) : done(httpError(400, 'Only JPEG, PNG, WebP or GIF images are allowed'))
});

router.post('/uploads', upload.single('file'), (req, res, next) => {
  if (!req.file) return next(httpError(400, 'No file uploaded'));
  res.status(201).json({ success: true, data: { url: `/uploads/${req.file.filename}` } });
});

module.exports = { router, uploadDir };
