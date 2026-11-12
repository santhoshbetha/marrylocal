import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, setAuthTokenGetter, setUnauthorizedHandler } from '@/api/client';

export const AUTH_TOKEN_KEY = 'marrylocal.auth.token';
export const AUTH_USER_KEY = 'marrylocal.auth.user';

function readToken() {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

function readUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeToken(token) {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Private mode / quota. The in-memory session remains valid for this tab.
  }
}

function writeUser(user) {
  try {
    if (user?.id) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_USER_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}

/**
 * Adds the legacy aliases still consumed by older screens while the entire app
 * moves to the canonical snake_case Phoenix API shape.
 */
export function normalizeProfileShell(profile) {
  if (!profile || typeof profile !== 'object') return null;

  return {
    ...profile,
    userid: profile.userid ?? profile.id,
    firstname: profile.firstname ?? profile.first_name,
    lastname: profile.lastname ?? profile.last_name,
    phonenumber: profile.phonenumber ?? profile.phone_number,
    userstate: profile.userstate ?? profile.user_state,
    termsaccepted: profile.termsaccepted ?? profile.terms_accepted,
    arounduserscount: profile.arounduserscount ?? profile.around_user_count,
    maxsearchdistance: profile.maxsearchdistance ?? profile.max_search_distance,
    role: profile.role ?? (profile.is_admin === true ? 'admin' : profile.role),
    is_admin: profile.is_admin ?? profile.role === 'admin',
    onetimefeesrequired: profile.onetimefeesrequired ?? profile.onetime_fees_required,
    onetimefeespaid: profile.onetimefeespaid ?? profile.onetime_fees_paid,
    forceverificationrequired:
      profile.forceverificationrequired ?? profile.force_verification_required,
    paymentenforcementactive:
      profile.paymentenforcementactive ??
      profile.payment_enforcement_active ??
      profile.effective_payment_required,
    acceptedonetimefeesamount:
      profile.acceptedonetimefeesamount ?? profile.accepted_one_time_fees_amount,
  };
}

/**
 * Merges a fresh profile payload into the existing shell without losing the
 * persisted role. This is the key hydration safeguard for admin sessions:
 * profile endpoints may return a partial shell, but role must survive reloads.
 */
function mergeProfileShell(previous, incoming) {
  if (!incoming) return previous || null;

  const sameUser =
    previous &&
    (previous.id === incoming.id ||
      previous.userid === incoming.id ||
      previous.id === incoming.userid);

  const merged = {
    ...(sameUser ? previous : {}),
    ...incoming,
  };

  if (!incoming.role && sameUser && previous.role) merged.role = previous.role;
  if (incoming.is_admin === undefined && sameUser && previous.is_admin !== undefined) {
    merged.is_admin = previous.is_admin;
  }

  return normalizeProfileShell(merged);
}

const initialToken = readToken();
const initialUser = initialToken ? readUser() : null;

let bootstrapPromise = null;

/**
 * Global client shell state.
 *
 * Only session identity and profile shell data live here. All server data
 * (discovery pages, notifications, relationships) belongs to TanStack Query.
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: initialToken,
      currentUser: initialUser,
      profiledata: null,
      isAuthenticated: Boolean(initialToken),
      checkedToken: false,
      loading: Boolean(initialToken),
      onboardingComplete: false,
      lifestyleAlignment: null,

      login: (token, user) => {
        const normalizedUser = mergeProfileShell(get().currentUser, user);

        writeToken(token || null);
        writeUser(normalizedUser);
        set({
          token: token || null,
          currentUser: normalizedUser,
          profiledata: normalizedUser,
          isAuthenticated: Boolean(token),
          checkedToken: true,
          loading: false,
        });
      },

      logout: () => {
        // Server revocation is owned by `useAuthActions`, which then calls this
        // local-only teardown. Direct callers still get a safe local logout.
        get().clearSession();
      },

      updateProfile: updatedFields => {
        const current = get().currentUser || {};
        const next = normalizeProfileShell({
          ...current,
          ...(typeof updatedFields === 'function' ? updatedFields(current) : updatedFields),
        });

        writeUser(next);
        set(state => ({
          currentUser: next,
          profiledata: next || state.profiledata,
        }));
      },

      clearSession: () => {
        writeToken(null);
        writeUser(null);
        set({
          token: null,
          currentUser: null,
          profiledata: null,
          isAuthenticated: false,
          checkedToken: true,
          loading: false,
          onboardingComplete: false,
          lifestyleAlignment: null,
        });
      },

      setSession: ({ token, user = null }) => {
        get().login(token, user);
      },

      setToken: token => {
        writeToken(token || null);
        set({
          token: token || null,
          isAuthenticated: Boolean(token),
          checkedToken: true,
        });
      },

      setUser: user => {
        const normalizedUser = mergeProfileShell(get().currentUser, user);
        writeUser(normalizedUser);
        set({ currentUser: normalizedUser, isAuthenticated: Boolean(get().token) });
      },

      setAuth: user => {
        if (user) get().setUser(user);
        else get().clearSession();
      },

      setProfile: profile => {
        const normalized = normalizeProfileShell(profile);
        set(state => ({
          profiledata: normalized,
          currentUser: normalized
            ? mergeProfileShell(state.currentUser, normalized)
            : state.currentUser,
        }));
      },

      setProfiledata: next => {
        const current = get().profiledata;
        const nextValue = typeof next === 'function' ? next(current) : next;
        const normalized = normalizeProfileShell(nextValue);

        if (normalized) writeUser(normalized);
        set(state => ({
          profiledata: normalized,
          currentUser: normalized
            ? mergeProfileShell(state.currentUser, normalized)
            : state.currentUser,
        }));
      },

      setLoading: loading => set({ loading: Boolean(loading) }),
      setCheckedToken: checkedToken => set({ checkedToken: Boolean(checkedToken) }),

      setOnboardingComplete: onboardingComplete =>
        set({ onboardingComplete: Boolean(onboardingComplete) }),

      setLifestyleAlignment: lifestyleAlignment => set({ lifestyleAlignment }),

      getToken: () => get().token,

      /**
       * Restores the profile shell after a page reload. The opaque token is
       * verified against `/api/v1/profiles/me`; a 401 clears the session.
       */
      bootstrapSession: async () => {
        if (get().checkedToken) return get().currentUser;

        if (!get().token) {
          set({ checkedToken: true, isAuthenticated: false, loading: false });
          return null;
        }

        if (bootstrapPromise) return bootstrapPromise;

        set({ loading: true });

        bootstrapPromise = api
          .get('/api/v1/profiles/me')
          .then(response => {
            const freshProfile = response.data?.data?.profile ?? response.data?.profile ?? null;
            const mergedProfile = mergeProfileShell(get().currentUser, freshProfile);
            const token = get().token;

            if (mergedProfile && token) get().login(token, mergedProfile);
            else set({ checkedToken: true, loading: false });

            return mergedProfile;
          })
          .catch(error => {
            if (error?.status === 401) get().clearSession();
            else set({ checkedToken: true, loading: false });

            return null;
          })
          .finally(() => {
            bootstrapPromise = null;
          });

        return bootstrapPromise;
      },
    }),
    {
      name: 'marrylocal.auth.shell',
      version: 2,
      partialize: state => ({
        token: state.token,
        currentUser: state.currentUser,
        onboardingComplete: state.onboardingComplete,
        lifestyleAlignment: state.lifestyleAlignment,
      }),
      migrate: (persisted, _version) => {
        const token = persisted?.token ?? null;
        const currentUser = persisted?.currentUser ?? persisted?.user ?? null;

        return {
          ...persisted,
          token,
          currentUser,
          isAuthenticated: Boolean(token),
          checkedToken: false,
        };
      },
      merge: (persisted, current) => {
        const token = persisted?.token ?? current.token ?? null;
        const currentUser =
          persisted?.currentUser ?? persisted?.user ?? current.currentUser ?? null;

        return {
          ...current,
          ...persisted,
          token,
          currentUser,
          isAuthenticated: Boolean(token),
          checkedToken: false,
        };
      },
    },
  ),
);

