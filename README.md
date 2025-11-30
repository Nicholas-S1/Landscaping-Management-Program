# Landscaping Management System

A comprehensive web and mobile application for managing landscaping businesses with multi-level authentication, route optimization, job tracking, billing, and more.

## Features Overview

### Phase 1: Foundation & Authentication ✅ COMPLETE
- **4-Level Authentication System**
  - Customer
  - Employee
  - Manager/Owner
  - Admin
- **JWT-based Authentication** with role-based access control (RBAC)
- **User Management** with secure password hashing
- **Role-specific Dashboards** for each user type
- **PostgreSQL Database** with Sequelize ORM
- **React + TypeScript Frontend**

### Upcoming Phases

#### Phase 2: Core Employee Features
- Clock in/out system
- Truck assignment viewing
- Route viewing with map integration
- Customer property notes and messaging

#### Phase 3: Manager/Owner Features
- Employee CRUD operations
- Timecard adjustments
- Truck-to-route assignments
- Equipment management
- Financial dashboard

#### Phase 4: Customer Portal
- Bill viewing and payment
- Photo uploads
- Property notes
- Service history

#### Phase 5+: Advanced Features
- Job/Service tracking
- Scheduling & calendar
- Invoicing & billing automation
- GPS tracking
- Reporting & analytics
- Inventory management
- And much more...

## Tech Stack

### Backend
- **Node.js** with Express
- **PostgreSQL** database
- **Sequelize** ORM
- **JWT** authentication
- **bcryptjs** for password hashing
- **Docker** for PostgreSQL containerization

### Frontend
- **React 18**
- **TypeScript**
- **React Router** for navigation
- **Axios** for API calls
- **Context API** for state management

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Docker** and **Docker Compose** (for PostgreSQL)
- **Git**

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Landscaping-Management-Program
```

### 2. Set Up PostgreSQL Database

Start the PostgreSQL database using Docker:

```bash
docker-compose up -d
```

This will start a PostgreSQL container on port 5432.

To stop the database:
```bash
docker-compose down
```

To stop and remove all data:
```bash
docker-compose down -v
```

### 3. Set Up Backend

```bash
cd backend

# Install dependencies
npm install

# The .env file is already configured for local development
# Edit backend/.env if you need to change database credentials

# Start the development server
npm run dev
```

The backend server will start on `http://localhost:5000`

### 4. Set Up Frontend

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The frontend will start on `http://localhost:3000` and automatically open in your browser.

## Default Configuration

### Database
- **Host**: localhost
- **Port**: 5432
- **Database**: landscaping_db
- **Username**: postgres
- **Password**: postgres

### API
- **Backend URL**: http://localhost:5000
- **Frontend URL**: http://localhost:3000

## User Roles

The system supports 4 user roles with different access levels:

### 1. Customer
- View bills
- Upload property photos
- Leave property notes
- View service history

### 2. Employee
- Clock in/out
- View truck assignments
- View daily routes
- Leave customer property notes
- View messages

### 3. Manager
- All employee capabilities
- Manage employees (CRUD)
- Adjust time clocks
- Assign trucks to routes
- Manage equipment
- View customer property notes

### 4. Admin
- All manager capabilities
- Assign manager roles
- View all finances
- Hire/fire employees
- Send bulk SMS/emails to employees
- System-wide settings

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/update-profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Users (Manager/Admin only)
- `GET /api/users` - Get all users (with pagination)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user
- `GET /api/users/role/:role` - Get users by role

## Testing the Application

### 1. Register a New Account

1. Open http://localhost:3000
2. Click "Sign up"
3. Fill in the registration form
4. Choose account type (Customer or Employee)
5. Click "Create Account"

### 2. Test Different User Roles

To create manager or admin accounts, you'll need to:

1. Register as a customer/employee first
2. Manually update the user role in the database:

```sql
-- Connect to PostgreSQL
docker exec -it landscaping_postgres psql -U postgres -d landscaping_db

-- Update user role
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';

-- Exit
\q
```

### 3. Test Authentication

- Login with different user roles
- Each role will see a different dashboard
- Try accessing protected routes
- Test logout functionality

## Project Structure

```
Landscaping-Management-Program/
├── backend/
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utility functions
│   │   └── server.js        # Main server file
│   ├── .env                 # Environment variables
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── context/         # React context (Auth)
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── styles/          # CSS files
│   │   ├── types/           # TypeScript types
│   │   ├── App.tsx          # Main app component
│   │   └── index.tsx        # Entry point
│   ├── .env                 # Environment variables
│   └── package.json
├── docker-compose.yml       # PostgreSQL container
└── README.md
```

## Environment Variables

### Backend (.env)

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=landscaping_db
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Future Integrations

The system is designed to support these third-party services (configuration already in place):

- **Google Maps API** - Route optimization and mapping
- **Stripe** - Payment processing
- **Twilio** - SMS notifications
- **AWS S3** - Image storage
- **Nodemailer** - Email notifications

Add your API keys to `backend/.env` when ready to integrate these services.

## Development Tips

### Backend Development

```bash
# Install dependencies
npm install

# Run in development mode (auto-restart)
npm run dev

# Run in production mode
npm start

# Initialize database
npm run init-db
```

### Frontend Development

```bash
# Install dependencies
npm install

# Run development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## Troubleshooting

### Database Connection Issues

1. Ensure Docker is running
2. Check if PostgreSQL container is running:
   ```bash
   docker ps
   ```
3. Restart the container:
   ```bash
   docker-compose restart
   ```

### Port Already in Use

If port 5000 or 3000 is already in use:

1. Change the port in `backend/.env` (PORT=5001)
2. Update `frontend/.env` to match
3. Restart both servers

### Frontend Can't Connect to Backend

1. Ensure backend is running on http://localhost:5000
2. Check `frontend/.env` has correct API URL
3. Clear browser cache and restart frontend

## Contributing

This is Phase 1 of the project. Future phases will add:
- Job tracking
- Scheduling
- Invoicing
- GPS tracking
- Mobile apps
- And much more!

## License

MIT

## Support

For issues or questions, please create an issue in the repository.

---

**Current Status**: Phase 1 Complete ✅
- ✅ Backend API with authentication
- ✅ Frontend with React + TypeScript
- ✅ 4-level role-based access control
- ✅ User management
- ✅ Role-specific dashboards
- ✅ PostgreSQL database setup
- ✅ Docker configuration

**Next Steps**: Begin Phase 2 - Core Employee Features
