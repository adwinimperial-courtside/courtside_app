import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "react-i18next";

// ─── Date + Time picker ───────────────────────────────────────────────────────

function DateTimePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);

  // Parse existing value into Date + time parts
  const selectedDate = value ? new Date(value) : null;
  const selectedHour  = selectedDate ? String(selectedDate.getHours()).padStart(2, "0") : "12";
  const selectedMinute = selectedDate ? String(Math.round(selectedDate.getMinutes() / 5) * 5).padStart(2, "0") : "00";

  const buildDateTime = (date, hour, minute) => {
    if (!date) { onChange(""); return; }
    const d = new Date(date);
    d.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
    onChange(d.toISOString());
  };

  const handleDaySelect = (day) => {
    if (!day) { onChange(""); return; }
    buildDateTime(day, selectedHour, selectedMinute);
    // Don't close — let them pick time too
  };

  const handleHourChange = (h) => buildDateTime(selectedDate || new Date(), h, selectedMinute);
  const handleMinuteChange = (m) => buildDateTime(selectedDate || new Date(), selectedHour, m);

  const hours   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
          style={{
            background: "var(--ct-bg-card)",
            border: "1px solid var(--ct-border)",
            color: selectedDate ? "var(--ct-text-primary)" : "var(--ct-text-muted)",
            minHeight: 40,
          }}
        >
          <CalendarIcon className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ct-text-muted)" }} />
          <span className="flex-1 text-left">
            {selectedDate
              ? format(selectedDate, "EEE d MMM yyyy · HH:mm")
              : "Select date & time"}
          </span>
          {selectedDate && (
            <X
              className="w-3.5 h-3.5 flex-shrink-0 hover:opacity-70"
              style={{ color: "var(--ct-text-muted)" }}
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
            />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto p-0"
        align="start"
        style={{ background: "var(--ct-bg-card)", border: "1px solid var(--ct-border)" }}
      >
        {/* Calendar */}
        <Calendar
          mode="single"
          selected={selectedDate || undefined}
          onSelect={handleDaySelect}
          initialFocus
          classNames={{
            // Each key REPLACES the default, so structural/sizing classes must be preserved
            caption_label: "text-[var(--ct-text-primary)] text-sm font-semibold",
            head_cell: "text-[var(--ct-text-muted)] rounded-md w-8 font-normal text-[0.8rem]",
            // day: keep inline-flex sizing from buttonVariants; just override colours
            day: "inline-flex items-center justify-center h-8 w-8 p-0 font-normal rounded-md text-[var(--ct-text-primary)] hover:bg-[var(--ct-bg-elevated)] aria-selected:opacity-100",
            day_selected: "bg-[var(--ct-accent)] text-white hover:bg-[var(--ct-accent)] focus:bg-[var(--ct-accent)]",
            day_today: "bg-[var(--ct-bg-elevated)] text-[var(--ct-text-primary)]",
            day_outside: "opacity-40 text-[var(--ct-text-muted)] aria-selected:opacity-30",
            // nav buttons: keep sizing, just theme the colours
            nav_button: "inline-flex items-center justify-center h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 rounded-md border border-[var(--ct-border)] text-[var(--ct-text-muted)]",
          }}
        />

        {/* Time picker row */}
        <div
          className="flex items-center gap-2 px-4 pb-4 pt-2 border-t"
          style={{ borderColor: "var(--ct-border)" }}
        >
          <span className="text-xs font-medium" style={{ color: "var(--ct-text-muted)" }}>Time</span>

          {/* Hour */}
          <select
            value={selectedHour}
            onChange={(e) => handleHourChange(e.target.value)}
            className="rounded-md px-2 py-1.5 text-sm font-medium focus:outline-none cursor-pointer"
            style={{
              background: "var(--ct-bg-elevated)",
              border: "1px solid var(--ct-border)",
              color: "var(--ct-text-primary)",
              minWidth: 56,
            }}
          >
            {hours.map(h => <option key={h} value={h}>{h}</option>)}
          </select>

          <span className="text-base font-bold" style={{ color: "var(--ct-text-muted)" }}>:</span>

          {/* Minute */}
          <select
            value={selectedMinute}
            onChange={(e) => handleMinuteChange(e.target.value)}
            className="rounded-md px-2 py-1.5 text-sm font-medium focus:outline-none cursor-pointer"
            style={{
              background: "var(--ct-bg-elevated)",
              border: "1px solid var(--ct-border)",
              color: "var(--ct-text-primary)",
              minWidth: 56,
            }}
          >
            {minutes.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <Button
            type="button"
            size="sm"
            className="ml-auto h-8 text-xs"
            style={{ background: "var(--ct-accent)", color: "#fff", border: "none" }}
            onClick={() => setOpen(false)}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const defaultForm = () => ({
  league_id: "",
  home_team_id: "",
  away_team_id: "",
  scheduled_at: "",
  venue: "",
  game_stage: "regular",
  exclude_from_awards: false,
  game_mode: "timed",
  period_type: "quarters",
  period_minutes: 10,
  overtime_minutes: 5,
});

export default function CreateGameDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  leagues = [],
  teams = [],
  defaultLeagueId,
}) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ ...defaultForm(), league_id: defaultLeagueId || "" });

  React.useEffect(() => {
    if (defaultLeagueId) {
      setFormData((prev) => ({ ...prev, league_id: defaultLeagueId }));
    }
  }, [defaultLeagueId]);

  const handleStageChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      game_stage: value,
      exclude_from_awards: value === "championship" ? true : prev.exclude_from_awards,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (payload.game_mode === "timed") {
      payload.period_count = payload.period_type === "quarters" ? 4 : 2;
    } else {
      payload.period_type = null;
      payload.period_count = null;
      payload.period_minutes = null;
      payload.overtime_minutes = null;
    }
    // Convert local datetime to UTC ISO string
    if (payload.scheduled_at) {
      payload.scheduled_at = new Date(payload.scheduled_at).toISOString();
    }
    onSubmit(payload);
    setFormData({ ...defaultForm(), league_id: defaultLeagueId || "" });
  };

  const leagueTeams = formData.league_id
    ? teams.filter((t) => t.league_id === formData.league_id)
    : teams;

  const isTimed = formData.game_mode === "timed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {t("schedule.scheduleGame", "Schedule New Game")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* League — only shown when user has multiple leagues */}
          {leagues.length > 1 && (
            <div>
              <Label>{t("schedule.league", "League")}</Label>
              <Select
                value={formData.league_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, league_id: value, home_team_id: "", away_team_id: "" })
                }
                required
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={t("schedule.selectLeague", "Select a league")} />
                </SelectTrigger>
                <SelectContent>
                  {leagues.map((league) => (
                    <SelectItem key={league.id} value={league.id}>
                      {league.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Home team */}
          <div>
            <Label>{t("schedule.homeTeam", "Home Team")}</Label>
            <Select
              value={formData.home_team_id}
              onValueChange={(value) => setFormData({ ...formData, home_team_id: value })}
              required
              disabled={leagueTeams.length === 0}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder={t("schedule.selectHomeTeam", "Select home team")} />
              </SelectTrigger>
              <SelectContent>
                {leagueTeams
                  .filter((t) => t.id !== formData.away_team_id)
                  .map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Away team */}
          <div>
            <Label>{t("schedule.awayTeam", "Away Team")}</Label>
            <Select
              value={formData.away_team_id}
              onValueChange={(value) => setFormData({ ...formData, away_team_id: value })}
              required
              disabled={leagueTeams.length === 0}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder={t("schedule.selectAwayTeam", "Select away team")} />
              </SelectTrigger>
              <SelectContent>
                {leagueTeams
                  .filter((t) => t.id !== formData.home_team_id)
                  .map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date & time */}
          <div>
            <Label>{t("schedule.dateTime", "Date & Time (Optional)")}</Label>
            <div className="mt-1.5">
              <DateTimePicker
                value={formData.scheduled_at}
                onChange={(val) => setFormData({ ...formData, scheduled_at: val })}
              />
            </div>
          </div>

          {/* Venue */}
          <div>
            <Label htmlFor="venue">{t("schedule.venue", "Venue (Optional)")}</Label>
            <Input
              id="venue"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              placeholder="e.g., Helsinki Ice Hall"
              className="mt-1.5"
            />
          </div>

          {/* Game stage */}
          <div className="border-t border-[var(--ct-border)] pt-4 space-y-4">
            <p className="text-sm font-semibold text-[var(--ct-text-primary)] uppercase tracking-wide">
              {t("schedule.gameStage", "Game Stage")}
            </p>
            <div>
              <Label>{t("schedule.stage", "Stage")}</Label>
              <Select value={formData.game_stage} onValueChange={handleStageChange}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">{t("schedule.regular", "Regular Season")}</SelectItem>
                  <SelectItem value="quarterfinal">{t("schedule.quarterfinal", "Quarterfinal")}</SelectItem>
                  <SelectItem value="semifinal">{t("schedule.semifinal", "Semifinal")}</SelectItem>
                  <SelectItem value="championship">{t("schedule.championship", "Championship")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Checkbox
                id="exclude_from_awards"
                checked={formData.exclude_from_awards}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, exclude_from_awards: !!checked }))
                }
                className="mt-0.5"
              />
              <div>
                <label
                  htmlFor="exclude_from_awards"
                  className="text-sm font-semibold text-amber-900 cursor-pointer"
                >
                  {t("schedule.excludeFromAwards", "Exclude this game from player awards")}
                </label>
                <p className="text-xs text-amber-700 mt-0.5">
                  {t("schedule.excludeFromAwardsDescription", "Stats will still appear in box scores and player profiles, but won't count toward season awards.")}
                </p>
              </div>
            </div>
          </div>

          {/* Game mode */}
          <div className="border-t border-[var(--ct-border)] pt-4 space-y-4">
            <p className="text-sm font-semibold text-[var(--ct-text-primary)] uppercase tracking-wide">
              {t("schedule.gameMode", "Game Mode")}
            </p>

            <div>
              <Label>{t("schedule.mode", "Mode")}</Label>
              <Select
                value={formData.game_mode}
                onValueChange={(value) => setFormData({ ...formData, game_mode: value })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="timed">{t("schedule.timed", "Timed Game")}</SelectItem>
                  <SelectItem value="untimed">{t("schedule.untimed", "Untimed Game")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isTimed && (
              <>
                <div>
                  <Label>{t("schedule.periodFormat", "Period Format")}</Label>
                  <Select
                    value={formData.period_type}
                    onValueChange={(value) => setFormData({ ...formData, period_type: value })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quarters">{t("schedule.quarters", "4 Quarters")}</SelectItem>
                      <SelectItem value="halves">{t("schedule.halves", "2 Halves")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="period_minutes">
                      {t("schedule.minutesPerPeriod", "Minutes per Period")}
                    </Label>
                    <Input
                      id="period_minutes"
                      type="number"
                      min={1}
                      max={30}
                      value={formData.period_minutes}
                      onChange={(e) =>
                        setFormData({ ...formData, period_minutes: Number(e.target.value) })
                      }
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="overtime_minutes">
                      {t("schedule.overtimeMinutes", "Overtime Minutes")}{" "}
                      <span className="text-[var(--ct-text-muted)] font-normal text-xs">(0 = none)</span>
                    </Label>
                    <Input
                      id="overtime_minutes"
                      type="number"
                      min={0}
                      max={15}
                      value={formData.overtime_minutes}
                      onChange={(e) =>
                        setFormData({ ...formData, overtime_minutes: Number(e.target.value) })
                      }
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.home_team_id || !formData.away_team_id}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              {isLoading
                ? t("schedule.scheduling", "Scheduling...")
                : t("schedule.scheduleGame", "Schedule Game")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
