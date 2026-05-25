import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Trophy, Users, Medal, Target, Layout,
  ScrollText, UserCircle, SlidersHorizontal, Newspaper,
  PlusCircle, ClipboardList, Wrench, UserSearch, X,
} from "lucide-react";
import ThemeToggle from "@/components/layout/ThemeToggle";

const moreNavItems = [
  { title: "Leagues",        url: createPageUrl("Leagues"),       icon: Trophy },
  { title: "Teams",          url: createPageUrl("Teams"),          icon: Users },
  { title: "Award Leaders",  url: createPageUrl("AwardLeaders"),   icon: Medal },
  { title: "Coach Insights", url: createPageUrl("CoachInsights"),  icon: Target },
  { title: "Whiteboard",     url: createPageUrl("Whiteboard"),     icon: Layout },
];

const adminItems = [
  { title: "Application Review", url: createPageUrl("ApplicationReview"), icon: ClipboardList },
  { title: "Award Settings",     url: createPageUrl("LeagueAwardSettings"), icon: SlidersHorizontal },
  { title: "Game Log",           url: createPageUrl("GameLog"),           icon: ScrollText },
  { title: "Admin Tools",        url: createPageUrl("AdminTools"),        icon: Wrench },
  { title: "League Users",       url: createPageUrl("LeagueUsers"),       icon: Users },
  { title: "Story Builder",      url: createPageUrl("StoryBuilder"),      icon: Newspaper },
];

const ownerItems = [
  { title: "Simulate User", url: createPageUrl("SimulateUser"), icon: UserSearch },
];

export default function MobileMoreDrawer({ open, onClose, currentUser, userType, isAppAdmin }) {
  const location = useLocation();

  if (!open) return null;

  const isAdmin = isAppAdmin || userType === "league_admin";
  const isViewer = userType === "viewer" && !isAppAdmin;
  const showPlayerProfile = userType === "player" || userType === "coach";
  const showRequestAccess = !!userType && !isAppAdmin;

  const visibleMoreNav = isViewer
    ? moreNavItems.filter(i => !["Leagues", "Teams", "Coach Insights", "Whiteboard"].includes(i.title))
    : moreNavItems;

  const isActive = (url) => location.pathname === url;

  const renderItem = ({ title, url, icon: Icon }) => (
    <Link
      key={title}
      to={url}
      onClick={onClose}
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
      style={{
        color: isActive(url) ? "var(--ct-accent)" : "var(--ct-text-primary)",
        background: isActive(url) ? "var(--ct-bg-elevated)" : "transparent",
        textDecoration: "none",
      }}
    >
      <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={isActive(url) ? 2.5 : 2} />
      <span className="text-sm font-medium">{title}</span>
    </Link>
  );

  const SectionLabel = ({ children }) => (
    <div className="px-4 pt-4 pb-1">
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ct-text-muted)" }}>
        {children}
      </span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      onClick={onClose}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(15, 15, 26, 0.6)" }}
      />

      {/* Drawer panel */}
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl overflow-hidden flex flex-col"
        style={{
          background: "var(--ct-bg-card)",
          maxHeight: "85vh",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--ct-bg-elevated)" }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--ct-border)" }}
        >
          <span className="text-sm font-semibold" style={{ color: "var(--ct-text-secondary)" }}>MORE</span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg cursor-pointer bg-transparent border-0"
            style={{ color: "var(--ct-text-secondary)" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable nav list */}
        <div className="overflow-y-auto flex-1 p-3">
          {showPlayerProfile && (
            renderItem({ title: "Player Profile", url: createPageUrl("PlayerProfile"), icon: UserCircle })
          )}

          {visibleMoreNav.map(renderItem)}

          {showRequestAccess && (
            renderItem({ title: "Request League Access", url: createPageUrl("ApplyForLeague"), icon: PlusCircle })
          )}

          {isAdmin && (
            <>
              <SectionLabel>Admin</SectionLabel>
              {adminItems.map(renderItem)}
            </>
          )}

          {isAppAdmin && (
            <>
              <SectionLabel>Owner</SectionLabel>
              {ownerItems.map(renderItem)}
            </>
          )}

          {/* Theme toggle — at the bottom of the drawer */}
          <div
            className="mt-4 px-4 py-3 flex items-center justify-between rounded-xl"
            style={{ background: "var(--ct-bg-elevated)" }}
          >
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--ct-text-muted)" }}
            >
              Theme
            </span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
