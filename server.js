const express = require("express");
const mariadb = require("mariadb");
const { parseArgs } = require("node:util");

const options = {
  "db-host": { type: "string", default: "127.0.0.1" },
  "db-port": { type: "string", default: "3306" },
  "db-user": { type: "string", default: "app" },
  "db-pass": { type: "string", default: "12345678" },
  "db-name": { type: "string", default: "notes_db" },
  port: { type: "string", default: "8000" },
};

const { values: config } = parseArgs({ options, strict: false });

const app = express();

app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pool = mariadb.createPool({
  host: config["db-host"],
  port: parseInt(config["db-port"]),
  user: config["db-user"],
  password: config["db-pass"],
  database: config["db-name"],
  connectionLimit: 5,
});

function sendResponse(req, res, data, htmlFormatter) {
  const accepts = req.accepts(["json", "html"]);
  if (accepts === "html") {
    res.type("html").send(htmlFormatter(data));
  } else {
    res.json(data);
  }
}

app.get("/", (req, res) => {
  res.type("html").send(`
        <h1>Notes Service API</h1>
        <ul>
            <li><a href="/notes">GET /notes</a> - Список нотаток</li>
            <li>POST /notes - Створити нотатку (використовуйте форму на сторінці списку)</li>
            <li>GET /notes/&lt;id&gt; - Переглянути конкретну нотатку</li>
        </ul>
    `);
});

app.get("/health/alive", (req, res) => {
  res.status(200).send("OK");
});

app.get("/health/ready", async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    res.status(200).send("OK");
  } catch (err) {
    res.status(500).send(`Database connection failed: ${err.message}`);
  }
});

if (process.env.LISTEN_PID && parseInt(process.env.LISTEN_FDS, 10) > 0) {
  app.listen({ fd: 3 }, () => {
    console.log("MyWebApp is running via systemd socket activation");
  });
} else {
  app.listen(config.port, "127.0.0.1", () => {
    console.log(
      `MyWebApp is running locally on http://127.0.0.1:${config.port}`,
    );
  });
}
