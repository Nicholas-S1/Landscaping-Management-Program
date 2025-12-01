import api from './api';

class TimeEntryService {
  async clockIn(routeId?: string, notes?: string) {
    const response = await api.post('/time-entries/clock-in', {
      routeId,
      notes
    });
    return response.data.data.timeEntry;
  }

  async clockOut(notes?: string) {
    const response = await api.post('/time-entries/clock-out', { notes });
    return response.data.data.timeEntry;
  }

  async getCurrentTimeEntry() {
    const response = await api.get('/time-entries/current');
    return response.data.data.timeEntry;
  }

  async getTimeEntries(params?: any) {
    const response = await api.get('/time-entries', { params });
    return response.data;
  }

  async adjustTimeEntry(id: string, data: any) {
    const response = await api.put(`/time-entries/${id}`, data);
    return response.data.data.timeEntry;
  }

  async getTimeEntrySummary(userId?: string, startDate?: string, endDate?: string) {
    const response = await api.get('/time-entries/summary', {
      params: { userId, startDate, endDate }
    });
    return response.data.data;
  }
}

export default new TimeEntryService();
