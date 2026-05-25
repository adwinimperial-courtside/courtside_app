import React, { useState } from "react";
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
import ImpersonationBanner from "@/components/layout/ImpersonationBanner";
import DevicePreviewToggle, { DEVICE_WIDTHS } from "@/components/layout/DevicePreviewToggle";
import BottomTabBar from "@/components/layout/BottomTabBar";
import MobileMoreDrawer from "@/components/layout/MobileMoreDrawer";
import { useAuth } from "@/lib/AuthContext";
import { DevicePreviewProvider } from "@/lib/DevicePreviewContext";
import "@/styles/theme.css";

const BANNER_HEIGHT = 48;

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userProfile, userType, isAppAdmin, signOut, isImpersonating, realIsAppAdmin } = useAuth();

  const [deviceMode, setDeviceMode] = useState("desktop");
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);

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

  // LiveGame / LiveStatTracker: isolated from dark theme via class reset in theme.css
  if (isLiveGamePage) {
    return (
      <DevicePreviewProvider deviceMode={deviceMode}>
        <div className="live-game-isolate min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100">
          {children}
        </div>
      </DevicePreviewProvider>
    );
  }

  const deviceWidth = DEVICE_WIDTHS[deviceMode];

  const wrappedChildren = deviceWidth ? (
    <div
      className="flex justify-center w-full h-full overflow-auto p-4"
      style={{ background: "#2A2A42" }}
    >
      <div
        className="rounded-2xl shadow-2xl overflow-auto flex-shrink-0"
        style={{
          width: `${deviceWidth}px`,
          minHeight: "100%",
          background: "var(--color-bg-page)",
          border: "1px solid var(--color-border)",
        }}
      >
        {children}
      </div>
    </div>
  ) : (
    children
  );

  return (
    <DevicePreviewProvider deviceMode={deviceMode}>
    <SidebarProvider defaultOpen={true}>
      <ImpersonationBanner />

      <div
        className="min-h-screen flex w-full"
        style={{
          background: "var(--color-bg-page)",
          ...(isImpersonating ? { paddingTop: `${BANNER_HEIGHT}px` } : {}),
        }}
      >
        {/* Desktop-only sidebar — hidden on mobile */}
        <div className="hidden md:flex">
          <Sidebar
            style={{
              background: "var(--color-bg-card)",
              borderRight: "1px solid var(--color-border)",
            }}
          >
            <SidebarHeader
              className="p-6"
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                  <img src="/images/courtside-logo.png" alt="Courtside by AI" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h2 className="font-bold text-lg" style={{ color: "var(--color-text-primary)" }}>
                    Courtside by AI
                  </h2>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Numbers Don't Lie</p>
                </div>
              </div>

              {currentUser && (
                <div className="space-y-3">
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-secondary)" }}
                  >
                    {getUserTypeIcon()}
                    <span className="text-xs font-semibold">{getUserTypeLabel()}</span>
                  </div>
                  <p className="text-xs truncate px-1" style={{ color: "var(--color-text-muted)" }}>
                    {currentUser.email}
                  </p>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full"
                    size="sm"
                    style={{
                      borderColor: "var(--color-border)",
                      color: "var(--color-text-secondary)",
                      background: "transparent",
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                  <p className="text-center text-xs pt-1" style={{ color: "var(--color-text-muted)" }}>
                    Support:{" "}
                    <a
                      href="mailto:info@courtside-by-ai.com"
                      style={{ color: "var(--color-text-secondary)" }}
                      className="hover:text-[#3B82F6] transition-colors"
                    >
                      info@courtside-by-ai.com
                    </a>
                  </p>
                </div>
              )}
            </SidebarHeader>

            <SidebarMenuContent
              currentUser={currentUser}
              userType={userType}
              isAppAdmin={isAppAdmin || realIsAppAdmin}
              location={location}
              isViewerWithoutAdminAccess={isViewerWithoutAdminAccess}
            />
          </Sidebar>
        </div>

        <main
          className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom))" }}
        >
          {/* Mobile-only header (no sidebar trigger — replaced by bottom nav) */}
          <header
            className="md:hidden sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
            style={{
              background: "var(--color-bg-card)",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
              <img src="/images/courtside-logo.png" alt="Courtside by AI" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
              Courtside by AI
            </h1>
          </header>

          {/* Desktop: show sidebar trigger in a slim top bar */}
          <div
            className="hidden md:flex items-center px-4 py-2 border-b"
            style={{ borderColor: "var(--color-border)", background: "var(--color-bg-card)" }}
          >
            <SidebarTrigger
              className="hover:bg-[#2A2A42] p-2 rounded-lg transition-colors"
              style={{ color: "var(--color-text-secondary)" }}
            />
          </div>

          <div className="flex-1 overflow-auto">
            {wrappedChildren}
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar — hidden on md+ */}
      <BottomTabBar onMorePress={() => setMoreDrawerOpen(true)} />

      {/* Mobile more drawer */}
      <MobileMoreDrawer
        open={moreDrawerOpen}
        onClose={() => setMoreDrawerOpen(false)}
        currentUser={currentUser}
        userType={userType}
        isAppAdmin={isAppAdmin || realIsAppAdmin}
      />

      {realIsAppAdmin && (
        <DevicePreviewToggle activeDevice={deviceMode} onChange={setDeviceMode} />
      )}
    </SidebarProvider>
    </DevicePreviewProvider>
  );
}
