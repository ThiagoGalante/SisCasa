import React from "react";
import "./Modulo.css";
import { Link } from "react-router-dom";

const Modulo = () => {
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
    },
    {
      id: 8,
      nome: "Sair",
      link: "/sair",
    }
  ];

  return (
    <nav className="menu-modulos">
      <ul>
        {modulos.map((modulo) => (
          <li key={modulo.id}>
            <Link to={modulo.link}>{modulo.nome}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Modulo;