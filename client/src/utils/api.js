import { supabase } from '../lib/supabaseClient';

/**
 * Wrapper para fetch com autenticação automática
 * Adiciona o token JWT do Supabase em todas as requisições
 * e renova automaticamente se expirado
 */
export const authenticatedFetch = async (url, options = {}) => {
  // Get current session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No active session');
  }

  // Add authorization header
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    'Authorization': `Bearer ${session.access_token}`,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 by refreshing session
  if (response.status === 401) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      // Force logout
      await supabase.auth.signOut();
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    // Retry with new token
    headers['Authorization'] = `Bearer ${data.session.access_token}`;
    return fetch(url, { ...options, headers });
  }

  return response;
};
