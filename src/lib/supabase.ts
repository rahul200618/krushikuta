import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const isPlaceholder = !supabaseUrl || supabaseUrl.includes('placeholder-project') || supabaseUrl.includes('placeholder');

console.log('[supabase] Initialized with URL:', supabaseUrl, 'isPlaceholder:', isPlaceholder);

let supabaseClient: any;

if (isPlaceholder) {
  console.warn('[supabase] WARNING: Running with placeholder Supabase URL. Using mock client for local preview/development.');
  
  let currentSession: any = null;
  const listeners = new Set<(event: string, session: any) => void>();

  const triggerStateChange = (event: string, session: any) => {
    listeners.forEach(cb => {
      try {
        cb(event, session);
      } catch (err) {
        console.error('Error in auth state change listener:', err);
      }
    });
  };

  supabaseClient = {
    auth: {
      getSession: async () => {
        return { data: { session: currentSession }, error: null };
      },
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        listeners.add(callback);
        // Trigger initial callback asynchronously to match real supabase behavior
        setTimeout(() => {
          try {
            callback(currentSession ? 'SIGNED_IN' : 'SIGNED_OUT', currentSession);
          } catch (e) {}
        }, 0);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                listeners.delete(callback);
              }
            }
          }
        };
      },
      signInWithPassword: async ({ email, password }: any) => {
        const mockUser = {
          id: 'mock-user-123',
          email: email || 'student@example.com',
          user_metadata: { name: 'Karthik' }
        };
        currentSession = {
          user: mockUser,
          access_token: 'mock-token',
          expires_in: 3600
        };
        triggerStateChange('SIGNED_IN', currentSession);
        return { data: { session: currentSession, user: mockUser }, error: null };
      },
      signUp: async ({ email, password }: any) => {
        const mockUser = {
          id: 'mock-user-123',
          email: email || 'student@example.com',
          user_metadata: { name: 'Karthik' }
        };
        currentSession = {
          user: mockUser,
          access_token: 'mock-token',
          expires_in: 3600
        };
        triggerStateChange('SIGNED_IN', currentSession);
        return { data: { session: currentSession, user: mockUser }, error: null };
      },
      signOut: async () => {
        currentSession = null;
        triggerStateChange('SIGNED_OUT', null);
        return { error: null };
      }
    },
    // Mock Realtime features
    channel: (name: string) => {
      const mockCh = {
        on: (event: string, filter: any, callback: () => void) => {
          return mockCh;
        },
        subscribe: () => {
          return mockCh;
        }
      };
      return mockCh;
    },
    removeChannel: (channel: any) => {
      // Do nothing
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          limit: async () => ({ data: [], error: null })
        }),
        order: async () => ({ data: [], error: null }),
        like: async () => ({ data: [], error: null })
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: null, error: null })
        })
      }),
      upsert: () => ({
        select: () => ({
          single: async () => ({ data: null, error: null })
        })
      })
    })
  };
} else {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = supabaseClient;
