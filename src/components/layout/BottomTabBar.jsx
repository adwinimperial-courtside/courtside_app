import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Calendar, Trophy, BarChart3, MoreHorizontal } from "lucide-react";
import { createPageUrl } from "@/utils";

const TABS = [
  { title: "Home",      icon: Home,      url: createPageUrl("Home") },
  { title: "Schedule",  icon: Calendar,  url: createPageUrl("Schedule") },
  { title: "Standings", icon: Trophy,    url: createPageUrl("Standings") },
  { title: "Stats",     icon: BarChart3, url: createPageUrl("Statistics") },
];

export default function BottomTabBar({ onMorePress }) {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      style={{
        background: "var(--ct-bg-card)",
        borderTop: "1px solid var(--ct-border)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex h-16">
        {TABS.map(({ title, icon: Icon, url }) => {
          const isActive = location.pathname === url;
          return (
            <Link
              key={title}
              to={url}
              className="flex-1 flex flex-col items-center justify-center gap-0.5"
              style={{
                minHeight: 44,
                color: isActive ? "var(--ct-accent)" : "var(--ct-text-muted)",
                textDecoration: "none",
              }}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium leading-none">{title}</span>
            </Link>
          );
        })}

        <button
          onClick={onMorePress}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 bg-transparent border-0 cursor-pointer p-0"
          style={{ minHeight: 44, color: "var(--ct-text-muted)" }}
        >
          <MoreHorizontal className="w-5 h-5" strokeWidth={2} />
          <span className="text-[10px] font-medium leading-none">More</span>
        </button>
      </div>
    </nav>
  );
}