setAuthTokenGetter(() => useAuthStore.getState().token);
setUnauthorizedHandler(() => useAuthStore.getState().clearSession());

/**
 * Store-backed selector hook for legacy screens.
 *
 * New code should use `useAuthStore` directly. This exists only to keep older
 * components on the single Zustand source of truth while they are rewritten.
 */
export function useAuth() {
  const token = useAuthStore(state => state.token);
  const currentUser = useAuthStore(state => state.currentUser);
  const profiledata = useAuthStore(state => state.profiledata);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const checkedToken = useAuthStore(state => state.checkedToken);
  const loading = useAuthStore(state => state.loading);
  const login = useAuthStore(state => state.login);
  const logout = useAuthStore(state => state.logout);
  const updateProfile = useAuthStore(state => state.updateProfile);
  const setAuth = useAuthStore(state => state.setAuth);
  const setProfile = useAuthStore(state => state.setProfile);
  const setProfiledata = useAuthStore(state => state.setProfiledata);
  const setOnboardingComplete = useAuthStore(state => state.setOnboardingComplete);
  const setLifestyleAlignment = useAuthStore(state => state.setLifestyleAlignment);

  return {
    token,
    user: currentUser,
    currentUser,
    profiledata,
    isAuthenticated,
    checkedToken,
    loading,
    userSession: token ? { access_token: token } : null,
    login,
    logout,
    updateProfile,
    setAuth,
    setProfile,
    setProfiledata,
    setOnboardingComplete,
    setLifestyleAlignment,
  };
}

export default useAuthStore;
