const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./db");

//middleware
app.use(cors());
app.use(express.json());

//ROUTES//

// Adicionar uma reserva
app.post("/reservas", async (req, res) => {
    try {
        const { nome } = req.body;
        const adicionarReserva = await pool.query("INSERT INTO reservas (nome) VALUES($1) RETURNING *", [
            nome
        ]);

        res.json(adicionarReserva.rows[0]);
    } catch (err) {
        console.error(err.message);
    }
})

// Retornar todas as reservas
app.get("/reservas", async (req, res) => {
    try {
        const reservas = await pool.query("SELECT * FROM reservas");
        res.json(reservas.rows);
    } catch (err) {
        console.error(err.message);
    }
})

// Retornar uma reserva pelo id
app.get("/reservas/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const reserva = await pool.query("SELECT * FROM reservas WHERE reservas_id = $1",
            [id]
        );
        res.json(reserva.rows[0]);
    } catch (err) {
        console.error(err.message);
    }
})

// Atualizar uma reserva
app.put("/reservas/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { nome } = req.body;
        const atualizarReserva = await pool.query("UPDATE reservas SET nome = $1 WHERE reservas_id = $2",
            [nome, id]
        );
        res.json("Reserva atualizada");
    } catch (err) {
        console.error(err.message);
    }
})

// Deletar uma reserva
app.delete("/reservas/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const deletarReserva = await pool.query("DELETE FROM reservas WHERE reservas_id = $1",
            [id]
        );
        res.json("Reserva deletada");
    } catch (err) {
        console.error(err.message);
    }
})


app.listen(5000, () => {
    console.log("server na porta 5000");
})