require('dotenv').config()
const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
var fs = require('fs');
const jwt = require('jsonwebtoken')
var multer = require('multer');
const path = require('path');
const ejs = require('ejs');
app.use(express.json())
app.use(express.static('./public'));

const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: function(req, file, cb){
    cb(null,file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Init Upload
const upload = multer({
  storage: storage,
  limits:{fileSize: 1000000},
  fileFilter: function(req, file, cb){
    checkFileType(file, cb);
  }
}).single('myImage');

// Check File Type
function checkFileType(file, cb){
  // Allowed ext
  const filetypes = /jpeg|jpg|png|gif/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  if(mimetype && extname){
    return cb(null,true);
  } else {
    cb('Error: Images Only!');
  }
}
app.set('view engine', 'ejs');
app.get('/', (req, res) => res.render('index'));

app.post('/upload', (req, res) => {
  upload(req, res, (err) => {
    if(err){
      res.render('index', {
        msg: err
      });
    } else {
      if(req.file == undefined){
        res.render('index', {
          msg: 'Error: No File Selected!'
        });
      } else {
        console.log(req.file)
        res.render('index', {
          msg: 'File Uploaded!',
          file: `uploads/${req.file.filename}`
        });
      }
    }
  });
});

app.post('/users', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    const user = { name: req.body.name, password: hashedPassword , email : req.body.email , mobile : req.body.mobile}
    fs.readFile('users.json', 'utf8', function readFileCallback(err, data){
      if (err){
          console.log(err);
      } else {
      obj = JSON.parse(data); //now it an object
      obj.push(user); //add some data
      json = JSON.stringify(obj); //convert it back to json
      fs.writeFile('users.json', json, 'utf8', function callback(err,data){
        if(err){
          console.log(error)
        }
        else{
          console.log("Written Successfully")
        }
      }); // write it back 
    }});
    res.status(201).send()
  } catch {
    res.status(500).send()
  }
  
})
app.post('/users/login', async (req, res) => {
    fs.readFile('users.json', 'utf8', async function readFileCallback(err, data){
    if (err){
        console.log(err);
    }
    users=JSON.parse(data);
    var newuser = users.find(user => user.name == req.body.name) 
    if (newuser == null) {
      return res.status(400).send('Cannot find user')
    }
    try{
      if(await bcrypt.compare(req.body.password, newuser.password)) {
        const accessToken = generateAccessToken(newuser)
        res.json({accessToken : accessToken})
      } else {
        res.send('Not Allowed')
      }
    }
    catch{
      res.status(500).send()
    }
    }); 
})

function generateAccessToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET)
}

app.get('/users', authenticateToken, (req, res) => {
  try {
    fs.readFile('users.json', 'utf8', function readFileCallback(err, data){
      if (err){
          console.log(err);
      } else {
      obj = JSON.parse(data); 
      data = JSON.stringify(obj); 
      res.json(obj)
      res.status(201).send()
    }});
    
  } catch {
    res.status(500).send()
  }
})
app.get('/getuser', authenticateToken, (req, res) => {
    fs.readFile('users.json', 'utf8', function readFileCallback(err, data){
      if (err){
          console.log(err);
      } else {
      users = JSON.parse(data);
      var newuser = users.find(user => user.name == req.newuser.name)
      res.json(newuser) 
    }});
})
app.post('/editProfile', authenticateToken, (req, res) => {
  fs.readFile('users.json', 'utf8', function readFileCallback(err, data){
    if (err){
        console.log(err);
    } else {
    users = JSON.parse(data);
    console.log(req.newuser.name)
    console.log(req.body.newemail)
    for (var i in users) {
      if (users[i].name == req.newuser.name) {
        users[i].name = req.body.newusername
        users[i].email = req.body.newemail
        users[i].mobile = req.body.newmobile
         break; 
      }
    }
    json = JSON.stringify(users)
    fs.writeFile('users.json', json, 'utf8', function callback(err,data){
      if(err){
        console.log(error)
      }
      else{
        console.log("Written Successfully")
      }
    });
    var currUser = users.find(user => user.name == req.body.newusername)
    res.json(currUser) 
  }});
})

app.post('/editPassword', authenticateToken, (req, res) => {
  fs.readFile('users.json', 'utf8', async function readFileCallback(err, data){
    if (err){
        console.log(err);
    } else {
    users = JSON.parse(data);
    for (var i in users) {
      if (users[i].name == req.newuser.name) {
        const oldhashedPassword = users[i].password
        const newhashedPassword = await bcrypt.hash(req.body.newpassword, 10)
        users[i].password = newhashedPassword
        res.json({oldhashedPassword,newhashedPassword})
         break; 
         
      }
    }
    json = JSON.stringify(users)
    fs.writeFile('users.json', json, 'utf8', function callback(err,data){
      if(err){
        console.log(error)
      }
      else{
        console.log("Written Successfully")
      }
    });
  }});
})


function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (token == null) return res.sendStatus(401)

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, newuser) => {
    if (err) return res.sendStatus(403)
    req.newuser = newuser
    next()
  })
}
app.listen(3000)