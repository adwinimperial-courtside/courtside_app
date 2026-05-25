import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowUpDown } from "lucide-react";

export default function ViewersView() {
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  const { data: users = [] } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ["leagues"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leagues").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ["user_league_memberships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_league_memberships")
        .select("user_id, league_id, is_active");
      if (error) throw error;
      return data || [];
    },
  });

  const viewers = useMemo(() => users.filter(u => u.user_type === 'viewer'), [users]);

  const leagueIdsByUser = useMemo(() => {
    const map = new Map();
    memberships.forEach(m => {
      if (!m.is_active) return;
      if (!map.has(m.user_id)) map.set(m.user_id, []);
      map.get(m.user_id).push(m.league_id);
    });
    return map;
  }, [memberships]);

  const sortedViewers = useMemo(() => {
    const sorted = [...viewers];
    sorted.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (sortConfig.key === 'created_at') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else {
        aVal = (aVal || '').toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [viewers, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getLeagueNames = (userId) => {
    const leagueIds = leagueIdsByUser.get(userId) || [];
    if (leagueIds.length === 0) return 'None';
    return leagueIds.map(id => {
      const league = leagues.find(l => l.id === id);
      return league ? league.name : 'Unknown';
    }).join(', ');
  };

  return (
    <Card className="border-[var(--ct-border)] ">
      <CardHeader className="border-b border-[var(--ct-border)] bg-[var(--ct-bg-card)]">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Viewers</CardTitle>
            <p className="text-sm text-[var(--ct-text-secondary)] mt-2">Users with Viewer access</p>
          </div>
          <Badge className="bg-blue-100 text-blue-800 text-lg px-3 py-1">
            {viewers.length} Total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="rounded-lg border border-[var(--ct-border)] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[var(--ct-bg-page)]">
                <TableHead>
                  <button onClick={() => handleSort('full_name')} className="flex items-center gap-2 font-semibold hover:text-[var(--ct-text-primary)]">
                    Name <ArrowUpDown className="w-4 h-4" />
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => handleSort('created_at')} className="flex items-center gap-2 font-semibold hover:text-[var(--ct-text-primary)]">
                    Created On <ArrowUpDown className="w-4 h-4" />
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => handleSort('email')} className="flex items-center gap-2 font-semibold hover:text-[var(--ct-text-primary)]">
                    Email <ArrowUpDown className="w-4 h-4" />
                  </button>
                </TableHead>
                <TableHead>Assigned Leagues</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedViewers.length > 0 ? (
                sortedViewers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell className="text-[var(--ct-text-secondary)]">{user.created_at ? new Date(user.created_at).toLocaleString() : '—'}</TableCell>
                    <TableCell className="text-[var(--ct-text-secondary)]">{user.email}</TableCell>
                    <TableCell className="text-[var(--ct-text-secondary)]">{getLeagueNames(user.id)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-[var(--ct-text-secondary)]">No viewers found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
