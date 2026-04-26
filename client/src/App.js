import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { InstallPromptProvider } from './contexts/InstallPromptContext';
import ProtectedRoute from './components/ProtectedRoute';

import Modulo from './components/Modulo';
import Login from './components/Login';
import FormularioBeneficiarios from './components/FormularioBeneficiarios';
import ListaBeneficiarios from './components/ListaBeneficiarios';
import CestasBasicas from './components/CestasBasicas';

// Componentes de exemplo para as outras rotas
const Home = () => <h1>Página Inicial</h1>;

function App() {
  return (
    <AuthProvider>
      <InstallPromptProvider>
        <Router>
          <Routes>
            {/* Rota pública de login */}
            <Route path="/login" element={<Login />} />

            {/* Rotas protegidas */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  {/* O menu de módulos ficará visível em todas as páginas protegidas */}
                  <Modulo />

                  {/* As rotas definem qual componente renderizar com base na URL */}
                  <div className="container-conteudo">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/beneficiarios" element={<ListaBeneficiarios />} />
                      <Route path="/beneficiarios/cadastro" element={<FormularioBeneficiarios />} />
                      <Route path="/cestas-basicas" element={<CestasBasicas />} />
                      <Route path="/beneficiarios/editar/:id" element={<FormularioBeneficiarios />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </InstallPromptProvider>
    </AuthProvider>
  );
}

export default App;
