import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Message from "./dbMessages.js";
import Pusher from "pusher";
import cors from "cors";

// Load environment variables from .env file
dotenv.config();

// App Config
const app = express();
const port = process.env.PORT || 9000;
const connectionUrl = process.env.MONGO_URI;

const pusher = new Pusher({
  appId: "1912587",
  key: "d4faed731e4ffa01bd40",
  secret: "567519d9e5ce7159f19a",
  cluster: "eu",
  useTLS: true,
});

// Middleware
// Middleware
app.use(express.json());

// Custom CORS configuration
app.use(
  cors({
    origin: "*", // Replace "*" with specific domains if needed
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Alternatively, handle CORS manually
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // Allow all origins
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// app.use((req, res, next) => {
//   res.setHeader("Access-control-Allow-Orign", "*");
//   res.setHeader("Access-control-Allow-Orign", "*");
//   next();
// });

mongoose
  .connect(connectionUrl)
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("Database connection error:", err));

const db = mongoose.connection;

db.once("open", () => {
  console.log(`Db is connected`);

  const msgCollection = db.collection("messagecontents"); // Ensure the collection name matches exactly
  const changeStream = msgCollection.watch();

  changeStream.on("change", (change) => {
    console.log("Change detected in the collection:", change);

    if (change.operationType === "insert") {
      const messageDetails = change.fullDocument;
      pusher.trigger("messages", "inserted", {
        name: messageDetails.name,
        message: messageDetails.message,
        timestamp: messageDetails.timestamp,
      });
    } else {
      console.log("Unsupported change type:", change.operationType);
    }
  });
});

// API Endpoints
app.get("/", (req, res) => res.status(200).send("Hello World"));

app.get("/api/messages/sync", async (req, res) => {
  try {
    const messages = await Message.find(); // Fetch all messages from the database
    res.status(200).send(messages); // Send the messages as the response
  } catch (err) {
    res.status(500).send({
      error: "An error occurred while fetching messages",
      details: err,
    });
  }
});

app.post("/api/messages/new", async (req, res) => {
  try {
    const dbMessage = req.body;
    const data = await Message.create(dbMessage); // Use the imported schema
    res.status(201).send(`New message created:\n ${data}`);
  } catch (err) {
    res.status(500).send(err);
  }
});

// Start Server
app.listen(port, () => console.log(`Listening on localhost:${port}`));
