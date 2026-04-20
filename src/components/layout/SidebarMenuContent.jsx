import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Trophy, Users, Calendar, BarChart3, Medal, Target, Layout,
  ScrollText, UserCircle, SlidersHorizontal, Newspaper, PlusCircle,
  ClipboardList, Wrench, UserSearch,
} from "lucide-react";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  { title: "Leagues",       url: createPageUrl("Leagues"),      icon: Trophy },
  { title: "Teams",         url: createPageUrl("Teams"),         icon: Users },
  { title: "Schedule",      url: createPageUrl("Schedule"),      icon: Calendar },
  { title: "Standings",     url: createPageUrl("Standings"),     icon: Trophy },
  { title: "Statistics",    url: createPageUrl("Statistics"),    icon: BarChart3 },
  { title: "Award Leaders", url: createPageUrl("AwardLeaders"),  icon: Medal },
  { title: "Coach Insights",url: createPageUrl("CoachInsights"), icon: Target },
  { title: "Whiteboard",    url: createPageUrl("Whiteboard"),    icon: Layout },
];

const leagueAdminItems = [
  { title: "Application Review", url: createPageUrl("ApplicationReview"), icon: ClipboardList },
  { title: "Award Settings",     url: createPageUrl("LeagueAwardSettings"), icon: SlidersHorizontal },
  { title: "Game Log",           url: createPageUrl("GameLog"),           icon: ScrollText },
  { title: "Admin Tools",        url: createPageUrl("AdminTools"),        icon: Wrench },
  { title: "League Users",       url: createPageUrl("LeagueUsers"),       icon: Users },
  { title: "Story Builder",      url: createPageUrl("StoryBuilder"),      icon: Newspaper },
];

// OWNER section — visible to app_admins only.
const ownerItems = [
  { title: "Simulate User", url: createPageUrl("SimulateUser"), icon: UserSearch },
];

const playerNavItem = { title: "Player Profile", url: createPageUrl("PlayerProfile"), icon: UserCircle };

export default function SidebarMenuContent({ currentUser, userType, isAppAdmin, isViewerWithoutAdminAccess }) {
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleNavigationClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  const isAdmin = isAppAdmin || userType === "league_admin";

  const getVisibleNavigationItems = () => {
    if (!currentUser) return navigationItems;
    const base = (userType === "viewer" && !isAppAdmin)
      ? navigationItems.filter(item => !["Leagues", "Teams", "Coach Insights", "Whiteboard"].includes(item.title))
      : navigationItems;
    const withRole = (userType === "player" || userType === "coach")
      ? [playerNavItem, ...base]
      : base;
    if (userType && !isAppAdmin) {
      return [...withRole, { title: "Request League Access", url: createPageUrl("ApplyForLeague"), icon: PlusCircle }];
    }
    return withRole;
  };

  const getVisibleAdminItems = () => {
    if (!isAdmin) return [];
    return leagueAdminItems;
  };

  const getVisibleOwnerItems = () => {
    if (!isAppAdmin) return [];
    return ownerItems;
  };

  const visibleNavItems = getVisibleNavigationItems();
  const visibleAdminItems = getVisibleAdminItems();
  const visibleOwnerItems = getVisibleOwnerItems();

  const menuItemClass = (url) =>
    `hover:bg-orange-50 hover:text-orange-600 transition-all duration-200 rounded-lg mb-1 ${
      location.pathname === url ? "bg-orange-50 text-orange-600 font-semibold" : ""
    }`;

  const renderItems = (items) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild className={menuItemClass(item.url)}>
          <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5" onClick={handleNavigationClick}>
            <item.icon className="w-5 h-5" />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <SidebarContent className="p-3">
      <SidebarGroup>
        <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
          Navigation
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>{renderItems(visibleNavItems)}</SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {visibleAdminItems.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
            Admin
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(visibleAdminItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      {visibleOwnerItems.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
            Owner
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(visibleOwnerItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </SidebarContent>
  );
}
