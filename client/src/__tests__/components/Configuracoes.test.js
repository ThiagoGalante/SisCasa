import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Configuracoes from "../../components/Configuracoes";
import { authenticatedFetch } from "../../utils/api";

// US14 — testes do módulo de Configurações (frontend).
jest.mock("../../utils/api", () => ({
  authenticatedFetch: jest.fn(),
}));

describe("Configuracoes (US14)", () => {
  beforeEach(() => {
    authenticatedFetch.mockReset();
    authenticatedFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, nome: "Hospital Central" }],
    });
  });

  test("CT-CFG-009: renderiza as abas das tabelas de apoio", async () => {
    render(<Configuracoes />);
    expect(screen.getByText("Hospitais")).toBeInTheDocument();
    expect(screen.getByText("UF")).toBeInTheDocument();
    expect(screen.getByText("Religião")).toBeInTheDocument();
    expect(screen.getByText("Raça/Cor")).toBeInTheDocument();
  });

  test("CT-CFG-010: carrega e lista os registros do recurso ativo", async () => {
    render(<Configuracoes />);
    await waitFor(() => {
      expect(authenticatedFetch).toHaveBeenCalledWith("/api/config/hospitais");
    });
    await waitFor(() => {
      expect(screen.getByText("Hospital Central")).toBeInTheDocument();
    });
  });
});
