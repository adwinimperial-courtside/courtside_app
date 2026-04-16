import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Clock } from "lucide-react";

export default function PendingApproval() {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const checkStatus = async () => {
    if (!currentUser) return;
    setChecking(true);
    try {
      const { data } = await supabase
        .from("league_applications")
        .select("id, status")
        .eq("user_id", currentUser.id)
        .eq("status", "approved")
        .limit(1);

      if (data && data.length > 0) {
        navigate("/LeagueSelection", { replace: true });
      }
    } finally {
      setChecking(false);
    }
  };

  // Auto-check on mount
  useEffect(() => {
    checkStatus();
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/images/courtside-logo.png" alt="Courtside by AI" className="h-16 w-auto" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">

          {/* Clock icon */}
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Application Under Review
          </h1>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Your application has been submitted. Our admin team will review it shortly and grant you access once approved.
          </p>

          {/* What happens next */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4 text-left mb-6">
            <p className="text-sm font-semibold text-yellow-800 mb-2">What happens next?</p>
            <ul className="space-y-1.5">
              {[
                "Admin reviews your application",
                "You'll get full access once approved",
                "Refresh this page to check your status",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-yellow-700">
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-yellow-200 text-yellow-800 text-xs flex items-center justify-center shrink-0 font-medium">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={checkStatus}
            disabled={checking}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors mb-4"
          >
            {checking ? "Checking…" : "Refresh Status"}
          </button>

          {/* Sign out */}
          <p className="text-sm text-slate-500">
            <button
              type="button"
              onClick={signOut}
              className="text-slate-700 font-medium hover:underline"
            >
              Sign Out
            </button>
          </p>

        </div>
      </div>
    </div>
  );
}
