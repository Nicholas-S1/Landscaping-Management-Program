import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import TimeClock from '../components/TimeClock/TimeClock';
import TodayRoute from '../components/TodayRoute/TodayRoute';
import messageService from '../services/messageService';
import '../styles/Dashboard.css';

const EmployeeDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();
  }, []);

  const loadUnreadCount = async () => {
    try {
      const count = await messageService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Employee Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user?.firstName} {user?.lastName}</span>
          <button onClick={logout} className="btn-secondary">Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <TimeClock />
          </div>

          <div className="dashboard-card full-width">
            <TodayRoute />
          </div>

          <div className="dashboard-card">
            <h2>Messages {unreadCount > 0 && <span className="badge">{unreadCount}</span>}</h2>
            <p>View and respond to messages.</p>
            <div className="card-content">
              <p className="placeholder-text">Message inbox coming soon.</p>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Quick Stats</h2>
            <div className="card-content">
              <p className="placeholder-text">Hours this week: 0.0</p>
              <p className="placeholder-text">Routes completed: 0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
