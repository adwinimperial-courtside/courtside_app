import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { setupIframeMessaging } from './lib/iframe-messaging';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import LoginPage from '@/components/auth/LoginPage';
import LandingPage from '@/pages/Landing';
import AcceptInvitePage from '@/pages/AcceptInvite';

import ApplyForLeaguePage from './pages/ApplyForLeague';
import LeagueUsersPage from './pages/LeagueUsers';
const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

setupIframeMessaging();

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();

  // Show loading spinner while checking session
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Show login page when not authenticated
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/Landing" element={<LandingPage />} />
        <Route path="/invite/:token" element={<AcceptInvitePage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  // Render the main app
  return (
    <LayoutWrapper currentPageName={mainPageKey}>
      <Routes>
        <Route path="/" element={<MainPage />} handle={{ pageName: mainPageKey }} />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route key={path} path={`/${path}`} element={<Page />} handle={{ pageName: path }} />
        ))}
        {/* These routes live inside the outer <LayoutWrapper> at the top of
            AuthenticatedApp, so we must NOT wrap them again — a nested Layout
            creates a second DevicePreviewProvider whose deviceMode state is
            detached from the FAB in the outer Layout, which breaks
            useIsNarrowLayout() on these pages. */}
        <Route path="/LeagueUsers" element={<LeagueUsersPage />} />
        <Route path="/ApplyForLeague" element={<ApplyForLeaguePage />} />
        <Route path="/invite/:token" element={<AcceptInvitePage />} />
        <Route path="/Login" element={<Navigate to="/Home" replace />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </LayoutWrapper>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App