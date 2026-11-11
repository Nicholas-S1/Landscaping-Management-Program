import api from './api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

// Uploaded photos are stored as server-relative paths.
export const fileUrl = (url: string) => (/^https?:/.test(url) ? url : `${API_ORIGIN}${url}`);

export const errorMessage = (error: any, fallback = 'Something went wrong') =>
  error?.response?.data?.message || error?.message || fallback;

export async function getData<T = any>(path: string, params?: Record<string, any>): Promise<T> {
  const response = await api.get(path, { params });
  return response.data.data as T;
}

export async function listItems(path: string, params?: Record<string, any>, key = 'items'): Promise<any[]> {
  const data = await getData(path, { limit: 200, ...params });
  return data[key] || [];
}

export async function postData<T = any>(path: string, body?: any): Promise<T> {
  return (await api.post(path, body)).data.data as T;
}

export async function putData<T = any>(path: string, body?: any): Promise<T> {
  return (await api.put(path, body)).data.data as T;
}

export async function deleteData(path: string): Promise<void> {
  await api.delete(path);
}

export async function uploadPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  // The explicit header stops axios from converting the form to JSON; the browser adds the boundary.
  const response = await api.post('/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return response.data.data.url;
}
