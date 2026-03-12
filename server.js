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

app.get("/", (req, res) => {
  res.send("Notes Service is running");
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
