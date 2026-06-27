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
import RegistrarDoacao from './components/RegistrarDoacao';
import FormularioCestaBasica from './components/FormularioCestaBasica';
import ListaDoacoes from './components/ListaDoacoes';
import FormularioDoacao from './components/FormularioDoacao';
import GerenciarUsuarios from './components/GerenciarUsuarios';
import FormularioUsuario from './components/FormularioUsuario';
import PaginaInicial from './components/PaginaInicial';
import ServicosApoio from './components/ServicosApoio';
import FormularioServicoApoio from './components/FormularioServicoApoio';
import Configuracoes from './components/Configuracoes';

function App() {
  return (
    <AuthProvider>
      <InstallPromptProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Modulo />

                  <div className="container-conteudo">
                    <Routes>
                      <Route path="/" element={<PaginaInicial />} />
                      <Route path="/beneficiarios" element={<ListaBeneficiarios />} />
                      <Route path="/beneficiarios/cadastro" element={<FormularioBeneficiarios />} />
                      <Route path="/cestas-basicas" element={<CestasBasicas />} />
                      <Route path="/cestas-basicas/doacao" element={<RegistrarDoacao />} />
                      <Route path="/cestas-basicas/cadastro" element={<FormularioCestaBasica />} />
                      <Route path="/cestas-basicas/editar/:id" element={<FormularioCestaBasica />} />
                      <Route path="/beneficiarios/editar/:id" element={<FormularioBeneficiarios />} />
                      <Route path="/servicos-de-apoio" element={<ServicosApoio />} />
                      <Route path="/servicos-de-apoio/cadastro" element={<FormularioServicoApoio />} />
                      <Route path="/servicos-de-apoio/editar/:id" element={<FormularioServicoApoio />} />
                      <Route path="/doacoes" element={<ListaDoacoes />} />
                      <Route path="/doacoes/cadastro" element={<FormularioDoacao />} />
                      <Route path="/doacoes/editar/:id" element={<FormularioDoacao />} />
                      <Route path="/usuarios" element={<GerenciarUsuarios />} />
                      <Route path="/usuarios/cadastro" element={<FormularioUsuario />} />
                      <Route path="/usuarios/editar/:id" element={<FormularioUsuario />} />
                      <Route path="/configuracoes" element={<Configuracoes />} />
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
