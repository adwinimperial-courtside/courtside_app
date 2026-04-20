import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowUpDown } from "lucide-react";

export default function CoachesView() {
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

  const coaches = useMemo(() => users.filter(u => u.user_type === 'coach'), [users]);

  const leagueIdsByUser = useMemo(() => {
    const map = new Map();
    memberships.forEach(m => {
      if (!m.is_active) return;
      if (!map.has(m.user_id)) map.set(m.user_id, []);
      map.get(m.user_id).push(m.league_id);
    });
    return map;
  }, [memberships]);

  const sortedCoaches = useMemo(() => {
    const sorted = [...coaches];
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
  }, [coaches, sortConfig]);

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
    <Card className="border-slate-200 shadow-lg">
      <CardHeader className="border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Coaches</CardTitle>
            <p className="text-sm text-slate-600 mt-2">Users with Coach access</p>
          </div>
          <Badge className="bg-green-100 text-green-800 text-lg px-3 py-1">
            {coaches.length} Total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>
                  <button onClick={() => handleSort('full_name')} className="flex items-center gap-2 font-semibold hover:text-slate-900">
                    Name <ArrowUpDown className="w-4 h-4" />
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => handleSort('created_at')} className="flex items-center gap-2 font-semibold hover:text-slate-900">
                    Created On <ArrowUpDown className="w-4 h-4" />
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => handleSort('email')} className="flex items-center gap-2 font-semibold hover:text-slate-900">
                    Email <ArrowUpDown className="w-4 h-4" />
                  </button>
                </TableHead>
                <TableHead>Assigned Leagues</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCoaches.length > 0 ? (
                sortedCoaches.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell className="text-slate-600">{user.created_at ? new Date(user.created_at).toLocaleString() : '—'}</TableCell>
                    <TableCell className="text-slate-600">{user.email}</TableCell>
                    <TableCell className="text-slate-600">{getLeagueNames(user.id)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">No coaches found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
