import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';
import TodayPage from './pages/TodayPage';
import { MyJobsPage, SchedulePage } from './pages/WorkPages';
import { MyPropertyPage, PropertyNotesPage } from './pages/PropertyPages';
import { AppointmentsPage, EquipmentPage, InventoryPage, JobsPage, PlansPage } from './pages/ManagePages';
import { PeoplePage, RoutesPage, TrucksPage } from './pages/FleetPages';
import { TimecardsPage, TimeOffPage, TimesheetPage } from './pages/TimePages';
import { BillsPage, InvoicesPage } from './pages/BillingPages';
import { FinancesPage, OverviewPage, ReportsPage } from './pages/ReportPages';
import { CustomerHome, ServicesPage } from './pages/CustomerPages';
import { MessagesPage, ProfilePage } from './pages/AccountPages';
import { UserRole } from './types';
import './styles/base.css';
import './styles/theme.css';

const STAFF: UserRole[] = ['employee', 'manager', 'admin'];
const MANAGERS: UserRole[] = ['manager', 'admin'];

// Each role lands on the page that matters most to it.
const Home: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'customer') return <CustomerHome />;
  if (user?.role === 'employee') return <TodayPage />;
  return <OverviewPage />;
};

const page = (element: React.ReactElement, roles?: UserRole[]) => <PrivateRoute allowedRoles={roles}>{element}</PrivateRoute>;

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <div className="app">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />

            <Route element={page(<Layout />)}>
              <Route path="/" element={<Home />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              <Route path="/bills" element={page(<BillsPage />, ['customer'])} />
              <Route path="/services" element={page(<ServicesPage />, ['customer'])} />
              <Route path="/property" element={page(<MyPropertyPage />, ['customer'])} />
              <Route path="/appointments" element={page(<AppointmentsPage />, ['customer', ...MANAGERS])} />

              <Route path="/today" element={page(<TodayPage />, STAFF)} />
              <Route path="/schedule" element={page(<SchedulePage />, STAFF)} />
              <Route path="/my-jobs" element={page(<MyJobsPage />, STAFF)} />
              <Route path="/property-notes" element={page(<PropertyNotesPage />, STAFF)} />
              <Route path="/equipment" element={page(<EquipmentPage />, STAFF)} />
              <Route path="/timesheet" element={page(<TimesheetPage />, STAFF)} />
              <Route path="/time-off" element={page(<TimeOffPage />, STAFF)} />

              <Route path="/jobs" element={page(<JobsPage />, MANAGERS)} />
              <Route path="/routes" element={page(<RoutesPage />, MANAGERS)} />
              <Route path="/trucks" element={page(<TrucksPage />, MANAGERS)} />
              <Route path="/inventory" element={page(<InventoryPage />, MANAGERS)} />
              <Route path="/people" element={page(<PeoplePage />, MANAGERS)} />
              <Route path="/timecards" element={page(<TimecardsPage />, MANAGERS)} />
              <Route path="/invoices" element={page(<InvoicesPage />, MANAGERS)} />
              <Route path="/plans" element={page(<PlansPage />, MANAGERS)} />
              <Route path="/reports" element={page(<ReportsPage />, MANAGERS)} />

              <Route path="/finances" element={page(<FinancesPage />, ['admin'])} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;
