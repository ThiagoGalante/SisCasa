const Pool = require("pg").Pool;

const pool = new Pool({
    user: "postgres",
    password: "010187",
    host: "localhost",
    port: 5432,
    database: "siscasa"
})

module.exports = pool;