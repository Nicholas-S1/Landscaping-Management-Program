import api from './api';

class TruckService {
  async getAllTrucks(params?: any) {
    const response = await api.get('/trucks', { params });
    return response.data;
  }

  async getTruckById(id: string) {
    const response = await api.get(`/trucks/${id}`);
    return response.data.data.truck;
  }

  async createTruck(truckData: any) {
    const response = await api.post('/trucks', truckData);
    return response.data.data.truck;
  }

  async updateTruck(id: string, truckData: any) {
    const response = await api.put(`/trucks/${id}`, truckData);
    return response.data.data.truck;
  }

  async deleteTruck(id: string) {
    const response = await api.delete(`/trucks/${id}`);
    return response.data;
  }

  async assignEmployees(truckId: string, employeeIds: string[], date?: string, roles?: string[]) {
    const response = await api.post(`/trucks/${truckId}/assign`, {
      employeeIds,
      date,
      roles
    });
    return response.data.data.assignments;
  }

  async getTruckAssignments(truckId: string, date?: string) {
    const response = await api.get(`/trucks/${truckId}/assignments`, {
      params: { date }
    });
    return response.data.data.assignments;
  }
}

export default new TruckService();
