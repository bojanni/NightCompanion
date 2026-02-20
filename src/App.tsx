import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

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
import Tools from './pages/Tools';
import Timeline from './pages/Timeline';

return (
  <BrowserRouter>
    <Routes>
      <Route element={<Layout />}>
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
        <Route path="/tools" element={<Tools />} />
        <Route path="/timeline" element={<Timeline />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
}
