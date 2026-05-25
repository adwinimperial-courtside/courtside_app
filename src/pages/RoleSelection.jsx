import { useNavigate } from "react-router-dom";
import { Trophy, Users, User, Eye } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const ROLES = [
  {
    key: "league_admin",
    label: "League Admin",
    description: "Create and manage a basketball league, teams, and statistics",
    icon: Trophy,
    iconColor: "text-orange-500",
    iconBg: "bg-orange-50",
    border: "hover:border-orange-300",
  },
  {
    key: "coach",
    label: "Coach",
    description: "Access coaching insights and team analytics",
    icon: Users,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50",
    border: "hover:border-blue-300",
  },
  {
    key: "player",
    label: "Player",
    description: "View your personal stats and follow your team",
    icon: User,
    iconColor: "text-green-500",
    iconBg: "bg-green-50",
    border: "hover:border-green-300",
  },
  {
    key: "viewer",
    label: "Viewer",
    description: "Follow league stats, standings, and game results",
    icon: Eye,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-50",
    border: "hover:border-purple-300",
  },
];

export default function RoleSelection() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--ct-bg-page)] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/images/courtside-logo.png" alt="Courtside by AI" className="h-16 w-auto" />
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--ct-text-primary)] mb-2">
            How will you use Courtside by AI?
          </h1>
          <p className="text-sm text-[var(--ct-text-secondary)]">
            Choose your role below. An admin will review and approve your request.
          </p>
        </div>

        {/* Role cards — 2x2 grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {ROLES.map(({ key, label, description, icon: Icon, iconColor, iconBg, border }) => (
            <button
              key={key}
              onClick={() => navigate(`/LeagueApplication?role=${key}`)}
              className={`flex flex-col items-start gap-3 bg-[var(--ct-bg-card)] rounded-2xl border-2 border-[var(--ct-border)] ${border} p-5 text-left transition-all duration-150 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--ct-border)]`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
              <div>
                <p className="font-semibold text-[var(--ct-text-primary)] text-sm mb-1">{label}</p>
                <p className="text-xs text-[var(--ct-text-secondary)] leading-relaxed">{description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Sign out */}
        <p className="text-center text-sm text-[var(--ct-text-secondary)]">
          Wrong account?{" "}
          <button
            type="button"
            onClick={signOut}
            className="text-[var(--ct-text-primary)] font-medium hover:underline"
          >
            Sign out
          </button>
        </p>

      </div>
    </div>
  );
}
