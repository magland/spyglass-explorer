import { useEffect, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import AdminChatsPage from './pages/AdminChatsPage';
import ChatPage from './pages/ChatPage';

const AppContent = () => {
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const headerHeight = 40; // Fixed header height in pixels

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="app">
        {/* <header style={{ height: headerHeight, display: 'flex', alignItems: 'center', padding: '0 20px', backgroundColor: '#282c34', color: 'white', fontFamily: 'Comfortaa, sans-serif' }}>
          <h1><Link to="/spyglass-explorer/" style={{ textDecoration: 'none', color: 'inherit', marginRight: '20px' }}>Spyglass Explorer</Link></h1>
          <Link to="/spyglass-explorer/admin" style={{ textDecoration: 'none', color: 'inherit' }}>Admin</Link>
        </header> */}

        <Routes>
          <Route
            path="/spyglass-explorer/"
            element={
              <Navigate to="/spyglass-explorer/chat" />
            }
          />
          <Route
            path="/spyglass-explorer/chat"
            element={
              <ChatPage
                width={windowDimensions.width}
                height={windowDimensions.height - headerHeight}
              />
            }
          />
          <Route
            path="/spyglass-explorer/admin"
            element={
              <AdminChatsPage
                width={windowDimensions.width}
                height={windowDimensions.height - headerHeight}
              />
            }
          />
        </Routes>
      </div>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
