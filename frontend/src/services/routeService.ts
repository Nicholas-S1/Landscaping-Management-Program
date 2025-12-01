import api from './api';

class RouteService {
  async getAllRoutes(params?: any) {
    const response = await api.get('/routes', { params });
    return response.data;
  }

  async getRouteById(id: string) {
    const response = await api.get(`/routes/${id}`);
    return response.data.data.route;
  }

  async getMyTodayRoute() {
    const response = await api.get('/routes/today/my-route');
    return response.data.data.route;
  }

  async createRoute(routeData: any) {
    const response = await api.post('/routes', routeData);
    return response.data.data.route;
  }

  async updateRoute(id: string, routeData: any) {
    const response = await api.put(`/routes/${id}`, routeData);
    return response.data.data.route;
  }

  async deleteRoute(id: string) {
    const response = await api.delete(`/routes/${id}`);
    return response.data;
  }

  async addCustomersToRoute(routeId: string, customerIds: string[]) {
    const response = await api.post(`/routes/${routeId}/customers`, {
      customerIds
    });
    return response.data;
  }

  async updateCustomerStatus(routeId: string, customerId: string, data: any) {
    const response = await api.put(`/routes/${routeId}/customers/${customerId}`, data);
    return response.data.data.routeCustomer;
  }
}

export default new RouteService();
