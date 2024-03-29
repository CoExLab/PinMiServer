/* eslint-disable */
const express = require("express");
var path = require("path");
var favicon = require("serve-favicon");
var logger = require("morgan");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");

var index = require("./routes/index");
var cors = require("cors");
const http = require("http");
// const { Server } = require("socket.io");
const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

// const corsOptions = {
//   origin: "https://www.pin-mi.com",
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: [
//     "Origin",
//     "X-Requested-With",
//     "Content-Type",
//     "Accept",
//     "Authorization",
//   ],
// };
app.use(cors());

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", index);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

// const server = http.createServer(app);
// server.listen(process.env.PORT || 3000, () => {
//   console.log("SERVER IS RUNNING");
// });
// const io = new Server(server, {
//   cors: {
//     origin: "*", // Update the origin value to your frontend domain to restrict the allowed origins
//     methods: ["GET", "POST"],
//   },
// });

/**
 * socket.io event handler
 */
// io.on("connection", (socket) => {
//   console.log("User connected: ", socket.id);

//   socket.on("join_reflection", ({ sessionID }) => {
//     socket.join(`room-${sessionID}`);
//   });

//   // join a discussion room
//   socket.on("join_discussion", ({ sessionID }) => {
//     socket.to(`room-${sessionID}`).emit("notify_join_discussion", {
//       message: "Your peer has joined the discussion room",
//     });
//   });
// });

// module.exports = { app, server };
