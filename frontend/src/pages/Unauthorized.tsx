import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Error.css';

const Unauthorized: React.FC = () => {
  return (
    <div className="error-container">
      <div className="error-content">
        <h1>403</h1>
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
        <Link to="/dashboard" className="btn-primary">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
