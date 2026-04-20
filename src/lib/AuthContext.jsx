import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Impersonation state
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [realSession, setRealSession] = useState(null);
  const [impersonatedUser, setImpersonatedUser] = useState(null);
  const [impersonationExpiresAt, setImpersonationExpiresAt] = useState(null);
  const [impersonationLogId, setImpersonationLogId] = useState(null);
  const [realIsAppAdmin, setRealIsAppAdmin] = useState(false);
  const expiryTimerRef = useRef(null);
  const isImpersonatingRef = useRef(false);

  useEffect(() => {
    isImpersonatingRef.current = isImpersonating;
  }, [isImpersonating]);

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error) setUserProfile(data);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
        if (event === 'SIGNED_IN' && !isImpersonatingRef.current) {
          supabase.from('profiles').update({ last_active: new Date().toISOString() }).eq('id', session.user.id);
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = () => supabase.auth.signOut();

  const startImpersonation = async (targetUserId) => {
    const { data, error } = await supabase.functions.invoke('mint-impersonation-token', {
      body: { target_user_id: targetUserId },
    });
    if (error) {
      throw new Error(error.message || data?.error || 'Impersonation failed');
    }
    if (!data?.access_token) {
      throw new Error(data?.error || 'Impersonation failed: no access token returned');
    }

    // Stash real session for later restore
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    setRealSession(currentSession);
    setRealIsAppAdmin(true);

    // Swap to impersonated session — this triggers onAuthStateChange,
    // which refetches profile for the impersonated user automatically
    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: '',
    });

    setIsImpersonating(true);
    setImpersonatedUser(data.target_user);
    setImpersonationExpiresAt(data.expires_at);
    setImpersonationLogId(data.log_id);

    // Auto-expire
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    const msUntilExpiry = new Date(data.expires_at).getTime() - Date.now();
    if (msUntilExpiry > 0) {
      expiryTimerRef.current = setTimeout(() => {
        stopImpersonation();
      }, msUntilExpiry);
    }
  };

  const stopImpersonation = async () => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }

    if (realSession?.access_token && realSession?.refresh_token) {
      await supabase.auth.setSession({
        access_token: realSession.access_token,
        refresh_token: realSession.refresh_token,
      });
    }

    setIsImpersonating(false);
    setRealSession(null);
    setImpersonatedUser(null);
    setImpersonationExpiresAt(null);
    setImpersonationLogId(null);
    // realIsAppAdmin will be re-derived naturally from the restored session's profile
  };

  const currentUser = session?.user ?? null;
  const isAuthenticated = !!session;
  const userType = userProfile?.user_type ?? null;
  const isAppAdmin = currentUser?.user_metadata?.app_admin === true;

  // When NOT impersonating, realIsAppAdmin mirrors isAppAdmin
  const effectiveRealIsAppAdmin = isImpersonating ? realIsAppAdmin : isAppAdmin;

  return (
    <AuthContext.Provider value={{
      currentUser,
      session,
      isAuthenticated,
      isLoadingAuth,
      userProfile,
      userType,
      isAppAdmin,
      signOut,
      // Impersonation
      isImpersonating,
      impersonatedUser,
      impersonationExpiresAt,
      impersonationLogId,
      realIsAppAdmin: effectiveRealIsAppAdmin,
      startImpersonation,
      stopImpersonation,
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
