const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { syncDatabase } = require('./models');
const errorHandler = require('./middleware/errorHandler');
const { startScheduler } = require('./jobs/scheduler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const truckRoutes = require('./routes/truckRoutes');
const routeRoutes = require('./routes/routeRoutes');
const timeEntryRoutes = require('./routes/timeEntryRoutes');
const propertyNoteRoutes = require('./routes/propertyNoteRoutes');
const messageRoutes = require('./routes/messageRoutes');
const { router: featureRoutes, uploadDir } = require('./routes/featureRoutes');

const app = express();

// Uploaded photos are displayed by the web app, which runs on a different origin.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests, please try again later.' }
}));

// Tighter limit on sign-in attempts to slow down password guessing.
app.use(['/api/auth/login', '/api/auth/register'], rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Too many attempts, please try again later.' }
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

app.use('/uploads', express.static(uploadDir, { index: false, dotfiles: 'deny' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/trucks', truckRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/time-entries', timeEntryRoutes);
app.use('/api/property-notes', propertyNoteRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api', featureRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    if (!(await testConnection())) {
      console.error('Failed to connect to database. Server not starting.');
      process.exit(1);
    }

    await syncDatabase({ alter: process.env.NODE_ENV === 'development' });
    startScheduler();

    app.listen(PORT, () => {
      console.log(`Landscaping Management API listening on http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

startServer();

module.exports = app;
