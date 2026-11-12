import { api } from '@/api/client';

export async function login({ email, password }) {
  const response = await api.post('/api/v1/auth/login', {
    user: { email: email.trim().toLowerCase(), password },
  });
  return response.data;
}

export async function register(payload) {
  const response = await api.post('/api/v1/auth/register', payload);
  return response.data;
}

export async function logout() {
  try {
    await api.delete('/api/v1/auth/logout');
  } catch {
    // Local session is cleared by the caller regardless of revocation result.
  }
}

export async function requestPasswordReset(email) {
  const response = await api.post('/users/reset_password', { email });
  return response.data;
}

export async function resetPassword(token, { password, passwordConfirmation }) {
  const response = await api.put(`/users/reset_password/${encodeURIComponent(token)}`, {
    user: {
      password,
      password_confirmation: passwordConfirmation,
    },
  });
  return response.data;
}

export async function registerAdmin(userData) {
  const response = await api.post('/api/v1/auth/register', {
    ...userData,
    invite_code: userData.inviteCode,
    role: 'admin',
  });
  return { success: true, ...response.data };
}

export default { login, register, logout, requestPasswordReset, resetPassword, registerAdmin };
