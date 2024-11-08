const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const QRCode = require('qrcode');
const path = require('path');
const session = require('express-session');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({ secret: 'secret-key', resave: false, saveUninitialized: true }));

// Set EJS as the templating engine

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const sessions = {};
const submissions = {};
const ipAttempts = {};
const verificationCodes = new Map();

const problems = {
  easy: JSON.parse(fs.readFileSync('problems/easy.json')),
  medium: JSON.parse(fs.readFileSync('problems/medium.json')),
  hard: JSON.parse(fs.readFileSync('problems/hard.json'))
};

// Middleware to protect admin routes
function checkAdminAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  } else {
    res.status(403).redirect('/login');
  }
}

// Add at the top with other constants
const MAX_ATTEMPTS = 3;
const CODE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

// Update the login routes
app.get('/login', (req, res) => {
  res.render('login', { 
    error: null, 
    showCodeInput: false,
    password: ''
  });
});

app.post('/login', (req, res) => {
  const { password, verificationCode } = req.body;
  
  // First step: Password validation
  if (!verificationCode) {
    if (password === process.env.ADMIN_PASSWORD) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      verificationCodes.set(req.ip, {
        code,
        timestamp: Date.now(),
        attempts: 0
      });
      console.log('\x1b[33m%s\x1b[0m', `New verification code for ${req.ip}: ${code}`);
      return res.render('login', { 
        error: 'Contraseña correcta. Por favor introduce el código de verificación mostrado en la terminal.', 
        showCodeInput: true,
        password: password
      });
    } else {
      return res.render('login', { 
        error: 'Contraseña incorrecta', 
        showCodeInput: false,
        password: ''
      });
    }
  }

  // Second step: Code verification
  const storedData = verificationCodes.get(req.ip);
  if (!storedData) {
    return res.render('login', { 
      error: 'Sesión expirada', 
      showCodeInput: false,
      password: ''
    });
  }

  if (storedData.attempts >= MAX_ATTEMPTS) {
    verificationCodes.delete(req.ip);
    return res.render('login', { 
      error: 'Demasiados intentos. Intenta de nuevo.', 
      showCodeInput: false,
      password: ''
    });
  }

  storedData.attempts++;

  if (verificationCode === storedData.code) {
    verificationCodes.delete(req.ip);
    req.session.isAdmin = true;
    return res.redirect('/profe');
  } else {
    const remainingAttempts = MAX_ATTEMPTS - storedData.attempts;
    return res.render('login', { 
      error: `Código incorrecto. ${remainingAttempts} intentos restantes.`,
      showCodeInput: true,
      password: password
    });
  }
});

// Add a cleanup function to remove expired codes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of verificationCodes.entries()) {
    if (now - data.timestamp > CODE_EXPIRY) {
      verificationCodes.delete(ip);
    }
  }
}, 60000); // Check every minute

// Add after the login routes and before the /profe route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login');
  });
});

// Protect the admin route
app.get('/profe', checkAdminAuth, (req, res) => {
  res.render('profe', { submissions, sessions });
});

// Function to get a random problem based on difficulty
function getRandomProblem(difficulty) {
  const problemSet = problems[difficulty];
  const randomIndex = Math.floor(Math.random() * problemSet.length);
  return problemSet[randomIndex];
}

// Route to generate QR code
app.post('/generate-qr', (req, res) => {
  const { difficulty, problemTitle, problemDescription } = req.body;
  const sessionId = Date.now().toString(); 

  let problem;
  if (difficulty === 'custom') {
    problem = {
      id: sessionId,
      title: problemTitle,
      description: problemDescription,
      difficulty: 'custom'
    };
  } else {
    problem = getRandomProblem(difficulty);
  }

  sessions[sessionId] = { problem, status: 'WAITING REVIEW', claimedBy: null };

  const url = `${process.env.PUBLIC_URL}/student?session=${sessionId}`;
  QRCode.toDataURL(url, (err, src) => {
    if (err) res.send('Error occurred');
    res.json({ src, sessionId, url });
  });

  io.emit('new-session', { sessionId, problem });
});

// Route for student view
app.get('/student', (req, res) => {
  const sessionId = req.query.session;
  const session = sessions[sessionId];
  const ip = req.ip;

  if (session) {
    if (session.claimedBy && session.claimedBy !== ip) {
      res.status(403).json({statusCode: '403', error: 'This session is already claimed by another user.'})
    } else {
      session.claimedBy = ip;
      res.render('student', { problem: session.problem, sessionId });
    }
  } else {
    res.status(404).json({statusCode: '404', error: 'Session not found'})
  }
});

// Route for detailed view
app.get('/detail/:sessionId', checkAdminAuth, (req, res) => {
  const sessionId = req.params.sessionId;
  const submission = submissions[sessionId];
  const session = sessions[sessionId];

  if (submission) {
    res.render('detail', { submission, sessionId });
  } else if (session) {
    res.render('detail', { submission: session, sessionId });
  } else {
    res.send('Invalid session ID');
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('submit-answer', (data) => {
    const timestamp = Date.now();
    const ip = socket.handshake.address;

    if (!ipAttempts[ip]) {
      ipAttempts[ip] = 0;
    }
    ipAttempts[ip]++;

    if (sessions[data.sessionId]) {
      // Store answer and metadata regardless of cheating status
      const sessionData = {
        ...sessions[data.sessionId],
        answer: data.answer,
        cheated: data.cheated,
        timestamp: timestamp,
        status: data.cheated ? 'POSIBLE TRAMPOSO' : 'CONTESTADO',
        ip: ip,
        attempts: ipAttempts[ip]
      };
      
      sessions[data.sessionId] = sessionData;
      submissions[data.sessionId] = sessionData;
      
      // Include answer in the emitted data
      io.emit('new-answer', {
        sessionId: data.sessionId,
        answer: data.answer,
        cheated: data.cheated,
        timestamp,
        status: sessionData.status
      });
      
      delete sessions[data.sessionId];
    }
  });

  socket.on('update-status', (data) => {
    if (submissions[data.sessionId]) {
      submissions[data.sessionId].status = data.status;
      io.emit('status-update', {
        sessionId: data.sessionId,
        status: data.status
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// 404 handler

app.use((req, res, next) => {
  res.status(404).json({ errorCode: 404, error: '404 Not Found' });
});

const PORT = process.env.APP_PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on ${process.env.PUBLIC_URL}`);
});