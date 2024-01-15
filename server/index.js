const app = require("express")();
const http = require("http").Server(app);
const bodyParser = require("body-parser");
const io = require("socket.io")(http, {
  pingInterval: 10000, // how often to ping/pong.
  pingTimeout: 30000, // time after which the connection is considered timed-out.
  cors: {
    origin: "http://localhost:3000",
  },
});

app.use(bodyParser.json());

let users = [];

io.on("connection", (socket) => {
  console.log("User Connected");

  const left = () => {
    if (users.length) {
      const user = users.find((user) => user.id == socket.id);
      if (user) {
        const { id, roomName } = user;
        console.log("Left User", id, roomName);
        socket.leave(roomName);
        users = users.filter((user) => user.id !== id);
        socket.to(roomName).emit("message", `User ${id} has left the room.`);
      }
    }
  };

  // Subscribe to a channel Event.
  socket.on("subscribe", (roomName, uid) => {
    const id = socket.id;
    users.push({ roomName, id, uid });
    socket.join(roomName);
    socket
      .to(roomName)
      .emit("message", `New User ${id} is Joined in ${roomName} room.`);
    socket.emit("message", `Welcome ${id} to ${roomName} room.`);
    console.log(users);
  });

  socket.on("unsubscribe", () => {
    left();
  });

  // Reconnect.
  socket.on("Reconnect", () => {
    console.log("User Reconnect");
    left();
  });

  // Ping.
  socket.on("Ping", () => {
    console.log("Ping");
    left();
  });

  // Disconnect Event.
  socket.on("disconnect", () => {
    console.log("User Disconnected");
    left();
  });
});

app.get("/", (req, res) => {
  res.send("Hi Welcome");
});

// To All Client Listening to "Message" Event
app.post("/socket/msg-all", (req, res) => {
  io.sockets.emit("message", JSON.stringify(req.body));
  res.send({ msg: "Message Sent to All" });
});

// To All Client in Particular Room Listening to "Message Event"
app.post("/socket/msg-room", (req, res) => {
  const { roomName } = req.body;
  console.log("romm", roomName);
  io.to(roomName).emit("message", JSON.stringify(req.body));
  res.send({ msg: "Message Sent to All Room Members" });
});

// To Particular Client in Particular Room Listening to "Message Event"
app.post("/socket/msg-client-room", (req, res) => {
  const { roomName, uid } = req.body;
  const { id } = users.find(
    (user) => user.roomName === roomName && user.uid === uid
  );
  console.log("ID", id);
  io.to(id).emit("message", JSON.stringify(req.body));
  res.send({ msg: "Message Sent to All Room Members" });
});

const port = 8000;
http.listen(port, () => console.log(`Server Running in Port ${port}`));
