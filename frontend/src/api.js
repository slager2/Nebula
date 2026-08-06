export const API = import.meta.env.VITE_API_URL || '/api/v1';

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(data?.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
