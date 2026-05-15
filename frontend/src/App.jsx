import AppRouter from './router/AppRouter.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
// import Header from './components/common/Header/Header.jsx';
import HeaderLocataire from './components/common/Header/HeaderLocataire.jsx';

function App() {
  return (
    <AuthProvider>
      {/* <Header /> */}
      <HeaderLocataire />
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <AppRouter />
      </div>
    </AuthProvider>
  );
}

export default App;
