const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const mysql = require('mysql2')

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const connection = mysql.createConnection({
    host:'localhost',
    user :'root',
    password:'suresh@6302',
    database:'myDiary'
});

connection.connect((err)=>{
    if(err){
        console.error('Error connecting to the database:',err);
        return;
    }
    console.log('Connected to the MySQL database!');
})

app.get('/', (req, res) => {
    console.log(req);
    res.status(200).json({ message: 'Successful' })
});


/* ---------- REGISTER ---------- */
app.post('/registerUser', async (req, res) => {
  console.log("Request Body Received:", req.body);
  const { email, password } = req.body;
  try {
    
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("hashed password:",hashedPassword);
    connection.query(`insert into Users(EmailID,hashedPassword) values('${email}','${hashedPassword}')`,(err,results)=>{
      if(err)
      {
        res.status(500).json('Error registering account')
      }
      res.status(200).json('Account registered successfully!')
    })
   
  }
  catch(err){
    console.error(err);
    res.status(500).json('Error while hashing password');
  }
 
});
/* ---------- LOGIN ---------- */
app.post('/userLogin', async (req, res) => {
  console.log("User logged in:", req.body);
  const { email, password } = req.body;
   if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }
 // let hashedPassword ="$2b$10$tcvOwuw/LnIJ0ubPFNuq/.L3AfEFvRxcVWm8oRRPbokXqVmR.udpi"
    let hashedPassword=''; 
    let userID='';
 connection.query(`select ID,hashedPassword from Users where EmailID= ?`,[email],async(err,result)=>{
 
    hashedPassword = result[0].hashedPassword;
    userID = result[0].ID;
    console.log(hashedPassword);
    let response = await bcrypt.compare(password, hashedPassword);

if (response) {
 return res.status(200).send({userID:userID,message: "Login successful" });

} else {
  return res.status(500).send({ message: "Incorrect password" });
}
  })
 // let response=await bcrypt.compare(password,hashedPassword)
 // console.log('Is same: ',response);
  // res.send(200).send('Matched')
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
app.listen(3000, () => {
  console.log("Server started on port 3000!");
});
