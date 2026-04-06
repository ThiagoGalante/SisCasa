import React from "react";
import "./Modulo.css";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Modulo = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const modulos = [
    {
      id: 1,
      nome: "Início",
      link: "/",
    },
    {
      id: 2,
      nome: "Hospedaria",
      link: "/hospedaria",
    },
    {
      id: 3,
      nome: "Serviços de Apoio",
      link: "/servicos-de-apoio",
    },
    {
      id: 4,
      nome: "Cestas Basicas",
      link: "/cestas-basicas",

    },
    {
      id: 5,
      nome: "Doações",
      link: "/doacoes",
    },
    {
      id: 6,
      nome: "Beneficiários",
      link: "/beneficiarios",
    },
    {
      id: 7,
      nome: "Relatórios",
      link: "/relatorios",
    }
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="menu-modulos">
      <ul>
        {modulos.map((modulo) => (
          <li key={modulo.id}>
            <Link to={modulo.link}>{modulo.nome}</Link>
          </li>
        ))}
        <li>
          <button onClick={handleLogout} className="logout-button">
            Sair ({user?.email})
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Modulo;