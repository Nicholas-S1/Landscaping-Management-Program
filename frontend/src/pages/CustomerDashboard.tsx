import React from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/Dashboard.css';

const CustomerDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Customer Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user?.firstName} {user?.lastName}</span>
          <button onClick={logout} className="btn-secondary">Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h2>My Bills</h2>
            <p>View and manage your billing information.</p>
            <div className="card-content">
              <p className="placeholder-text">No bills available yet.</p>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Property Information</h2>
            <div className="card-content">
              <p><strong>Address:</strong> {user?.propertyAddress || 'Not set'}</p>
              <p><strong>Notes:</strong></p>
              <p>{user?.propertyNotes || 'No notes available.'}</p>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Property Photos</h2>
            <p>Upload photos of your property.</p>
            <div className="card-content">
              <button className="btn-primary">Upload Photo</button>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Service History</h2>
            <p>View your service history and upcoming appointments.</p>
            <div className="card-content">
              <p className="placeholder-text">No service history available yet.</p>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Leave a Note</h2>
            <p>Leave notes for employees and managers about your property.</p>
            <div className="card-content">
              <textarea
                placeholder="Enter your notes here..."
                rows={4}
                className="note-textarea"
              />
              <button className="btn-primary">Save Note</button>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Contact Information</h2>
            <div className="card-content">
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Phone:</strong> {user?.phone || 'Not set'}</p>
              <button className="btn-secondary">Update Profile</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
