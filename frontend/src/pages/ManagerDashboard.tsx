import React from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/Dashboard.css';

const ManagerDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Manager Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user?.firstName} {user?.lastName}</span>
          <button onClick={logout} className="btn-secondary">Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h2>Employee Management</h2>
            <div className="card-content">
              <button className="btn-primary">View All Employees</button>
              <button className="btn-primary">Add New Employee</button>
              <p className="placeholder-text">Total Employees: 0</p>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Time Clock Management</h2>
            <div className="card-content">
              <button className="btn-primary">View Time Cards</button>
              <button className="btn-primary">Adjust Time Entries</button>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Truck Assignments</h2>
            <div className="card-content">
              <button className="btn-primary">Manage Trucks</button>
              <button className="btn-primary">Assign Employees</button>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Route Management</h2>
            <div className="card-content">
              <button className="btn-primary">View Routes</button>
              <button className="btn-primary">Assign Routes to Trucks</button>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Equipment Management</h2>
            <div className="card-content">
              <button className="btn-primary">View Equipment</button>
              <button className="btn-primary">Add Equipment</button>
              <button className="btn-primary">Assign Maintenance</button>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Customer Properties</h2>
            <div className="card-content">
              <button className="btn-primary">View All Properties</button>
              <button className="btn-primary">View Property Notes</button>
            </div>
          </div>

          <div className="dashboard-card full-width">
            <h2>Today's Operations</h2>
            <div className="card-content">
              <div className="stats-grid">
                <div className="stat-item">
                  <h3>Active Crews</h3>
                  <p className="stat-number">0</p>
                </div>
                <div className="stat-item">
                  <h3>Jobs Today</h3>
                  <p className="stat-number">0</p>
                </div>
                <div className="stat-item">
                  <h3>Completed</h3>
                  <p className="stat-number">0</p>
                </div>
                <div className="stat-item">
                  <h3>In Progress</h3>
                  <p className="stat-number">0</p>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Customer Messages</h2>
            <div className="card-content">
              <p className="placeholder-text">No new messages.</p>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Reports</h2>
            <div className="card-content">
              <button className="btn-secondary">Employee Performance</button>
              <button className="btn-secondary">Route Efficiency</button>
              <button className="btn-secondary">Equipment Usage</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
