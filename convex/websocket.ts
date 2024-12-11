import WebSocket from "ws";

const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws: any) => {
  ws.on("message", async (message: any) => {
    const data = JSON.parse(message);

    if (data.type === "subscribe") {
      const { userId } = data;
      ws.userId = userId;
    }
  });

  ws.send("Welcome to the WebSocket server!");
});

function notifyUser(userId: string, notification: any) {
  wss.clients.forEach((client :any) => {
    if (client.userId === userId && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(notification));
    }
  });
}
