import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import Recorder from './components/Recorder';
import Player from './components/Player';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/library" element={<Dashboard />} />
          <Route path="/record" element={<Recorder />} />
          <Route path="/share/:id" element={<Player />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
