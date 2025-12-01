import React, { useState, useEffect } from 'react';
import routeService from '../../services/routeService';
import './TodayRoute.css';

const TodayRoute: React.FC = () => {
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTodayRoute();
  }, []);

  const loadTodayRoute = async () => {
    try {
      const data = await routeService.getMyTodayRoute();
      setRoute(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load route');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="today-route-card">Loading...</div>;
  }

  if (error) {
    return <div className="today-route-card"><div className="error-message">{error}</div></div>;
  }

  if (!route) {
    return (
      <div className="today-route-card">
        <h2>Today's Route</h2>
        <p className="no-route">No route assigned for today</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#f59e0b';
      case 'pending': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <div className="today-route-card">
      <h2>Today's Route: {route.name}</h2>

      {route.truck && (
        <div className="truck-info">
          <strong>Truck:</strong> {route.truck.name} ({route.truck.licensePlate})
        </div>
      )}

      <div className="route-stats">
        <div className="stat">
          <span className="label">Total Stops:</span>
          <span className="value">{route.customers?.length || 0}</span>
        </div>
        <div className="stat">
          <span className="label">Status:</span>
          <span className="value">{route.status}</span>
        </div>
      </div>

      {route.customers && route.customers.length > 0 && (
        <div className="customers-list">
          <h3>Stops</h3>
          {route.customers.map((rc: any, index: number) => (
            <div
              key={rc.id}
              className="customer-stop"
              style={{ borderLeftColor: getStatusColor(rc.status) }}
            >
              <div className="stop-number">{index + 1}</div>
              <div className="stop-details">
                <div className="customer-name">
                  {rc.customer.firstName} {rc.customer.lastName}
                </div>
                <div className="customer-address">
                  {rc.customer.propertyAddress || 'No address'}
                </div>
                {rc.customer.propertyNotes && (
                  <div className="customer-notes">
                    <small>Notes: {rc.customer.propertyNotes}</small>
                  </div>
                )}
                <div className="stop-status">
                  Status: <span style={{ color: getStatusColor(rc.status) }}>
                    {rc.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TodayRoute;
