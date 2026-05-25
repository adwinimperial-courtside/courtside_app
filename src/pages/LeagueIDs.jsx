import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Copy, Check } from "lucide-react";

export default function LeagueIDsPage() {
  const [copiedId, setCopiedId] = useState(null);

  const { data: leagues = [], isLoading } = useQuery({
    queryKey: ['leagues'],
    queryFn: async () => {
      const { data, error } = await supabase.from('leagues').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--ct-bg-page)] to-[var(--ct-bg-elevated)] p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>League IDs Reference</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center text-[var(--ct-text-secondary)]">Loading leagues...</div>
            ) : leagues.length === 0 ? (
              <div className="text-center text-[var(--ct-text-secondary)]">No leagues found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>League Name</TableHead>
                      <TableHead>Season</TableHead>
                      <TableHead>League ID</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leagues.map((league) => (
                      <TableRow key={league.id}>
                        <TableCell className="font-medium">{league.name}</TableCell>
                        <TableCell>{league.season}</TableCell>
                        <TableCell className="font-mono text-sm bg-[var(--ct-bg-page)] px-3 py-2 rounded">{league.id}</TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleCopyId(league.id)}
                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {copiedId === league.id ? (
                              <>
                                <Check className="w-4 h-4" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                Copy
                              </>
                            )}
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
