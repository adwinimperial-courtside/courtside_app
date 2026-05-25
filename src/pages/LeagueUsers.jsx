import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { useIsNarrowLayout } from "@/lib/DevicePreviewContext";
import {
  Search, Users, ChevronDown, ChevronUp, Download,
  UserMinus, RefreshCw, Shield, UserPlus, Copy, Mail,
  Clock, CheckCircle2, XCircle,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

// Dark Court palette — translucent bg + role-coloured text
const ROLE_COLORS = {
  player:       "bg-[rgb(var(--ct-success-rgb)/0.2)] text-[var(--ct-success)]",
  coach:        "bg-[rgb(var(--ct-accent-rgb)/0.2)] text-[var(--ct-accent)]",
  league_admin: "bg-[rgb(var(--ct-accent-gold-rgb)/0.2)] text-[var(--ct-accent-gold)]",
  viewer:       "bg-[rgb(var(--ct-text-secondary-rgb)/0.2)] text-[var(--ct-text-secondary)]",
  app_admin:    "bg-[rgb(var(--ct-danger-rgb)/0.2)] text-[var(--ct-danger)]",
};

const ROLE_LABELS = {
  player:       "Player",
  coach:        "Coach",
  league_admin: "League Admin",
  viewer:       "Viewer",
};

const AVATAR_COLORS = {
  player:       "bg-blue-500",
  coach:        "bg-green-500",
  league_admin: "bg-purple-500",
  viewer:       "bg-[var(--ct-text-muted)]",
};

const ROLES = ["viewer", "player", "coach", "league_admin"];
const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function displayName(profile) {
  if (!profile) return "Anonymous User";
  const email = profile.email ?? "";
  if (email.endsWith("@privaterelay.appleid.com")) return "Apple User";
  return profile.full_name || profile.display_name || email.split("@")[0] || "Anonymous User";
}

function relativeTime(ts) {
  if (!ts) return "Never";
  return formatDistanceToNow(new Date(ts), { addSuffix: true });
}

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function inviteUrl(token) {
  return `${window.location.origin}/invite/${token}`;
}

async function sendInviteEmail({ email, inviterName, leagueName, role, token }) {
  try {
    await supabase.functions.invoke("send-invite-email", {
      body: { email, inviterName, leagueName, role, inviteUrl: inviteUrl(token) },
    });
  } catch {
    // Non-fatal — invite record exists, admin can share link manually
  }
}

// ─── UserRow ──────────────────────────────────────────────────────────────────

function UserRow({ user, isAppAdmin, managedLeagueIds, onRoleChange, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const [updatingMembership, setUpdatingMembership] = useState(null);
  const name = displayName(user.profile);
  const primaryRole = user.memberships[0]?.role ?? "viewer";

  const manageableMemberships = isAppAdmin
    ? user.memberships
    : user.memberships.filter(m => managedLeagueIds.includes(m.league_id));

  async function handleRoleChange(membershipId, newRole) {
    setUpdatingMembership(membershipId);
    try {
      const { error } = await supabase
        .from("user_league_memberships")
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq("id", membershipId);
      if (error) throw error;
      toast({ title: "Role updated" });
      onRoleChange(user.profile.id, membershipId, newRole);
    } catch (err) {
      toast({ title: "Failed to update role", description: err.message, variant: "destructive" });
    } finally {
      setUpdatingMembership(null);
    }
  }

  return (
    <div className="border-b border-[var(--ct-border)] last:border-0">
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--ct-bg-elevated)] cursor-pointer transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`w-9 h-9 rounded-full ${AVATAR_COLORS[primaryRole] ?? "bg-[var(--ct-text-muted)]"} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--ct-text-primary)] truncate">{name}</p>
          <p className="text-xs text-[var(--ct-text-secondary)] truncate">{user.profile.email || "—"}</p>
        </div>
        <div className="hidden sm:flex flex-wrap gap-1 justify-end max-w-[200px]">
          {[...new Set(user.memberships.map(m => m.role))].map(role => (
            <Badge key={role} className={`${ROLE_COLORS[role]} text-xs`}>{ROLE_LABELS[role]}</Badge>
          ))}
        </div>
        <div className="hidden md:block text-xs text-[var(--ct-text-muted)] w-24 text-right flex-shrink-0">
          {user.memberships[0]?.joined_at ? format(new Date(user.memberships[0].joined_at), "MMM d, yyyy") : "—"}
        </div>
        <div className="hidden lg:block text-xs text-[var(--ct-text-muted)] w-24 text-right flex-shrink-0">
          {relativeTime(user.profile.last_active)}
        </div>
        <div className="text-[var(--ct-text-muted)] flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 bg-[var(--ct-bg-page)]/60 border-t border-[var(--ct-border)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs font-semibold text-[var(--ct-text-muted)] uppercase tracking-wider mb-1">Email</p>
              <p className="text-sm text-[var(--ct-text-primary)]">{user.profile.email || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--ct-text-muted)] uppercase tracking-wider mb-1">Last Active</p>
              <p className="text-sm text-[var(--ct-text-primary)]">{relativeTime(user.profile.last_active)}</p>
            </div>
          </div>
          <p className="text-xs font-semibold text-[var(--ct-text-muted)] uppercase tracking-wider mb-2">League Memberships</p>
          <div className="space-y-2">
            {manageableMemberships.map(m => (
              <div key={m.id} className="flex items-center gap-3 bg-[var(--ct-bg-card)] rounded-lg px-3 py-2 border border-[var(--ct-border)]">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--ct-text-primary)] truncate">{m.league_name}</p>
                  <p className="text-xs text-[var(--ct-text-secondary)]">
                    Joined {m.joined_at ? format(new Date(m.joined_at), "MMM d, yyyy") : "—"}
                  </p>
                </div>
                <Select value={m.role} onValueChange={v => handleRoleChange(m.id, v)} disabled={updatingMembership === m.id}>
                  <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r} className="text-xs">{ROLE_LABELS[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
                {updatingMembership === m.id && <RefreshCw className="w-4 h-4 animate-spin text-[var(--ct-text-muted)]" />}
                {isAppAdmin && (
                  <Button
                    variant="ghost" size="sm"
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={e => { e.stopPropagation(); onRemove(user.profile, m); }}
                  >
                    <UserMinus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {manageableMemberships.length === 0 && <p className="text-sm text-[var(--ct-text-muted)]">No manageable memberships</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PendingInvites ───────────────────────────────────────────────────────────

function PendingInvites({ invites, isAppAdmin, currentUser, managedLeagues, onResend, onRevoke }) {
  const [open, setOpen] = useState(false);
  if (invites.length === 0) return null;

  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-[var(--ct-text-primary)] hover:text-[var(--ct-text-primary)] mb-2"
      >
        <Mail className="w-4 h-4 text-orange-500" />
        Pending Invites ({invites.length})
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="bg-[var(--ct-bg-card)] rounded-xl border border-orange-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-orange-50 text-xs text-[var(--ct-text-secondary)] border-b border-orange-200">
                <tr>
                  <th className="py-2 px-4 text-left">Email</th>
                  <th className="py-2 px-3 text-left">Role</th>
                  {isAppAdmin && <th className="py-2 px-3 text-left">League</th>}
                  <th className="py-2 px-3 text-left">Invited By</th>
                  <th className="py-2 px-3 text-left">Sent</th>
                  <th className="py-2 px-3 text-left">Expires</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ct-border)]">
                {invites.map(inv => {
                  const expired = isPast(new Date(inv.expires_at));
                  const leagueName = managedLeagues.find(l => l.id === inv.league_id)?.name ?? "—";
                  return (
                    <tr key={inv.id} className={expired ? "opacity-60" : ""}>
                      <td className="py-2 px-4 font-medium text-[var(--ct-text-primary)]">{inv.email}</td>
                      <td className="py-2 px-3">
                        <Badge className={`${ROLE_COLORS[inv.role]} text-xs`}>{ROLE_LABELS[inv.role]}</Badge>
                      </td>
                      {isAppAdmin && <td className="py-2 px-3 text-[var(--ct-text-secondary)] text-xs">{leagueName}</td>}
                      <td className="py-2 px-3 text-[var(--ct-text-secondary)] text-xs">
                        {inv.inviter?.full_name || inv.inviter?.display_name || "—"}
                      </td>
                      <td className="py-2 px-3 text-[var(--ct-text-secondary)] text-xs">{relativeTime(inv.created_at)}</td>
                      <td className={`py-2 px-3 text-xs font-medium ${expired ? "text-red-600" : "text-[var(--ct-text-secondary)]"}`}>
                        {expired ? "Expired" : `in ${formatDistanceToNow(new Date(inv.expires_at))}`}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 px-2 text-xs text-[var(--ct-text-secondary)]"
                            title="Copy invite link"
                            onClick={() => { navigator.clipboard.writeText(inviteUrl(inv.token)); toast({ title: "Link copied" }); }}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800"
                            onClick={() => onResend(inv)}
                          >
                            Resend
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 px-2 text-xs text-red-500 hover:text-red-700"
                            onClick={() => onRevoke(inv)}
                          >
                            Revoke
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mobile user card ─────────────────────────────────────────────────────────

// Pick the "most privileged" role across all of a user's memberships for display.
const ROLE_RANK = { league_admin: 3, coach: 2, player: 1, viewer: 0 };
function primaryRoleOf(user) {
  let best = "viewer";
  let bestRank = -1;
  for (const m of user.memberships) {
    const r = ROLE_RANK[m.role] ?? -1;
    if (r > bestRank) { best = m.role; bestRank = r; }
  }
  return best;
}

function UserCardMobile({ user, isAppAdmin, managedLeagueIds, onRoleChange, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const [updatingMembership, setUpdatingMembership] = useState(null);
  const name = displayName(user.profile);
  const role = primaryRoleOf(user);

  const manageableMemberships = isAppAdmin
    ? user.memberships
    : user.memberships.filter(m => managedLeagueIds.includes(m.league_id));

  async function handleRoleChange(membershipId, newRole) {
    setUpdatingMembership(membershipId);
    try {
      const { error } = await supabase
        .from("user_league_memberships")
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq("id", membershipId);
      if (error) throw error;
      toast({ title: "Role updated" });
      onRoleChange(user.profile.id, membershipId, newRole);
    } catch (err) {
      toast({ title: "Failed to update role", description: err.message, variant: "destructive" });
    } finally {
      setUpdatingMembership(null);
    }
  }

  return (
    <div
      className="rounded-xl mb-2"
      style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)", padding: "16px" }}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left bg-transparent border-0 p-0 cursor-pointer"
        style={{ minHeight: 44 }}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate" style={{ color: "var(--ct-text-primary)" }}>
                {name}
              </span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 ${ROLE_COLORS[role] || ROLE_COLORS.viewer}`}
              >
                {ROLE_LABELS[role] || role}
              </span>
            </div>
            <p className="text-xs truncate" style={{ color: "var(--ct-text-muted)" }}>
              {user.profile.email || "—"}
            </p>
          </div>
          <ChevronDown
            className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 mt-0.5 ${expanded ? "rotate-180" : ""}`}
            style={{ color: "var(--ct-text-muted)" }}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="mt-3 rounded-lg p-3 flex flex-col gap-3"
              style={{ background: "var(--ct-bg-page)" }}
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--ct-text-muted)" }}>
                  Last Active
                </p>
                <p className="text-sm" style={{ color: "var(--ct-text-primary)" }}>
                  {relativeTime(user.profile.last_active)}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--ct-text-muted)" }}>
                  League Memberships
                </p>
                {manageableMemberships.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--ct-text-muted)" }}>No manageable memberships</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {manageableMemberships.map(m => (
                      <div
                        key={m.id}
                        className="rounded-lg p-2.5 flex flex-col gap-2"
                        style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)" }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate" style={{ color: "var(--ct-text-primary)" }}>
                            {m.league_name}
                          </span>
                          {updatingMembership === m.id && (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" style={{ color: "var(--ct-text-muted)" }} />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={m.role}
                            onValueChange={v => handleRoleChange(m.id, v)}
                            disabled={updatingMembership === m.id}
                          >
                            <SelectTrigger className="flex-1 h-10 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map(r => (
                                <SelectItem key={r} value={r} className="text-xs">
                                  {ROLE_LABELS[r]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isAppAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemove(user.profile, m)}
                              className="h-10 w-10 p-0 flex-shrink-0"
                              style={{ color: "var(--ct-danger)" }}
                              title="Remove from league"
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function LeagueUsers() {
  const { currentUser, isAppAdmin, userType, userProfile } = useAuth();
  const canAccess = isAppAdmin || userType === "league_admin";
  const isNarrow = useIsNarrowLayout();

  // ── Users data ───────────────────────────────────────────────────────────────
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [managedLeagues, setManagedLeagues] = useState([]);

  useEffect(() => {
    if (!currentUser || !canAccess) return;
    loadUsers();
    loadInvites();
  }, [currentUser, isAppAdmin]);

  async function loadUsers() {
    setLoading(true);
    try {
      let leagueIds = null;

      if (!isAppAdmin) {
        const { data: myMemberships } = await supabase
          .from("user_league_memberships")
          .select("league_id, leagues(id, name)")
          .eq("user_id", currentUser.id)
          .eq("role", "league_admin")
          .eq("is_active", true);
        const myLeagues = (myMemberships ?? []).map(m => m.leagues).filter(Boolean);
        setManagedLeagues(myLeagues);
        leagueIds = myLeagues.map(l => l.id);
        if (leagueIds.length === 0) { setAllUsers([]); setLoading(false); return; }
      } else {
        const { data: leagueData } = await supabase.from("leagues").select("id, name").eq("is_active", true).order("name");
        setManagedLeagues(leagueData ?? []);
      }

      let query = supabase
        .from("user_league_memberships")
        .select(`
          id, role, league_id, is_active, joined_at,
          profile:profiles!user_league_memberships_profiles_fk(id, full_name, display_name, email, user_type, last_active, created_at),
          league:leagues!league_id(id, name)
        `)
        .eq("is_active", true)
        .order("joined_at", { ascending: false });

      if (leagueIds) query = query.in("league_id", leagueIds);

      const { data: memberships, error } = await query;
      if (error) throw error;

      const userMap = new Map();
      for (const m of memberships ?? []) {
        if (!m.profile) continue;
        const uid = m.profile.id;
        if (!userMap.has(uid)) userMap.set(uid, { profile: m.profile, memberships: [] });
        userMap.get(uid).memberships.push({
          id: m.id, role: m.role,
          league_id: m.league_id, league_name: m.league?.name ?? "—",
          joined_at: m.joined_at,
        });
      }
      setAllUsers(Array.from(userMap.values()));
    } catch (err) {
      toast({ title: "Failed to load users", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function handleRoleChange(profileId, membershipId, newRole) {
    setAllUsers(prev => prev.map(u => {
      if (u.profile.id !== profileId) return u;
      return { ...u, memberships: u.memberships.map(m => m.id === membershipId ? { ...m, role: newRole } : m) };
    }));
  }

  // ── Remove from league ───────────────────────────────────────────────────────
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  async function confirmRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const { error } = await supabase.from("user_league_memberships").delete().eq("id", removeTarget.membership.id);
      if (error) throw error;
      toast({ title: `${displayName(removeTarget.profile)} removed from ${removeTarget.membership.league_name}` });
      setAllUsers(prev => prev.map(u => {
        if (u.profile.id !== removeTarget.profile.id) return u;
        const remaining = u.memberships.filter(m => m.id !== removeTarget.membership.id);
        return remaining.length > 0 ? { ...u, memberships: remaining } : null;
      }).filter(Boolean));
      setRemoveTarget(null);
    } catch (err) {
      toast({ title: "Failed to remove user", description: err.message, variant: "destructive" });
    } finally {
      setRemoving(false);
    }
  }

  // ── Invitations ──────────────────────────────────────────────────────────────
  const [pendingInvites, setPendingInvites] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("player");
  const [inviteLeagueId, setInviteLeagueId] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revoking, setRevoking] = useState(false);

  async function loadInvites() {
    let query = supabase
      .from("league_invitations")
      .select(`*, inviter:profiles!invited_by(display_name, full_name)`)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!isAppAdmin && managedLeagues.length > 0) {
      query = query.in("league_id", managedLeagues.map(l => l.id));
    }
    const { data } = await query;
    setPendingInvites(data ?? []);
  }

  function openInviteModal() {
    setInviteEmail("");
    setInviteRole("player");
    setInviteLeagueId(managedLeagues.length === 1 ? managedLeagues[0].id : "");
    setShowInviteModal(true);
  }

  async function submitInvite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !inviteRole || !inviteLeagueId) return;
    setInviteSubmitting(true);
    try {
      const league = managedLeagues.find(l => l.id === inviteLeagueId);

      // Check if user already has a profile (account exists)
      const { data: existingProfile } = await supabase
        .from("profiles").select("id, full_name, display_name, email").eq("email", email).maybeSingle();

      if (existingProfile) {
        // Check if already a member
        const { data: existingMembership } = await supabase
          .from("user_league_memberships")
          .select("id")
          .eq("user_id", existingProfile.id)
          .eq("league_id", inviteLeagueId)
          .maybeSingle();

        if (existingMembership) {
          toast({ title: "Already a member", description: `${email} is already in ${league?.name}.`, variant: "destructive" });
          return;
        }

        // Auto-add existing user
        const { error } = await supabase.from("user_league_memberships").insert({
          user_id: existingProfile.id,
          league_id: inviteLeagueId,
          role: inviteRole,
          is_active: true,
          invited_by: currentUser.id,
        });
        if (error) throw error;
        toast({ title: `${displayName(existingProfile)} added to ${league?.name} as ${ROLE_LABELS[inviteRole]}` });
        loadUsers();
        setShowInviteModal(false);
        return;
      }

      // New user — create invite record
      const token = generateToken();
      const { error: invErr } = await supabase.from("league_invitations").insert({
        league_id: inviteLeagueId,
        email,
        role: inviteRole,
        invited_by: currentUser.id,
        token,
      });
      if (invErr) throw invErr;

      // Send email (non-blocking)
      await sendInviteEmail({
        email,
        inviterName: displayName(userProfile),
        leagueName: league?.name ?? "",
        role: inviteRole,
        token,
      });

      toast({ title: `Invitation sent to ${email}` });
      loadInvites();
      setShowInviteModal(false);
    } catch (err) {
      toast({ title: "Failed to send invite", description: err.message, variant: "destructive" });
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function handleResend(inv) {
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    try {
      await supabase.from("league_invitations").update({ expires_at: newExpiry }).eq("id", inv.id);
      const league = managedLeagues.find(l => l.id === inv.league_id);
      await sendInviteEmail({
        email: inv.email,
        inviterName: displayName(userProfile),
        leagueName: league?.name ?? "",
        role: inv.role,
        token: inv.token,
      });
      toast({ title: "Invitation resent" });
      setPendingInvites(prev => prev.map(i => i.id === inv.id ? { ...i, expires_at: newExpiry } : i));
    } catch (err) {
      toast({ title: "Failed to resend", description: err.message, variant: "destructive" });
    }
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await supabase.from("league_invitations").update({ status: "revoked" }).eq("id", revokeTarget.id);
      toast({ title: `Invitation to ${revokeTarget.email} revoked` });
      setPendingInvites(prev => prev.filter(i => i.id !== revokeTarget.id));
      setRevokeTarget(null);
    } catch (err) {
      toast({ title: "Failed to revoke", description: err.message, variant: "destructive" });
    } finally {
      setRevoking(false);
    }
  }

  // ── Filters + sort ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterLeague, setFilterLeague] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = allUsers;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u => displayName(u.profile).toLowerCase().includes(q) || (u.profile.email ?? "").toLowerCase().includes(q));
    }
    if (filterLeague !== "all") list = list.filter(u => u.memberships.some(m => m.league_id === filterLeague));
    if (filterRole !== "all") list = list.filter(u => u.memberships.some(m => m.role === filterRole));
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "name_asc":  return displayName(a.profile).localeCompare(displayName(b.profile));
        case "name_desc": return displayName(b.profile).localeCompare(displayName(a.profile));
        case "newest":    return new Date(b.memberships[0]?.joined_at ?? 0) - new Date(a.memberships[0]?.joined_at ?? 0);
        case "oldest":    return new Date(a.memberships[0]?.joined_at ?? 0) - new Date(b.memberships[0]?.joined_at ?? 0);
        case "last_active": {
          const ta = a.profile.last_active ? new Date(a.profile.last_active) : new Date(0);
          const tb = b.profile.last_active ? new Date(b.profile.last_active) : new Date(0);
          return tb - ta;
        }
        default: return 0;
      }
    });
  }, [allUsers, search, filterLeague, filterRole, sortBy]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  const roleCounts = useMemo(() => {
    const counts = { viewer: 0, player: 0, coach: 0, league_admin: 0 };
    for (const u of filtered) for (const m of u.memberships) if (counts[m.role] !== undefined) counts[m.role]++;
    return counts;
  }, [filtered]);

  // ── CSV export ───────────────────────────────────────────────────────────────
  function exportCSV() {
    const headers = ["Name", "Email", "Roles", "Leagues", "Joined", "Last Active"];
    const rows = filtered.map(u => [
      displayName(u.profile),
      u.profile.email ?? "",
      [...new Set(u.memberships.map(m => ROLE_LABELS[m.role] ?? m.role))].join("; "),
      u.memberships.map(m => m.league_name).join("; "),
      u.memberships[0]?.joined_at ? format(new Date(u.memberships[0].joined_at), "yyyy-MM-dd") : "",
      u.profile.last_active ? format(new Date(u.profile.last_active), "yyyy-MM-dd HH:mm") : "Never",
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "league-users.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Access guard ─────────────────────────────────────────────────────────────
  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--ct-bg-page)] to-[var(--ct-bg-elevated)] p-6 flex items-center justify-center">
        <div className="bg-[var(--ct-bg-card)] rounded-xl border border-red-200 p-8 text-center">
          <Shield className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[var(--ct-text-primary)] mb-2">Access Denied</h1>
          <p className="text-[var(--ct-text-secondary)]">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: "var(--color-bg-page)" }}>
      <div className="max-w-5xl mx-auto">

        {/* Mobile header (compact, no action buttons — those are in the mobile action row below) */}
        {isNarrow && (
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)" }}
            >
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight truncate" style={{ color: "var(--ct-text-primary)" }}>
                League Users
              </h1>
              <p className="text-xs truncate" style={{ color: "var(--ct-text-muted)" }}>
                {isAppAdmin ? "All leagues" : `${managedLeagues.length} league${managedLeagues.length !== 1 ? "s" : ""} you manage`}
              </p>
            </div>
          </div>
        )}

        {/* Desktop header */}
        {!isNarrow && (
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center ">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[var(--ct-text-primary)]">League Users</h1>
              <p className="text-[var(--ct-text-secondary)] text-sm">
                {isAppAdmin ? "All leagues" : `${managedLeagues.length} league${managedLeagues.length !== 1 ? "s" : ""} you manage`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} className="flex items-center gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </Button>
            <Button size="sm" onClick={openInviteModal} className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Invite User
            </Button>
          </div>
        </div>
        )}

        {/* Mobile: 2x2 stats grid */}
        {isNarrow && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: "Total Users", value: filtered.length },
              { label: "Players", value: roleCounts.player },
              { label: "Coaches", value: roleCounts.coach },
              { label: "Viewers", value: roleCounts.viewer },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl p-3"
                style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)" }}
              >
                <p className="text-xs uppercase tracking-wider" style={{ color: "var(--ct-text-muted)" }}>
                  {m.label}
                </p>
                <p className="text-2xl font-bold" style={{ color: "var(--ct-text-primary)" }}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Mobile: action buttons */}
        {isNarrow && (
          <div className="flex gap-2 mb-4">
            <Button
              onClick={openInviteModal}
              className="flex-1 rounded-lg"
              style={{ background: "var(--ct-accent)", color: "#ffffff", border: "none", height: 44 }}
            >
              <UserPlus className="w-4 h-4 mr-1.5" /> Invite User
            </Button>
            <Button
              variant="outline"
              onClick={exportCSV}
              className="flex-1 rounded-lg"
              style={{ background: "var(--ct-bg-elevated)", color: "var(--ct-text-secondary)", border: "none", height: 44 }}
            >
              <Download className="w-4 h-4 mr-1.5" /> Export
            </Button>
          </div>
        )}

        {/* Mobile: role filter pills */}
        {isNarrow && (
          <div
            className="flex gap-2 overflow-x-auto mb-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {[
              { id: "all", label: "All" },
              { id: "league_admin", label: "Admin" },
              { id: "coach", label: "Coach" },
              { id: "player", label: "Player" },
              { id: "viewer", label: "Viewer" },
            ].map((p) => {
              const active = filterRole === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => { setFilterRole(p.id); setPage(1); }}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap"
                  style={{
                    background: active ? "var(--ct-accent)" : "var(--ct-bg-elevated)",
                    color:      active ? "#ffffff" : "var(--ct-text-secondary)",
                    border: "none",
                    cursor: "pointer",
                    minHeight: 32,
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Mobile: compact search */}
        {isNarrow && (
          <div className="relative mb-4">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: "var(--ct-text-muted)" }}
            />
            <input
              type="text"
              placeholder="Search users…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 rounded-full text-sm focus:outline-none"
              style={{
                background: "var(--ct-bg-elevated)",
                border: "1px solid var(--ct-border)",
                color: "var(--ct-text-primary)",
                height: 44,
              }}
            />
          </div>
        )}

        {/* Desktop-only: role summary chips */}
        {!isNarrow && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setFilterRole("all")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filterRole === "all" ? "bg-[var(--ct-accent)] text-white" : "bg-[var(--ct-bg-elevated)] text-[var(--ct-text-primary)] hover:bg-[var(--ct-bg-elevated)]"}`}
          >
            All: {filtered.length}
          </button>
          {["viewer", "player", "coach", "league_admin"].map(role => (
            roleCounts[role] > 0 && (
              <button
                key={role}
                onClick={() => setFilterRole(r => r === role ? "all" : role)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filterRole === role ? "ring-2 ring-offset-1 ring-slate-400" : ""} ${ROLE_COLORS[role]}`}
              >
                {ROLE_LABELS[role]}: {roleCounts[role]}
              </button>
            )
          ))}
        </div>
        )}

        {/* Pending invites — desktop-only (has a wide table that overflows on mobile) */}
        {!isNarrow && (
          <PendingInvites
            invites={pendingInvites}
            isAppAdmin={isAppAdmin}
            currentUser={currentUser}
            managedLeagues={managedLeagues}
            onResend={handleResend}
            onRevoke={setRevokeTarget}
          />
        )}

        {/* Mobile: one-line pending-invites summary */}
        {isNarrow && pendingInvites.length > 0 && (
          <div
            className="rounded-lg px-3 py-2 mb-3 flex items-center gap-2"
            style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)" }}
          >
            <Mail className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ct-accent-gold)" }} />
            <span className="text-xs" style={{ color: "var(--ct-accent-gold)" }}>
              {pendingInvites.length} pending invite{pendingInvites.length !== 1 ? "s" : ""} — manage on desktop
            </span>
          </div>
        )}

        {/* Desktop-only filters */}
        {!isNarrow && (
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ct-text-muted)]" />
            <Input placeholder="Search name or email…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 bg-[var(--ct-bg-card)] " />
          </div>
          <Select value={filterLeague} onValueChange={v => { setFilterLeague(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-48 bg-[var(--ct-bg-card)] "><SelectValue placeholder="All Leagues" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leagues</SelectItem>
              {managedLeagues.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterRole} onValueChange={v => { setFilterRole(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-36 bg-[var(--ct-bg-card)] "><SelectValue placeholder="All Roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-44 bg-[var(--ct-bg-card)] "><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name_asc">Name A–Z</SelectItem>
              <SelectItem value="name_desc">Name Z–A</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="last_active">Last Active</SelectItem>
            </SelectContent>
          </Select>
        </div>
        )}

        {/* User list */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-[var(--ct-bg-card)] rounded-xl animate-pulse" />)}
          </div>
        ) : paginated.length === 0 ? (
          <div className="bg-[var(--ct-bg-card)] rounded-xl border border-[var(--ct-border)] p-12 text-center">
            <Users className="w-10 h-10 text-[var(--ct-text-muted)] mx-auto mb-3" />
            <p className="text-[var(--ct-text-secondary)]">No users found{search ? ` for "${search}"` : ""}.</p>
          </div>
        ) : isNarrow ? (
          <div>
            {paginated.map(user => (
              <UserCardMobile
                key={user.profile.id}
                user={user}
                isAppAdmin={isAppAdmin}
                managedLeagueIds={managedLeagues.map(l => l.id)}
                onRoleChange={handleRoleChange}
                onRemove={(profile, membership) => setRemoveTarget({ profile, membership })}
              />
            ))}
            <p className="text-xs text-center mt-2" style={{ color: "var(--ct-text-muted)" }}>
              Showing {paginated.length} of {filtered.length} user{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        ) : (
          <div className="bg-[var(--ct-bg-card)] rounded-xl border border-[var(--ct-border)] overflow-hidden">
            {paginated.map(user => (
              <UserRow
                key={user.profile.id}
                user={user}
                isAppAdmin={isAppAdmin}
                managedLeagueIds={managedLeagues.map(l => l.id)}
                onRoleChange={handleRoleChange}
                onRemove={(profile, membership) => setRemoveTarget({ profile, membership })}
              />
            ))}
            <div className="px-4 py-2 text-xs text-[var(--ct-text-muted)] border-t border-[var(--ct-border)]">
              Showing {paginated.length} of {filtered.length} user{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}

        {hasMore && (
          <Button variant="outline" className="w-full mt-4" onClick={() => setPage(p => p + 1)}>Load More</Button>
        )}
      </div>

      {/* ── Invite Modal ───────────────────────────────────────────────── */}
      <Dialog open={showInviteModal} onOpenChange={v => { if (!v) setShowInviteModal(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-orange-600" /> Invite User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Email address</Label>
              <Input
                type="email"
                placeholder="player@example.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="mt-1"
                onKeyDown={e => e.key === "Enter" && submitInvite()}
              />
            </div>
            {(isAppAdmin || managedLeagues.length > 1) && (
              <div>
                <Label>League</Label>
                <Select value={inviteLeagueId} onValueChange={setInviteLeagueId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select league" /></SelectTrigger>
                  <SelectContent>
                    {managedLeagues.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-[var(--ct-text-secondary)]">
              If this email already has an account, they'll be added instantly. Otherwise an invite link will be sent.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteModal(false)} disabled={inviteSubmitting}>Cancel</Button>
            <Button
              onClick={submitInvite}
              disabled={!inviteEmail.trim() || !inviteLeagueId || !inviteRole || inviteSubmitting}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {inviteSubmitting && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove Confirmation ────────────────────────────────────────── */}
      <Dialog open={!!removeTarget} onOpenChange={v => { if (!v) setRemoveTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-700">Remove from League</DialogTitle></DialogHeader>
          <p className="text-sm text-[var(--ct-text-secondary)] py-2">
            Remove <span className="font-semibold">{displayName(removeTarget?.profile)}</span> from{" "}
            <span className="font-semibold">{removeTarget?.membership.league_name}</span>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)} disabled={removing}>Cancel</Button>
            <Button variant="destructive" onClick={confirmRemove} disabled={removing}>
              {removing && <RefreshCw className="w-4 h-4 animate-spin mr-2" />} Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Revoke Confirmation ────────────────────────────────────────── */}
      <Dialog open={!!revokeTarget} onOpenChange={v => { if (!v) setRevokeTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Revoke Invitation</DialogTitle></DialogHeader>
          <p className="text-sm text-[var(--ct-text-secondary)] py-2">
            Revoke the invitation sent to <span className="font-semibold">{revokeTarget?.email}</span>?
            The invite link will no longer work.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)} disabled={revoking}>Cancel</Button>
            <Button variant="destructive" onClick={confirmRevoke} disabled={revoking}>
              {revoking && <RefreshCw className="w-4 h-4 animate-spin mr-2" />} Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
