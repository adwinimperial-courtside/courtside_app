import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, UserSearch, Loader2 } from "lucide-react";

const ROLE_COLORS = {
  app_admin: "bg-red-100 text-red-800",
  league_admin: "bg-purple-100 text-purple-800",
  player: "bg-blue-100 text-blue-800",
  coach: "bg-green-100 text-green-800",
  viewer: "bg-slate-100 text-slate-700",
  user: "bg-gray-100 text-gray-700",
};

const ROLE_LABELS = {
  app_admin: "App Admin",
  league_admin: "League Admin",
  player: "Player",
  coach: "Coach",
  viewer: "Viewer",
  user: "User",
};

export default function SimulateUser() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { startImpersonation, currentUser, isAppAdmin, realIsAppAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUserId, setLoadingUserId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ["simulateUserList"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, user_type, avatar_url, created_at")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser && (isAppAdmin || realIsAppAdmin),
  });

  // Access guard
  if (currentUser && !isAppAdmin && !realIsAppAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <Card className="max-w-md border-red-200">
          <CardContent className="pt-6 text-center">
            <UserSearch className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="font-semibold text-slate-900">Access Denied</p>
            <p className="text-sm text-slate-500 mt-1">Only app admins can simulate users.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredUsers = allUsers
    .filter((u) => u.id !== currentUser?.id)
    .filter((u) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    });

  const handleSimulateClick = (user) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleConfirmSimulate = async () => {
    if (!selectedUser) return;
    setDialogOpen(false);
    setLoadingUserId(selectedUser.id);
    try {
      await startImpersonation(selectedUser.id);
      navigate("/");
    } catch (err) {
      toast({
        title: "Simulation failed",
        description: err?.message || "Could not start simulation.",
        variant: "destructive",
      });
    } finally {
      setLoadingUserId(null);
    }
  };

  const getInitials = (user) => {
    const name = user.full_name || user.email || "?";
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <UserSearch className="w-7 h-7 text-orange-500" />
            <h1 className="text-2xl font-bold text-slate-900">Simulate User</h1>
          </div>
          <p className="text-slate-500 text-sm">Browse the app as any registered user</p>
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name or email…"
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Card className="border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading users…
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <UserSearch className="w-8 h-8 opacity-40" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-200 to-orange-300 flex items-center justify-center text-orange-800 font-semibold text-sm flex-shrink-0 overflow-hidden">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      getInitials(user)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">
                      {user.full_name || "—"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                  <Badge
                    className={`text-xs flex-shrink-0 ${ROLE_COLORS[user.user_type] || "bg-slate-100 text-slate-600"}`}
                  >
                    {ROLE_LABELS[user.user_type] || user.user_type}
                  </Badge>
                  <p className="text-xs text-slate-400 flex-shrink-0 hidden sm:block w-24 text-right">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : "—"}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-shrink-0 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700"
                    onClick={() => handleSimulateClick(user)}
                    disabled={loadingUserId !== null}
                  >
                    {loadingUserId === user.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Simulate"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Start simulation as {selectedUser?.full_name || selectedUser?.email}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                You will see the app exactly as this user sees it. The simulation expires in 15
                minutes and you can exit at any time via the banner at the top of the screen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmSimulate}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Start Simulation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
