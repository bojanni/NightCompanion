import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Prompts from './pages/Prompts';
import Characters from './pages/Characters';
import Gallery from './pages/Gallery';
import Models from './pages/Models';
import Generator from './pages/Generator';
import Settings from './pages/Settings';
import StyleProfile from './pages/StyleProfile';
import BatchTesting from './pages/BatchTesting';
import CostDemo from './pages/CostDemo';
import VersioningGuide from './pages/VersioningGuide';

export default function App() {
  const { user, loading, signIn, signUp, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth onSignIn={signIn} onSignUp={signUp} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout onSignOut={signOut} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/generator" element={<Generator />} />
          <Route path="/prompts" element={<Prompts />} />
          <Route path="/characters" element={<Characters />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/models" element={<Models />} />
          <Route path="/batch-testing" element={<BatchTesting />} />
          <Route path="/style" element={<StyleProfile />} />
          <Route path="/cost-calculator" element={<CostDemo />} />
          <Route path="/versioning-guide" element={<VersioningGuide />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
