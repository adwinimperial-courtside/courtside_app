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
import { useAuth } from "@/lib/AuthContext";

const BANNER_HEIGHT = 48;

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userProfile, userType, isAppAdmin, signOut, isImpersonating, realIsAppAdmin } = useAuth();

  const [deviceMode, setDeviceMode] = useState("desktop");

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

  const deviceWidth = DEVICE_WIDTHS[deviceMode];

  const wrappedChildren = deviceWidth ? (
    <div className="flex justify-center w-full h-full overflow-auto bg-slate-200 p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-auto flex-shrink-0"
        style={{ width: `${deviceWidth}px`, minHeight: "100%" }}
      >
        {children}
      </div>
    </div>
  ) : (
    children
  );

  return (
    <SidebarProvider defaultOpen={true}>
      <ImpersonationBanner />
      <style>{`
        :root {
          --primary: 222.2 47.4% 11.2%;
          --primary-foreground: 210 40% 98%;
          --accent: 24.6 95% 53.1%;
          --accent-foreground: 0 0% 100%;
        }
      `}</style>
      <div
        className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-slate-100"
        style={isImpersonating ? { paddingTop: `${BANNER_HEIGHT}px` } : undefined}
      >
        <Sidebar className="border-r border-slate-200 bg-white/80 backdrop-blur-sm">
          <SidebarHeader className="border-b border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                <img src="/images/courtside-logo.png" alt="Courtside by AI" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-lg">Courtside by AI</h2>
                <p className="text-xs text-slate-500">Numbers Don't Lie</p>
              </div>
            </div>

            {currentUser && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                  {getUserTypeIcon()}
                  <span className="text-xs font-semibold text-slate-700">{getUserTypeLabel()}</span>
                </div>
                <p className="text-xs text-slate-400 truncate px-1">{currentUser.email}</p>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full text-slate-700 hover:text-red-600 hover:border-red-300 hover:bg-red-50"
                  size="sm"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
                <p className="text-center text-xs text-slate-400 pt-1">
                  Support:{" "}
                  <a href="mailto:info@courtside-by-ai.com" className="text-slate-500 hover:text-orange-500 transition-colors">
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

        <main className="flex-1 flex flex-col min-w-0">
          <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-6 py-4 md:hidden sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger asChild>
                <button className="hover:bg-orange-100 p-2 h-12 w-12 rounded-xl transition-colors flex items-center justify-center">
                  <img src="/images/courtside-logo.png" alt="Courtside by AI" className="w-6 h-6 object-cover rounded" />
                </button>
              </SidebarTrigger>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                  <img src="/images/courtside-logo.png" alt="Courtside by AI" className="w-full h-full object-cover" />
                </div>
                <h1 className="text-lg font-bold text-slate-900">Courtside by AI</h1>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {wrappedChildren}
          </div>
        </main>
      </div>

      {realIsAppAdmin && (
        <DevicePreviewToggle activeDevice={deviceMode} onChange={setDeviceMode} />
      )}
    </SidebarProvider>
  );
}
