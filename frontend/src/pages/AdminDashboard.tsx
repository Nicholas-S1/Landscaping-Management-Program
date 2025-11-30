import React from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/Dashboard.css';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user?.firstName} {user?.lastName}</span>
          <button onClick={logout} className="btn-secondary">Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h2>User Management</h2>
            <div className="card-content">
              <button className="btn-primary">View All Users</button>
              <button className="btn-primary">Create User</button>
              <button className="btn-primary">Assign Manager Role</button>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Financial Overview</h2>
            <div className="card-content">
              <div className="financial-stats">
                <div className="stat-item">
                  <p>Revenue (Month)</p>
                  <h3>$0.00</h3>
                </div>
                <div className="stat-item">
                  <p>Expenses (Month)</p>
                  <h3>$0.00</h3>
                </div>
                <div className="stat-item">
                  <p>Net Profit</p>
                  <h3>$0.00</h3>
                </div>
              </div>
              <button className="btn-primary">View Detailed Finances</button>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Employee Management</h2>
            <div className="card-content">
              <button className="btn-primary">Hire Employee</button>
              <button className="btn-primary">Terminate Employee</button>
              <button className="btn-primary">View All Employees</button>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Bulk Communications</h2>
            <div className="card-content">
              <button className="btn-primary">Send SMS to All Employees</button>
              <button className="btn-primary">Send Email Announcement</button>
            </div>
          </div>

          <div className="dashboard-card full-width">
            <h2>System Statistics</h2>
            <div className="card-content">
              <div className="stats-grid">
                <div className="stat-item">
                  <h3>Total Customers</h3>
                  <p className="stat-number">0</p>
                </div>
                <div className="stat-item">
                  <h3>Total Employees</h3>
                  <p className="stat-number">0</p>
                </div>
                <div className="stat-item">
                  <h3>Active Managers</h3>
                  <p className="stat-number">0</p>
                </div>
                <div className="stat-item">
                  <h3>Total Jobs</h3>
                  <p className="stat-number">0</p>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Reports & Analytics</h2>
            <div className="card-content">
              <button className="btn-secondary">Revenue Reports</button>
              <button className="btn-secondary">Employee Productivity</button>
              <button className="btn-secondary">Customer Analytics</button>
              <button className="btn-secondary">Equipment Costs</button>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Equipment Overview</h2>
            <div className="card-content">
              <button className="btn-primary">View All Equipment</button>
              <button className="btn-primary">Maintenance Schedule</button>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Route Optimization</h2>
            <div className="card-content">
              <button className="btn-primary">View All Routes</button>
              <button className="btn-primary">Optimize Routes</button>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>System Settings</h2>
            <div className="card-content">
              <button className="btn-secondary">General Settings</button>
              <button className="btn-secondary">Payment Settings</button>
              <button className="btn-secondary">Notification Settings</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
