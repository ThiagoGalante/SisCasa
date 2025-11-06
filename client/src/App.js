import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Modulo from './components/Modulo';
// Supondo que o seu formulário esteja neste caminho
import FormularioBeneficiarios from './components/FormularioBeneficiarios'; 
import ListaBeneficiarios from './components/ListaBeneficiarios';
import CestasBasicas from './components/CestasBasicas';

// Componentes de exemplo para as outras rotas
const Home = () => <h1>Página Inicial</h1>;

function App() {
  return (
    <Router>
      {/* O menu de módulos ficará visível em todas as páginas */}
      <Modulo />

      {/* As rotas definem qual componente renderizar com base na URL */}
      <div className="container-conteudo">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/beneficiarios" element={<ListaBeneficiarios />} /> {/* Rota para a lista */}
          <Route path="/beneficiarios/cadastro" element={<FormularioBeneficiarios />} />
          <Route path="/cestas-basicas" element={<CestasBasicas />} />
          {/* Rota para editar um beneficiário específico */}
          <Route path="/beneficiarios/editar/:id" element={<FormularioBeneficiarios />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
