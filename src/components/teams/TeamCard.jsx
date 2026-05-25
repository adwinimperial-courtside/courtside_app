import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function TeamCard({ team, league, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
    >
      <Card className="group hover:shadow-xl transition-all duration-300 border-[var(--ct-border)] bg-[var(--ct-bg-card)] overflow-hidden cursor-pointer">
        {/* Team colour bar */}
        <div className="h-2" style={{ backgroundColor: team.color || "#f97316" }} />

        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl font-bold text-[var(--ct-text-primary)] mb-2 group-hover:text-blue-600 transition-colors">
                {team.name}
              </CardTitle>
              {team.short_name && (
                <Badge variant="secondary" className="bg-[var(--ct-bg-elevated)] text-[var(--ct-text-secondary)] mr-2">
                  {team.short_name}
                </Badge>
              )}
              {league && (
                <Badge variant="secondary" className="bg-[var(--ct-bg-elevated)] text-[var(--ct-text-primary)]">
                  {league.name}
                </Badge>
              )}
            </div>

            {/* Team logo or fallback icon */}
            <div className="group-hover:scale-110 transition-transform ml-3 shrink-0">
              {team.logo_url ? (
                <img
                  src={team.logo_url}
                  alt={team.name}
                  className="w-16 h-16 rounded-xl object-cover border-2"
                  style={{ borderColor: team.color || "#f97316" }}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${team.color || "#f97316"}20` }}
                >
                  <Users
                    className="w-8 h-8"
                    style={{ color: team.color || "#f97316" }}
                  />
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center gap-2 text-sm text-[var(--ct-text-secondary)]">
            <Users className="w-4 h-4" />
            <span>View roster</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
