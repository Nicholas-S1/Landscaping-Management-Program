import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getData } from '../services/resource';
import { UserRole } from '../types';
import { label } from './ui';

interface NavSection {
  heading?: string;
  items: { to: string; label: string }[];
}

const ACCOUNT: NavSection = {
  heading: 'Account',
  items: [
    { to: '/messages', label: 'Messages' },
    { to: '/profile', label: 'Profile' }
  ]
};

const STAFF_WORK = [
  { to: '/schedule', label: 'Schedule' },
  { to: '/my-jobs', label: 'My jobs' },
  { to: '/property-notes', label: 'Property notes' },
  { to: '/equipment', label: 'Equipment' },
  { to: '/timesheet', label: 'My timesheet' },
  { to: '/time-off', label: 'Time off' }
];

const MANAGEMENT: NavSection[] = [
  {
    heading: 'Operations',
    items: [
      { to: '/jobs', label: 'Jobs' },
      { to: '/routes', label: 'Routes' },
      { to: '/trucks', label: 'Trucks' },
      { to: '/inventory', label: 'Inventory' }
    ]
  },
  {
    heading: 'Team',
    items: [
      { to: '/people', label: 'People' },
      { to: '/timecards', label: 'Timecards' }
    ]
  },
  {
    heading: 'Customers & billing',
    items: [
      { to: '/invoices', label: 'Invoices' },
      { to: '/plans', label: 'Service plans' },
      { to: '/appointments', label: 'Appointments' },
      { to: '/reports', label: 'Reports' }
    ]
  }
];

const NAV: Record<UserRole, NavSection[]> = {
  customer: [
    {
      items: [
        { to: '/', label: 'Home' },
        { to: '/bills', label: 'Bills' },
        { to: '/services', label: 'Services' },
        { to: '/appointments', label: 'Appointments' },
        { to: '/property', label: 'My property' }
      ]
    },
    ACCOUNT
  ],
  employee: [{ items: [{ to: '/', label: 'Today' }, ...STAFF_WORK] }, ACCOUNT],
  manager: [
    { items: [{ to: '/', label: 'Overview' }, { to: '/today', label: 'My day' }, ...STAFF_WORK] },
    ...MANAGEMENT,
    ACCOUNT
  ],
  admin: [
    { items: [{ to: '/', label: 'Overview' }, { to: '/today', label: 'My day' }, ...STAFF_WORK] },
    ...MANAGEMENT,
    { heading: 'Owner', items: [{ to: '/finances', label: 'Finances' }] },
    ACCOUNT
  ]
};

const ROLE_TITLES: Record<UserRole, string> = { customer: 'Customer', employee: 'Employee', manager: 'Manager', admin: 'Owner / Admin' };

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    setMenuOpen(false);
    getData('/messages/unread/count')
      .then((data) => setUnread(data.count))
      .catch(() => undefined);
  }, [location.pathname]);

  if (!user) return null;

  return (
    <div className="shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <span>Landscaping Manager</span>
          <button className="menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Toggle menu">
            ☰
          </button>
        </div>
        <nav aria-label="Main">
          {NAV[user.role].map((section, index) => (
            <div key={section.heading || index} className="nav-section">
              {section.heading && <div className="nav-heading">{section.heading}</div>}
              {section.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                  {item.label}
                  {item.to === '/messages' && unread > 0 && <span className="count">{unread}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="who">
            <strong>
              {user.firstName} {user.lastName}
            </strong>
            <span>{ROLE_TITLES[user.role] || label(user.role)}</span>
          </div>
          <button className="button button-ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
