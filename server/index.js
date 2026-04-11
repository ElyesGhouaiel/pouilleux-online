const express = require("express");
const http = require("http");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const joueurRoutes = require("./routes/joueur");
const aiRoutes = require("./routes/ai");
const { initSocket } = require("./sockets");

require("dotenv").config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api", authRoutes);
app.use("/api", joueurRoutes);
app.use("/api/ai", aiRoutes);

initSocket(server);

server.listen(PORT, () => {
  console.log(`serveur lancé sur http://localhost:${PORT}`);
});
