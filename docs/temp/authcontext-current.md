# AuthContext files — current contents
**Date:** 2026-04-16

---

## 1. src/lib/AuthContext.jsx (active — Supabase)

```jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    // Load existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoadingAuth(false);
    });

    // Keep session in sync with auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = () => supabase.auth.signOut();

  const currentUser = session?.user ?? null;
  const isAuthenticated = !!session;

  return (
    <AuthContext.Provider value={{
      currentUser,
      session,
      isAuthenticated,
      isLoadingAuth,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Notes
- Already fully implemented against Supabase Auth
- Exposes: `currentUser`, `session`, `isAuthenticated`, `isLoadingAuth`, `signOut`
- Does NOT expose `userProfile` / `user_type` — needs to be extended to fetch profiles row
- `Home.jsx` already uses `useAuth` correctly with `isAuthenticated` + `isLoadingAuth`

---

## 2. src/lib/AuthContextBase44.jsx (legacy — Base44, unused)

```jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    // ... Base44 SDK token/app settings check
  };

  const checkUserAuth = async () => {
    // ... base44.auth.me()
  };

  const logout = (shouldRedirect = true) => {
    // ... base44.auth.logout()
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings,
      authError, appPublicSettings, logout, navigateToLogin, checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => { ... };
```

### Notes
- Legacy Base44 implementation — not used by any current code
- Safe to ignore; keep file in place but do not import from it
- Active `AuthContext.jsx` already replaces this entirely

---

## Summary

| File | Status | Action needed |
|------|--------|---------------|
| AuthContext.jsx | Active, Supabase | Extend to fetch `profiles.user_type` and expose it |
| AuthContextBase44.jsx | Legacy, unused | Leave in place, ignore |
