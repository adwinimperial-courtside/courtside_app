import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import LoginPage from "@/components/auth/LoginPage";

export default function Login() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoadingAuth) return;
    if (isAuthenticated) {
      navigate("/LeagueSelection", { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  return <LoginPage />;
}
