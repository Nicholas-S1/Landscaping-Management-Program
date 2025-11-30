import React from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/Dashboard.css';

const EmployeeDashboard: React.FC = () => {
  const { user, logout } = useAuth();

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
            <h2>Time Clock</h2>
            <div className="card-content">
              <div className="time-clock">
                <p className="current-time">{new Date().toLocaleTimeString()}</p>
                <div className="clock-buttons">
                  <button className="btn-primary">Clock In</button>
                  <button className="btn-secondary">Clock Out</button>
                </div>
                <p className="status-text">Status: Clocked Out</p>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>My Truck Assignment</h2>
            <div className="card-content">
              <p className="placeholder-text">No truck assigned yet.</p>
            </div>
          </div>

          <div className="dashboard-card full-width">
            <h2>Today's Route</h2>
            <p>View locations and route for today.</p>
            <div className="card-content">
              <p className="placeholder-text">No routes assigned for today.</p>
              <button className="btn-primary">View Map</button>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Customer Messages</h2>
            <p>View and respond to customer messages.</p>
            <div className="card-content">
              <p className="placeholder-text">No messages.</p>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Leave Property Note</h2>
            <div className="card-content">
              <select className="form-select">
                <option>Select Property</option>
              </select>
              <textarea
                placeholder="Enter note about property..."
                rows={3}
                className="note-textarea"
              />
              <button className="btn-primary">Save Note</button>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>My Schedule</h2>
            <div className="card-content">
              <p className="placeholder-text">No upcoming shifts.</p>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Equipment Maintenance</h2>
            <div className="card-content">
              <p className="placeholder-text">No maintenance tasks assigned.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
