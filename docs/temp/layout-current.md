# Layout files — current contents
**Date:** 2026-04-16

---

## 1. src/Layout.jsx (main layout wrapper)

```jsx
import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Shield, Eye, LogOut, Trophy, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarHeader, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import SidebarMenuContent from "@/components/layout/SidebarMenuContent";
import ApplyPendingAssignments from "@/components/admin/ApplyPendingAssignments";
import RegistrationGate from "@/components/registration/RegistrationGate";
import PlayerIdentityModal from "@/components/registration/PlayerIdentityModal";
import { createPageUrl } from "./utils";

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlayerIdentity, setShowPlayerIdentity] = useState(false);
  const sessionStartTimeRef = useRef(null);
  const hasLoggedLoginEventRef = useRef(false);

  const isLiveGamePage = location.pathname.toLowerCase().includes('livegame');

  useEffect(() => {
    // Redirect from old domain
    if (window.location.hostname === 'courtside-by-ai.base44.app') {
      window.location.href = 'https://courtside-by-ai.com' + window.location.pathname + window.location.search;
      return;
    }

    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();  // <-- BASE44 call
        setCurrentUser(user);
        // ... analytics tracking, league redirect, player identity check
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [navigate, location.pathname]);

  // ... analytics useEffects (page nav, user active, session duration)

  const handleLogout = () => {
    // ... analytics
    base44.auth.logout('/');  // <-- BASE44 call
  };

  // Full-screen mode for LiveGame
  if (isLiveGamePage) {
    return (
      <>
        <ApplyPendingAssignments />
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100">
          {children}
        </div>
      </>
    );
  }

  // Registration gate for new users
  if (!isLoading && showRegistrationGate) {
    return <RegistrationGate user={currentUser} />;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <ApplyPendingAssignments />
      {/* ... sidebar with logo, user badge, logout button, SidebarMenuContent */}
      <main className="flex-1 flex flex-col">
        {/* mobile header */}
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </SidebarProvider>
  );
}
```

### ⚠️ Issues
- Uses `base44.auth.me()` to fetch current user — **not Supabase**
- Uses `base44.auth.logout('/')` for logout — **not Supabase**
- Uses `base44.analytics.track(...)` throughout — Base44 analytics, will fail/error silently
- Uses `base44.functions.invoke('recordLoginEvent', {})` — Base44 cloud function
- Logo still points to Supabase CDN Base44 bucket URL
- `RegistrationGate`, `PlayerIdentityModal`, `ApplyPendingAssignments` all likely Base44-dependent
- `currentUser` shape is Base44 User (has `.full_name`, `.user_type`, `.application_status`, `.assigned_league_ids`) — different from Supabase profiles shape

**This file needs a full rebuild for Phase 5.**

---

## 2. src/components/layout/SidebarMenuContent.jsx

```jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
// ... lucide icons, shadcn sidebar components

const navigationItems = [
  { title: "Leagues",       url: createPageUrl("Leagues"),       icon: Trophy },
  { title: "Teams",         url: createPageUrl("Teams"),         icon: Users },
  { title: "Schedule",      url: createPageUrl("Schedule"),      icon: Calendar },
  { title: "Standings",     url: createPageUrl("Standings"),     icon: Trophy },
  { title: "Statistics",    url: createPageUrl("Statistics"),    icon: BarChart3 },
  { title: "Award Leaders", url: createPageUrl("AwardLeaders"),  icon: Medal },
  { title: "Coach Insights",url: createPageUrl("CoachInsights"), icon: Target },
  { title: "Whiteboard",    url: createPageUrl("Whiteboard"),    icon: Layout },
];

const adminItems = [{ title: "Admin Tools", ... }];
const leagueAdminItems = [{ title: "Game Log", ... }, { title: "League Users", ... }, { title: "Story Builder", ... }];
const ownerItems = [/* Requests, User Management, User Roles, Analytics, Delete League, Data Backup,
                       Roster User Matching, League Award Settings, All Players, Season Recap */];

export default function SidebarMenuContent({ currentUser, location, isViewerWithoutAdminAccess }) {
  // useQuery for userApplications and allUsers — both call base44.entities (BASE44)
  // getVisibleNavigationItems() — filters by user_type
  // getVisibleAdminItems() — app_admin + league_admin
  // getVisibleOwnerItems() — app_admin only
  // renders SidebarMenu with Link items, badge counts for Requests/User Roles
}
```

### ⚠️ Issues
- Two `useQuery` calls hit `base44.entities.UserApplication.list()` and `base44.entities.User.list()` — **Base44 only**
- `currentUser` shape from Base44 (`user_type`, `application_status`) — needs rebinding to Supabase profiles
- `createPageUrl` lowercases URLs — affects nav links (known bug for camelCase pages)
- Navigation items, grouping logic, and role-based visibility are otherwise good and reusable

**Needs rebuild: replace base44 queries with Supabase, rebind currentUser to useAuth().**

---

## Summary

| File | Base44 dependency | Rebuild needed |
|------|-------------------|----------------|
| src/Layout.jsx | Heavy (auth, logout, analytics, functions) | Yes — Phase 5 |
| src/components/layout/SidebarMenuContent.jsx | Moderate (2 queries) | Yes — Phase 5 |
