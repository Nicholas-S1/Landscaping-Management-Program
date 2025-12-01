import api from './api';

class MessageService {
  async getMessages(type: 'inbox' | 'sent' = 'inbox', params?: any) {
    const response = await api.get('/messages', {
      params: { type, ...params }
    });
    return response.data;
  }

  async getMessageById(id: string) {
    const response = await api.get(`/messages/${id}`);
    return response.data.data.message;
  }

  async sendMessage(data: any) {
    const response = await api.post('/messages', data);
    return response.data.data.message;
  }

  async markAsRead(id: string) {
    const response = await api.put(`/messages/${id}/read`);
    return response.data.data.message;
  }

  async deleteMessage(id: string) {
    const response = await api.delete(`/messages/${id}`);
    return response.data;
  }

  async getUnreadCount() {
    const response = await api.get('/messages/unread/count');
    return response.data.data.count;
  }
}

export default new MessageService();
