require("dotenv").config();
const express = require('express');
const cors = require('cors');
const bcrypt = require("bcryptjs");
const mysql = require('mysql2');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



const fs = require("fs");

const connection = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  ssl: {
      ca: process.env.DB_CA_CERT 
        ? process.env.DB_CA_CERT.replace(/\\n/g, "\n")
        : fs.readFileSync("./ca.pem")
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

connection.getConnection((err, conn) => {
  if (err) {
    console.error("DB connection failed:", err);
  } else {
    console.log("Database connected successfully");
    conn.release();
    
    // Initialize database and tables
    initializeDatabase();
  }
});

// Initialize Database and Create Tables
function initializeDatabase() {
  // Create Users table
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS Users (
      ID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      EmailID VARCHAR(50) UNIQUE,
      hashedPassword VARCHAR(100)
    )
  `;

  connection.query(createUsersTable, (err) => {
    if (err) {
      console.error('Error creating Users table:', err);
    } else {
      console.log('Users table ready');
    }
  });

  // Create Posts table
  const createPostsTable = `
    CREATE TABLE IF NOT EXISTS Posts (
      ID INT PRIMARY KEY AUTO_INCREMENT,
      UserID INT,
      postTitle VARCHAR(100),
      postDescription VARCHAR(1500),
      FOREIGN KEY(UserID) REFERENCES Users(ID)
    )
  `;

  connection.query(createPostsTable, (err) => {
    if (err) {
      console.error('Error creating Posts table:', err);
    } else {
      console.log('Posts table ready');
    }
  });
}

/* ---------- REGISTER ---------- */
app.post('/registerUser', async (req, res) => {
  console.log("Request Body Received:", req.body);
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("hashed password:", hashedPassword);
    connection.query(
      'INSERT INTO Users (EmailID, hashedPassword) VALUES (?, ?)',
      [email, hashedPassword],
      (err, results) => {
        if (err) {
          console.error('Register query error:', err);
          return res.status(500).json({ message: 'Error registering account', error: err.message });
        }
        return res.status(200).json({ message: 'Account registered successfully!', userID: results.insertId });
      }
    );
  } catch (err) {
    console.error('Hashing error:', err);
    res.status(500).json({ message: 'Error while hashing password', error: err.message });
  }
});
/* ---------- LOGIN ---------- */
app.post('/userLogin', async (req, res) => {
  console.log("User logged in:", req.body);
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  connection.query(
    'SELECT ID, hashedPassword FROM Users WHERE EmailID = ?',
    [email],
    async (err, result) => {
      if (err) {
        console.error('Login query error:', err);
        return res.status(500).json({ message: 'Login failed', error: err.message });
      }

      if (!result || result.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const hashedPassword = result[0].hashedPassword;
      const userID = result[0].ID;
      try {
        const match = await bcrypt.compare(password, hashedPassword);
        if (match) {
          return res.status(200).json({ userID: userID, message: 'Login successful' });
        } else {
          return res.status(401).json({ message: 'Incorrect password' });
        }
      } catch (cmpErr) {
        console.error('Bcrypt compare error:', cmpErr);
        return res.status(500).json({ message: 'Login error', error: cmpErr.message });
      }
    }
  );
});

/* ---------- NEW POST ---------- */
app.post('/newPost', (req, res) => {
  const { postTitle, postDescription,userID }= req.body;
  connection.query("insert into Posts(UserID,postTitle,postDescription) values(?,?,?)",[userID, postTitle, postDescription],async(err,result)=>{
     if(err)
      {
         console.log("MYSQL ERROR:", err); 
       return res.status(500).json('Error creating post');
       
      }
      console.log("New Post:", { userID, postTitle, postDescription });
      return res.status(200).json("Post created successfully");
  }
);
});
app.get('/getMyPosts', async (req, res) => {
  connection.query("select* from Posts where UserID=?", [req.query.userID], (err, result)=>{
    if (err) {
      res.status(500).json('Error fetching posts');
      return
    }
    res.status(200).json(result);
  });
});

app.delete('/deletePost/:id', (req, res) => {
  console.log("DELETE API HIT");
  console.log("Post ID received:", req.params.id);

  const postID = req.params.id;

  connection.query(
    "DELETE FROM Posts WHERE ID = ?",
    [postID],
    (err, result) => {
      if (err) {
        console.log("MySQL Delete Error:", err);
        return res.status(500).json({ message: "Delete failed" });
      }

      console.log("Rows affected:", result.affectedRows);

      return res.status(200).json({ message: "Post deleted" });
    }
  );
});

app.get("/getSinglePost", (req, res) => {
  const { postID } = req.query;

  connection.query(
    "SELECT * FROM Posts WHERE ID = ?",
    [postID],
    (err, result) => {
      if (err) return res.status(500).json("Error fetching post");
      res.status(200).json(result[0]);
    }
  );
});


app.put('/editPost/:id', (req, res) => {
  const postID = req.params.id;
  const { postTitle, postDescription } = req.body;

  connection.query(
    "UPDATE Posts SET postTitle=?, postDescription=? WHERE ID=?",
    [postTitle, postDescription, postID],
    (err) => {
      if (err) return res.status(500).json("Update failed");
      res.status(200).json("Post updated");
    }
  );
});


/* ---------- SERVER ---------- */
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
   res.send('Server is running!');
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}!`);
});
