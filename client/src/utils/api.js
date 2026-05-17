import { supabase } from '../lib/supabaseClient';

export const authenticatedFetch = async (url, options = {}) => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No active session');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    'Authorization': `Bearer ${session.access_token}`,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      await supabase.auth.signOut();
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    headers['Authorization'] = `Bearer ${data.session.access_token}`;
    return fetch(url, { ...options, headers });
  }

  return response;
};
