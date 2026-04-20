import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const TAGS = [
  { id: "offense",      label: "Offense" },
  { id: "defense",      label: "Defense" },
  { id: "slob",         label: "SLOB" },
  { id: "blob",         label: "BLOB" },
  { id: "press_break",  label: "Press Break" },
  { id: "transition",   label: "Transition" },
];

export default function SavePlayDialog({
  open, onClose, leagueId, courtType, buildPlayData, supabaseUser, onSaved,
}) {
  const [name, setName] = useState("");
  const [tags, setTags] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggleTag = (id) =>
    setTags((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  const canSave = name.trim().length > 0 && leagueId && supabaseUser?.id && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const { error } = await supabase.from("whiteboard_plays").insert({
      league_id:  leagueId,
      created_by: supabaseUser.id,
      name:       name.trim(),
      tags,
      court_type: courtType,
      play_data:  buildPlayData(),
    });
    setSaving(false);
    if (error) {
      toast.error(`Save failed: ${error.message}`);
      return;
    }
    onSaved?.();
    setName("");
    setTags([]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save Play</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Play name</label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Horns Flare"
              className="mt-1"
              maxLength={80}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Tags</label>
            <div className="grid grid-cols-2 gap-2">
              {TAGS.map((t) => (
                <label key={t.id}
                       className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <Checkbox checked={tags.includes(t.id)} onCheckedChange={() => toggleTag(t.id)} />
                  <span className="text-sm">{t.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave}
                  className="bg-orange-500 hover:bg-orange-600 text-white">
            {saving ? "Saving…" : "Save Play"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
