const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();

// Allowed frontend origins
const allowedOrigins = [
  "http://localhost:5173", // local frontend
 "https://career-compass-ai-3.onrender.com"
];

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (Postman / server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Root route for Render test
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Career Compass AI backend is running 🚀",
  });
});

/* require all the routes here */
const authRouter = require("./routes/auth.routes");
const interviewRouter = require("./routes/interview.routes");

/* using all the routes here */
app.use("/api/auth", authRouter);
app.use("/api/interview", interviewRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

module.exports = app;