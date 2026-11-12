import axios from 'axios';

/**
 * Single hardened Axios client for the MarryLocal Phoenix API.
 *
 * The bearer token is read from the Zustand auth store through
 * `setAuthTokenGetter`, so background requests always receive:
 *
 *   Authorization: Bearer <opaque-token>
 */
const rawBaseUrl =
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export const API_BASE_URL = String(rawBaseUrl).replace(/\/+$/, '');

let authTokenGetter = () => null;
let unauthorizedHandler = null;

export function setAuthTokenGetter(getter) {
  authTokenGetter = typeof getter === 'function' ? getter : () => null;
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null;
}

export function socketUrl() {
  const configured = import.meta.env.VITE_WS_URL;
  if (configured) return String(configured).replace(/\/+$/, '');
  return `${API_BASE_URL.replace(/^http/, 'ws')}/socket`;
}

export class ApiError extends Error {
  constructor(message, { status = 0, code = null, errors = null, payload = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.payload = payload;
  }
}

function humanizeField(field) {
  return String(field)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

export function describeApiError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;

  const payload = error.payload || error.response?.data;
  const fieldErrors = error.errors || payload?.errors;

  if (fieldErrors && typeof fieldErrors === 'object') {
    const [field, messages] = Object.entries(fieldErrors)[0] || [];
    if (field) {
      const message = Array.isArray(messages) ? messages[0] : messages;
      return `${humanizeField(field)} ${message}`;
    }
  }

  return error.message || payload?.message || payload?.error || fallback;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: 'application/json' },
  timeout: 20_000,
});

api.interceptors.request.use(config => {
  const token = authTokenGetter();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status;
    const payload = error.response?.data;

    if (status === 401 && authTokenGetter()) {
      unauthorizedHandler?.();
    }

    const message =
      payload?.message ||
      payload?.error ||
      error.message ||
      `Request failed (${status || 'network'})`;

    return Promise.reject(
      new ApiError(message, {
        status: status || 0,
        code: payload?.code || null,
        errors: payload?.errors || null,
        payload,
      }),
    );
  },
);

export function unwrap(response) {
  return response?.data;
}

export const apiClient = api;
export { api };
export default api;
