import React, { useState, useEffect } from 'react';
import timeEntryService from '../../services/timeEntryService';
import './TimeClock.css';

const TimeClock: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeEntry, setActiveEntry] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    loadCurrentEntry();
    return () => clearInterval(timer);
  }, []);

  const loadCurrentEntry = async () => {
    try {
      const entry = await timeEntryService.getCurrentTimeEntry();
      setActiveEntry(entry);
    } catch (err) {
      console.error('Failed to load current entry:', err);
    }
  };

  const handleClockIn = async () => {
    setLoading(true);
    setError('');
    try {
      await timeEntryService.clockIn();
      await loadCurrentEntry();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to clock in');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    setError('');
    try {
      await timeEntryService.clockOut();
      setActiveEntry(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to clock out');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getWorkDuration = () => {
    if (!activeEntry?.clockIn) return '00:00:00';
    const start = new Date(activeEntry.clockIn);
    const diff = currentTime.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="time-clock-card">
      <h2>Time Clock</h2>
      {error && <div className="error-message">{error}</div>}

      <div className="clock-display">
        <div className="current-time">{formatTime(currentTime)}</div>
        <div className="current-date">{currentTime.toLocaleDateString()}</div>
      </div>

      {activeEntry ? (
        <div className="clocked-in-status">
          <div className="status-badge active">CLOCKED IN</div>
          <div className="work-duration">
            <span className="label">Time Worked:</span>
            <span className="duration">{getWorkDuration()}</span>
          </div>
          <div className="clock-in-time">
            <span className="label">Clocked in at:</span>
            <span>{new Date(activeEntry.clockIn).toLocaleTimeString()}</span>
          </div>
          <button
            onClick={handleClockOut}
            disabled={loading}
            className="btn-danger"
          >
            {loading ? 'Clocking Out...' : 'Clock Out'}
          </button>
        </div>
      ) : (
        <div className="clocked-out-status">
          <div className="status-badge inactive">CLOCKED OUT</div>
          <button
            onClick={handleClockIn}
            disabled={loading}
            className="btn-success"
          >
            {loading ? 'Clocking In...' : 'Clock In'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TimeClock;
