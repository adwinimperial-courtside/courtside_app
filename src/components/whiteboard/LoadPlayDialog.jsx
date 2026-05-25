import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function LoadPlayDialog({ open, onClose, leagueId, supabaseUser, onLoad }) {
  const [plays, setPlays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchPlays = async () => {
    if (!leagueId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("whiteboard_plays")
      .select("*")
      .eq("league_id", leagueId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error(`Load failed: ${error.message}`);
      setPlays([]);
      return;
    }
    setPlays(data || []);
  };

  useEffect(() => { if (open) fetchPlays(); /* eslint-disable-next-line */ }, [open, leagueId]);

  const deletePlay = async (id) => {
    const { error } = await supabase.from("whiteboard_plays").delete().eq("id", id);
    if (error) {
      toast.error(`Delete failed: ${error.message}`);
      return;
    }
    setPlays((p) => p.filter((x) => x.id !== id));
    setConfirmDelete(null);
    toast.success("Play deleted");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Load Play</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[var(--ct-text-muted)]">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading plays…
            </div>
          ) : plays.length === 0 ? (
            <div className="text-center py-12 text-[var(--ct-text-secondary)]">
              <p className="font-medium">No saved plays yet</p>
              <p className="text-sm mt-1">Save a play to see it here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--ct-border)]">
              {plays.map((p) => {
                const canDelete = supabaseUser?.id === p.created_by;
                const isConfirming = confirmDelete === p.id;
                return (
                  <li key={p.id} className="py-3 flex items-start gap-3 hover:bg-[var(--ct-bg-elevated)] -mx-2 px-2 rounded">
                    <button
                      onClick={() => onLoad(p)}
                      className="flex-1 text-left"
                    >
                      <div className="font-semibold text-[var(--ct-text-primary)]">{p.name}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {p.court_type === "full" ? "Full Court" : "Half Court"}
                        </Badge>
                        {(p.tags || []).map((t) => (
                          <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                      <div className="text-xs text-[var(--ct-text-muted)] mt-1">
                        {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                      </div>
                    </button>
                    {canDelete && (
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => isConfirming ? deletePlay(p.id) : setConfirmDelete(p.id)}
                        className={isConfirming ? "text-red-600" : "text-[var(--ct-text-muted)] hover:text-red-600"}
                      >
                        <Trash2 className="w-4 h-4" />
                        {isConfirming && <span className="ml-1 text-xs">Confirm</span>}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
