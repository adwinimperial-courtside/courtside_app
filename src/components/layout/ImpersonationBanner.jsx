import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut } from "lucide-react";

const ROLE_LABELS = {
  app_admin: "App Admin",
  league_admin: "League Admin",
  player: "Player",
  coach: "Coach",
  viewer: "Viewer",
  user: "User",
};

function formatCountdown(expiresAt) {
  const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function ImpersonationBanner() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isImpersonating, impersonatedUser, impersonationExpiresAt, stopImpersonation, userType } = useAuth();
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!isImpersonating || !impersonationExpiresAt) return;
    setCountdown(formatCountdown(impersonationExpiresAt));
    const interval = setInterval(() => {
      setCountdown(formatCountdown(impersonationExpiresAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [isImpersonating, impersonationExpiresAt]);

  if (!isImpersonating || !impersonatedUser) return null;

  const handleExit = async () => {
    await stopImpersonation();
    toast({ title: "Simulation ended" });
    navigate("/");
  };

  const displayName = impersonatedUser.full_name || impersonatedUser.email || "Unknown user";
  const roleLabel = ROLE_LABELS[userType || impersonatedUser.user_type] || (userType || "User");

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white flex items-center justify-center px-4 gap-3 "
      style={{ height: "48px" }}
    >
      <span className="text-sm font-semibold hidden sm:inline">Simulating:</span>
      <span className="text-sm font-bold truncate max-w-[220px]">{displayName}</span>
      <Badge className="bg-[var(--ct-bg-card)]/20 text-white text-xs border-0 hover:bg-[var(--ct-bg-card)]/30">{roleLabel}</Badge>
      <span className="ml-2 font-mono text-sm tabular-nums opacity-90">{countdown}</span>
      <Button
        size="sm"
        variant="outline"
        className="ml-4 border-white/70 text-white hover:bg-[var(--ct-bg-card)]/20 hover:text-white bg-transparent h-7 text-xs"
        onClick={handleExit}
      >
        <LogOut className="w-3 h-3 mr-1" />
        Exit Simulation
      </Button>
    </div>
  );
}
