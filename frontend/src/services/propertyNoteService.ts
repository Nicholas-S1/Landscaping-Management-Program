import api from './api';

class PropertyNoteService {
  async getPropertyNotes(params?: any) {
    const response = await api.get('/property-notes', { params });
    return response.data;
  }

  async getPropertyNoteById(id: string) {
    const response = await api.get(`/property-notes/${id}`);
    return response.data.data.propertyNote;
  }

  async createPropertyNote(data: any) {
    const response = await api.post('/property-notes', data);
    return response.data.data.propertyNote;
  }

  async updatePropertyNote(id: string, data: any) {
    const response = await api.put(`/property-notes/${id}`, data);
    return response.data.data.propertyNote;
  }

  async deletePropertyNote(id: string) {
    const response = await api.delete(`/property-notes/${id}`);
    return response.data;
  }
}

export default new PropertyNoteService();
