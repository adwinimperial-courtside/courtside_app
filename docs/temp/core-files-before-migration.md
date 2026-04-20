# Core Files — Pre-Migration Snapshot

Working directory: `/Users/macm5pro/Projects/courtside`
Branch: `feature/initial-schema`

---

## 1. src/lib/supabaseClient.js

```js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bikjkoyodkduhnnlbzpb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_feazoLkkfHT18LYN5HhNzw_GiOWA58o';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

**Notes:**
- Import path used across the codebase: `@/lib/supabaseClient`
- Export name: `supabase`
- Already used by: `AdminTools.jsx`, `Whiteboard.jsx`, `AuthContext.jsx`, `LiveGame.jsx`, `LiveStatTracker.jsx`, etc.

---

## 2. src/lib/AuthContext.jsx

```jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

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
        if (event === 'SIGNED_IN') {
          supabase.from('profiles').update({ last_active: new Date().toISOString() }).eq('id', session.user.id);
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = () => supabase.auth.signOut();

  const currentUser = session?.user ?? null;
  const isAuthenticated = !!session;
  const userType = userProfile?.user_type ?? null;
  const isAppAdmin = currentUser?.user_metadata?.app_admin === true;

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

**Context values exposed:**
| Value | Type | Source |
|---|---|---|
| `currentUser` | `session.user \| null` | Supabase Auth session |
| `session` | Session object | `supabase.auth.getSession()` |
| `isAuthenticated` | boolean | `!!session` |
| `isLoadingAuth` | boolean | loading flag |
| `userProfile` | object \| null | `profiles` table row |
| `userType` | string \| null | `userProfile.user_type` |
| `isAppAdmin` | boolean | `currentUser.user_metadata.app_admin === true` |
| `signOut` | function | `supabase.auth.signOut()` |

---

## 3. src/Layout.jsx

```jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Shield, Eye, LogOut, Trophy, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import SidebarMenuContent from "@/components/layout/SidebarMenuContent";
import { useAuth } from "@/lib/AuthContext";

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userProfile, userType, isAppAdmin, signOut } = useAuth();

  const isLiveGamePage = location.pathname.toLowerCase().includes("livegame");

  const getUserTypeIcon = () => {
    if (isAppAdmin || userType === "app_admin") return <Shield className="w-4 h-4" />;
    if (userType === "league_admin") return <Trophy className="w-4 h-4" />;
    if (userType === "viewer") return <Eye className="w-4 h-4" />;
    return <User className="w-4 h-4" />;
  };

  const getUserTypeLabel = () => {
    if (!userType) return "";
    return userType.replace(/_/g, " ").toUpperCase();
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/Landing");
  };

  const isViewerWithoutAdminAccess = userType === "viewer";

  if (isLiveGamePage) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100">
        {children}
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <style>{`
        :root {
          --primary: 222.2 47.4% 11.2%;
          --primary-foreground: 210 40% 98%;
          --accent: 24.6 95% 53.1%;
          --accent-foreground: 0 0% 100%;
        }
      `}</style>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-slate-100">
        <Sidebar className="border-r border-slate-200 bg-white/80 backdrop-blur-sm">
          <SidebarHeader className="border-b border-slate-200 p-6">
            ...sidebar header with logo, user type badge, logout button...
          </SidebarHeader>
          <SidebarMenuContent
            currentUser={currentUser}
            userType={userType}
            isAppAdmin={isAppAdmin}
            location={location}
            isViewerWithoutAdminAccess={isViewerWithoutAdminAccess}
          />
        </Sidebar>
        <main className="flex-1 flex flex-col">
          ...mobile header...
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
```

**Key notes:**
- Uses `useAuth()` — fully on Supabase AuthContext, no base44
- Passes `currentUser`, `userType`, `isAppAdmin` to `SidebarMenuContent`
- Logo: `/images/courtside-logo.png` (local public asset, not CDN)
- Logout: `signOut()` → navigates to `/Landing`
- LiveGame: renders children without sidebar (no auth gate)
- No `RegistrationGate`, no `ApplyPendingAssignments` — these were already removed

---

## 4. profiles Table Structure

| Column | Type | Nullable |
|---|---|---|
| `id` | uuid | NOT NULL (PK, FK → auth.users) |
| `display_name` | text | YES |
| `avatar_url` | text | YES |
| `timezone` | text | NOT NULL |
| `preferred_locale` | text | NOT NULL |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |
| `default_league_id` | uuid | YES |
| `user_type` | text | NOT NULL |
| `email` | text | YES |
| `last_active` | timestamptz | YES |
| `full_name` | text | YES |

**Key observations for migration:**
- `user_type` is in `profiles` (not Auth metadata) — AuthContext reads it as `userProfile.user_type` ✅
- `isAppAdmin` reads from `currentUser.user_metadata.app_admin` (Auth JWT metadata), NOT from profiles
- Pages still using `base44.auth.me()` expect a flat object with: `id`, `email`, `full_name`, `user_type`, `assigned_league_ids`, `default_league_id`, `display_name`, `application_status`
- `assigned_league_ids` is **NOT in profiles** — it must come from `user_league_memberships` table (join)
- `application_status` is **NOT in profiles** — it must come from `user_applications` table
