import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Users, Plus, Check, X, Trash2, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabaseClient";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];

const blankPlayer = () => ({
  first_name: "",
  last_name: "",
  jersey_number: "",
  position: "PG",
  is_captain: false,
});

export default function TeamDetailView({ team, onBack, canManage }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [newPlayer, setNewPlayer] = useState(blankPlayer());
  const [playerToDelete, setPlayerToDelete] = useState(null);

  // Fetch players for this team
  const { data: players = [], isLoading } = useQuery({
    queryKey: ["players", team.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, first_name, last_name, jersey_number, position, is_captain, is_active")
        .eq("team_id", team.id)
        .eq("is_active", true)
        .order("last_name");
      if (error) throw error;
      return data;
    },
  });

  // Add player
  const addPlayerMutation = useMutation({
    mutationFn: async (playerData) => {
      if (playerData.is_captain) {
        await supabase
          .from("players")
          .update({ is_captain: false })
          .eq("team_id", team.id);
      }
      const { error } = await supabase.from("players").insert({
        league_id: team.league_id,
        team_id: team.id,
        first_name: playerData.first_name.trim(),
        last_name: playerData.last_name.trim(),
        jersey_number: playerData.jersey_number || null,
        position: playerData.position || null,
        is_captain: playerData.is_captain || false,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players", team.id] });
      setIsAddingPlayer(false);
      setNewPlayer(blankPlayer());
    },
  });

  // Update player
  const updatePlayerMutation = useMutation({
    mutationFn: async ({ playerId, values }) => {
      if (values.is_captain) {
        await supabase
          .from("players")
          .update({ is_captain: false })
          .eq("team_id", team.id);
      }
      const { error } = await supabase
        .from("players")
        .update({
          first_name: values.first_name.trim(),
          last_name: values.last_name.trim(),
          jersey_number: values.jersey_number || null,
          position: values.position || null,
          is_captain: values.is_captain || false,
        })
        .eq("id", playerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players", team.id] });
      setEditingPlayerId(null);
      setEditValues({});
    },
  });

  // Soft-delete player
  const deletePlayerMutation = useMutation({
    mutationFn: async (playerId) => {
      const { error } = await supabase
        .from("players")
        .update({ is_active: false })
        .eq("id", playerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players", team.id] });
      setPlayerToDelete(null);
    },
  });

  const startEdit = (player) => {
    setEditingPlayerId(player.id);
    setEditValues({
      first_name: player.first_name,
      last_name: player.last_name,
      jersey_number: player.jersey_number || "",
      position: player.position || "PG",
      is_captain: player.is_captain || false,
    });
    setIsAddingPlayer(false);
  };

  const cancelEdit = () => {
    setEditingPlayerId(null);
    setEditValues({});
  };

  const captain = players.find((p) => p.is_captain);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--ct-bg-page)] via-[var(--ct-bg-card)] to-[var(--ct-bg-page)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

        {/* Back button */}
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6 hover:bg-[var(--ct-bg-elevated)]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("teams.backToTeams", "Back to Teams")}
        </Button>

        {/* Team header */}
        <div className="flex items-start gap-4 mb-8">
          {team.logo_url ? (
            <img
              src={team.logo_url}
              alt={team.name}
              className="w-16 h-16 rounded-xl object-cover border-2 shrink-0"
              style={{ borderColor: team.color || "#f97316" }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${team.color || "#f97316"}20` }}
            >
              <Users className="w-8 h-8" style={{ color: team.color || "#f97316" }} />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-[var(--ct-text-primary)]">{team.name}</h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-[var(--ct-text-secondary)]">
              {team.head_coach && (
                <span>
                  <span className="text-[var(--ct-text-muted)]">Head Coach:</span>{" "}
                  <span className="font-medium text-[var(--ct-text-primary)]">{team.head_coach}</span>
                </span>
              )}
              {team.manager && (
                <span>
                  <span className="text-[var(--ct-text-muted)]">Manager:</span>{" "}
                  <span className="font-medium text-[var(--ct-text-primary)]">{team.manager}</span>
                </span>
              )}
              {captain && (
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span className="font-medium text-[var(--ct-text-primary)]">
                    {captain.first_name} {captain.last_name}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Players section */}
        <div className="bg-[var(--ct-bg-card)] rounded-xl border border-[var(--ct-border)] overflow-hidden">
          {/* Section header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ct-border)]">
            <div>
              <h2 className="font-semibold text-[var(--ct-text-primary)]">
                {t("players.roster", "Roster")}
              </h2>
              <p className="text-sm text-[var(--ct-text-secondary)] mt-0.5">
                {players.length} {t("players.players", "players")}
              </p>
            </div>
            {canManage && !isAddingPlayer && (
              <Button
                size="sm"
                onClick={() => {
                  setIsAddingPlayer(true);
                  setEditingPlayerId(null);
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t("players.addPlayer", "Add Player")}
              </Button>
            )}
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 px-6 py-2 bg-[var(--ct-bg-page)] text-xs font-medium text-[var(--ct-text-secondary)] uppercase tracking-wide border-b border-[var(--ct-border)]">
            <div className="col-span-1">#</div>
            <div className="col-span-3">{t("players.firstName", "First Name")}</div>
            <div className="col-span-3">{t("players.lastName", "Last Name")}</div>
            <div className="col-span-2">{t("players.position", "Pos")}</div>
            <div className="col-span-2">{t("players.captain", "Captain")}</div>
            <div className="col-span-1" />
          </div>

          {isLoading ? (
            <div className="px-6 py-8 text-center text-[var(--ct-text-muted)]">Loading...</div>
          ) : (
            <>
              {players.length === 0 && !isAddingPlayer && (
                <div className="px-6 py-8 text-center text-[var(--ct-text-muted)]">
                  {t("players.noPlayers", "No players yet. Add your first player above.")}
                </div>
              )}

              {players.map((player) => (
                <div
                  key={player.id}
                  className="grid grid-cols-12 gap-2 px-6 py-2.5 items-center border-b border-[var(--ct-border)] last:border-0 hover:bg-[var(--ct-bg-elevated)] transition-colors group"
                >
                  {editingPlayerId === player.id ? (
                    <>
                      <div className="col-span-1">
                        <Input
                          className="h-7 text-sm px-2"
                          value={editValues.jersey_number}
                          onChange={(e) =>
                            setEditValues({ ...editValues, jersey_number: e.target.value })
                          }
                          placeholder="#"
                          maxLength={3}
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          className="h-7 text-sm px-2"
                          value={editValues.first_name}
                          onChange={(e) =>
                            setEditValues({ ...editValues, first_name: e.target.value })
                          }
                          autoFocus
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          className="h-7 text-sm px-2"
                          value={editValues.last_name}
                          onChange={(e) =>
                            setEditValues({ ...editValues, last_name: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <Select
                          value={editValues.position}
                          onValueChange={(v) =>
                            setEditValues({ ...editValues, position: v })
                          }
                        >
                          <SelectTrigger className="h-7 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {POSITIONS.map((p) => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 flex items-center">
                        <button
                          type="button"
                          onClick={() =>
                            setEditValues({ ...editValues, is_captain: !editValues.is_captain })
                          }
                          className="flex items-center gap-1.5"
                        >
                          <Star
                            className={`w-4 h-4 transition-colors ${
                              editValues.is_captain
                                ? "text-amber-500 fill-amber-500"
                                : "text-[var(--ct-text-muted)]"
                            }`}
                          />
                          <span className="text-xs text-[var(--ct-text-secondary)]">
                            {editValues.is_captain ? "Captain" : "Set"}
                          </span>
                        </button>
                      </div>
                      <div className="col-span-1 flex gap-1">
                        <button
                          className="text-green-600 hover:text-green-700"
                          onClick={() =>
                            updatePlayerMutation.mutate({ playerId: player.id, values: editValues })
                          }
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          className="text-[var(--ct-text-muted)] hover:text-[var(--ct-text-secondary)]"
                          onClick={cancelEdit}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="col-span-1 text-sm font-mono text-[var(--ct-text-secondary)]">
                        {player.jersey_number || "—"}
                      </div>
                      <div className="col-span-3 text-sm text-[var(--ct-text-primary)]">
                        {player.first_name}
                      </div>
                      <div className="col-span-3 text-sm font-medium text-[var(--ct-text-primary)]">
                        {player.last_name}
                      </div>
                      <div className="col-span-2">
                        {player.position && (
                          <Badge variant="secondary" className="text-xs">
                            {player.position}
                          </Badge>
                        )}
                      </div>
                      <div className="col-span-2">
                        {player.is_captain && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            Captain
                          </span>
                        )}
                      </div>
                      <div className="col-span-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canManage && (
                          <>
                            <button
                              className="text-[var(--ct-text-muted)] hover:text-blue-600 transition-colors"
                              onClick={() => startEdit(player)}
                            >
                              ✏️
                            </button>
                            <button
                              className="text-[var(--ct-text-muted)] hover:text-red-600 transition-colors"
                              onClick={() => setPlayerToDelete(player)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}

              {/* New player input row */}
              {isAddingPlayer && (
                <div className="grid grid-cols-12 gap-2 px-6 py-2.5 items-center border-t border-blue-100 bg-blue-50">
                  <div className="col-span-1">
                    <Input
                      className="h-7 text-sm px-2"
                      value={newPlayer.jersey_number}
                      onChange={(e) =>
                        setNewPlayer({ ...newPlayer, jersey_number: e.target.value })
                      }
                      placeholder="#"
                      maxLength={3}
                      autoFocus
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      className="h-7 text-sm px-2"
                      value={newPlayer.first_name}
                      onChange={(e) =>
                        setNewPlayer({ ...newPlayer, first_name: e.target.value })
                      }
                      placeholder={t("players.firstName", "First Name")}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      className="h-7 text-sm px-2"
                      value={newPlayer.last_name}
                      onChange={(e) =>
                        setNewPlayer({ ...newPlayer, last_name: e.target.value })
                      }
                      placeholder={t("players.lastName", "Last Name")}
                    />
                  </div>
                  <div className="col-span-2">
                    <Select
                      value={newPlayer.position}
                      onValueChange={(v) =>
                        setNewPlayer({ ...newPlayer, position: v })
                      }
                    >
                      <SelectTrigger className="h-7 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {POSITIONS.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <button
                      type="button"
                      onClick={() =>
                        setNewPlayer({ ...newPlayer, is_captain: !newPlayer.is_captain })
                      }
                      className="flex items-center gap-1.5"
                    >
                      <Star
                        className={`w-4 h-4 transition-colors ${
                          newPlayer.is_captain
                            ? "text-amber-500 fill-amber-500"
                            : "text-[var(--ct-text-muted)]"
                        }`}
                      />
                      <span className="text-xs text-[var(--ct-text-secondary)]">
                        {newPlayer.is_captain ? "Captain" : "Set"}
                      </span>
                    </button>
                  </div>
                  <div className="col-span-1 flex gap-1">
                    <button
                      className="text-green-600 hover:text-green-700 disabled:opacity-40"
                      onClick={() => addPlayerMutation.mutate(newPlayer)}
                      disabled={!newPlayer.first_name || !newPlayer.last_name}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      className="text-[var(--ct-text-muted)] hover:text-[var(--ct-text-secondary)]"
                      onClick={() => {
                        setIsAddingPlayer(false);
                        setNewPlayer(blankPlayer());
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Delete confirmation */}
        <AlertDialog
          open={!!playerToDelete}
          onOpenChange={(open) => !open && setPlayerToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("players.deleteTitle", "Remove Player")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {`Remove ${playerToDelete?.first_name} ${playerToDelete?.last_name} from ${team.name}? This cannot be undone.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-3">
              <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletePlayerMutation.mutate(playerToDelete.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                {t("players.remove", "Remove")}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
}
