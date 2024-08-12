
const express=require("express")
const http=require("http")
const socketIO=require("socket.io")
const app=express()
const server=http.createServer(app)
const io=socketIO(server)
const path = require("path");
const photoPath = path.join(__dirname, "photo");
const mysql = require("mysql");
app.use(express.static(photoPath));


const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'localhost',
  user: "root",
  password:"91538xAB",
  
});
pool.query('CREATE DATABASE IF NOT EXISTS chat_app', (err, results) => {
  if (err) {
    console.error('Error creating database:', err);
    return;
  }
  console.log('Database created:', results);
});

pool.query('USE chat_app', (err, results) => {
  if (err) {
    console.error('Error selecting database:', err);
    return;
  }
  console.log('Database selected');

  
  const createTableQuery =
  'CREATE TABLE IF NOT EXISTS messages (user_id INT PRIMARY KEY,user_name VARCHAR(255) NOT NULL,message TEXT NOT NULL,current_time DATETIME DEFAULT CURRENT_TIMESTAMP)';
  
  pool.query(createTableQuery, (err, results) => {
    if (err) {
      console.error('Error creating table:', err);
      return;
    }
    console.log('Table created:', results);
  });
});

app.get("/chat_page.html", (req, res) => {
  res.sendFile(__dirname + "/chat_page.html");
});
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/introduction_page.html");
});
app.get("/about_page.html", (req, res) => {
  res.sendFile(__dirname + "/about_page.html");
});

let users = [];

io.on("connection", function(socket) {
  console.log("a user connected");

  
  socket.emit("status", "Welcome!");

  
  socket.on("disconnect", function() {
    console.log("user disconnected");
    if (socket.username) {
      users = users.filter(function(user) {
        return user.username !== socket.username;
      });
      io.emit("status", socket.username + " left");
      io.emit("user list", users);
    }
  });

  
  socket.on('chat message', function(message) {
    pool.getConnection(function(err, connection) {
      if (err) throw err; // not connected!
      
      let userId = 0; // You need to implement logic to get the next user_id
      let userName = socket.username; // Assuming socket.username is set
      let currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
  
      let sql = `INSERT INTO messages (user_id, user_name, message, current_time) VALUES (?, ?, ?, ?)`;
      connection.query(sql, [userId, userName, message, currentTime], function (error, results, fields) {
        // Handle error after the release.
        if (error) throw error;
        
        // Send message to all clients
        io.emit('chat message', { username: userName, message: message });
  
        // And invalid the connection
        connection.release();
      });
    });
  });
  

  
  socket.on("set username", function(username) {
    socket.username = username;
    users.push({ username: username, typing: false });
    io.emit("status", username + " joined");
    io.emit("user list", users);
  });

  
  socket.on("user typing", function(typing) {
    if (socket.username) {
      users = users.map(function(user) {
        if (user.username === socket.username) {
          user.typing = typing;
        }
        return user;
      });
      io.emit("user list", users);
    }
  });
});

const port = process.env.PORT || 3000;
server.listen(port, function() {
  console.log("listening on *:" + port);
});