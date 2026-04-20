# Audit Trail Diagnosis — LeagueAwardSettings

## handleSave function (lines 365–409)

```js
const handleSave = async () => {
  if (hasErrors || !selectedLeagueId) return;
  setSaving(true);
  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("league_award_settings")
      .update({ ...settings, updated_by: currentUser.id, updated_at: now })
      .eq("league_id", selectedLeagueId);

    if (error) throw error;

    const awardTypeFor = (key) => {
      if (key.startsWith("mvp_")) return "mvp";
      if (key.startsWith("dpoy_")) return "dpoy";
      if (key.startsWith("pog_")) return "pog";
      if (key.startsWith("mythical_")) return "mythical_five";
      return "other";
    };

    const auditRows = Object.keys(settings)
      .filter(k => !["id", "league_id", "created_at", "updated_at", "updated_by"].includes(k))
      .filter(k => String(settings[k]) !== String(savedSettings[k]))
      .map(k => ({
        league_id: selectedLeagueId,
        changed_by: currentUser.id,
        changed_at: now,
        award_type: awardTypeFor(k),
        field_name: k,
        old_value: String(savedSettings[k]),
        new_value: String(settings[k]),
      }));

    if (auditRows.length > 0) {
      await supabase.from("league_award_settings_audit").insert(auditRows); // ← no error check!
    }

    setSavedSettings({ ...settings });
    showMsg("success", "Settings saved. Rankings are being recalculated.");
  } catch (err) {
    showMsg("error", err.message || "Save failed. Please try again.");
  } finally {
    setSaving(false);
  }
};
```

## Root Causes

### Bug 1: Missing INSERT RLS policy for league_admin
`league_award_settings_audit` RLS policies in migration 000018:
- `FOR ALL` → app_admin only (covers INSERT for app_admin)
- `FOR SELECT` → league_admin (does NOT cover INSERT)

League_admin users' audit inserts are silently rejected by RLS.

### Bug 2: Audit insert error is swallowed
The insert on line 400 has no error destructuring or throw.
Even if the insert fails, `showMsg("success", ...)` still fires — so the user
sees "Settings saved" even though the audit row was never written.

## Fix Plan
1. Create migration 000019 — INSERT policy for league_admin on audit table
2. Fix handleSave — destructure error from audit insert and throw it
