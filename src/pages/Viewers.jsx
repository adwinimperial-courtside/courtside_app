import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { Eye, Key } from "lucide-react";
import ViewersView from "../components/admin/ViewersView";

export default function Viewers() {
  const { userType, isAppAdmin } = useAuth();

  if (userType && !isAppAdmin && userType !== "app_admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--ct-bg-page)] to-[var(--ct-bg-elevated)] p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-[var(--ct-bg-card)] rounded-xl border border-red-200 p-8 text-center">
            <Key className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-[var(--ct-text-primary)] mb-2">Access Denied</h1>
            <p className="text-[var(--ct-text-secondary)]">You don't have permission to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--ct-bg-page)] to-[var(--ct-bg-elevated)] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-[var(--ct-text-primary)]">Viewers</h1>
          </div>
          <p className="text-[var(--ct-text-secondary)]">View users with Viewer access</p>
        </div>

        <ViewersView />
      </div>
    </div>
  );
}
