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

app.get("/notes", async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query("SELECT id, title FROM notes");

    sendResponse(
      req,
      res,
      rows,
      (data) => `
            <h1>Список нотаток</h1>
            <table border="1">
                <tr><th>ID</th><th>Заголовок</th></tr>
                ${data.map((n) => `<tr><td>${n.id}</td><td><a href="/notes/${n.id}">${n.title}</a></td></tr>`).join("")}
            </table>
            <br>
            <form action="/notes" method="POST">
                <h3>Створити нову нотатку</h3>
                <input type="text" name="title" placeholder="Заголовок" required><br><br>
                <textarea name="content" placeholder="Текст нотатки" required></textarea><br><br>
                <button type="submit">Зберегти</button>
            </form>
            <br><a href="/">На головну</a>
        `,
    );
  } catch (err) {
    res.status(500).send(`Помилка: ${err.message}`);
  } finally {
    if (conn) conn.release();
  }
});

app.post("/notes", async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).send("Поля обов'язкові");

  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      "INSERT INTO notes (title, content) VALUES (?, ?)",
      [title, content],
    );
    if (req.accepts(["json", "html"]) === "html") {
      res.redirect("/notes");
    } else {
      res.status(201).json({ id: Number(result.insertId), title, content });
    }
  } catch (err) {
    res.status(500).send(`Помилка: ${err.message}`);
  } finally {
    if (conn) conn.release();
  }
});

app.get("/notes/:id", async (req, res) => {
  const noteId = parseInt(req.params.id, 10);

  if (isNaN(noteId)) {
    return res
      .status(400)
      .send("Некоректний запит: ID нотатки має бути числом");
  }

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      "SELECT id, title, content, created_at FROM notes WHERE id = ?",
      [noteId],
    );
    if (rows.length === 0) return res.status(404).send("Нотатку не знайдено");

    sendResponse(
      req,
      res,
      rows[0],
      (data) => `
            <h1>${data.title}</h1>
            <p><strong>ID:</strong> ${data.id}</p>
            <p><strong>Створено:</strong> ${data.created_at}</p>
            <hr><div>${data.content}</div><br><br>
            <a href="/notes">Повернутися до списку</a>
        `,
    );
  } catch (err) {
    res.status(500).send(`Помилка: ${err.message}`);
  } finally {
    if (conn) conn.release();
  }
});

if (process.env.LISTEN_PID && parseInt(process.env.LISTEN_FDS, 10) > 0) {
  app.listen({ fd: 3 }, () => {
    console.log("MyWebApp is running via systemd socket activation");
  });
} else {
  app.listen(config.port, "0.0.0.0", () => {
    console.log(`MyWebApp is running locally on http://0.0.0.0:${config.port}`);
  });
}
