const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Simplified session configuration
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// MongoDB Connection (simplified)
mongoose.connect('mongodb://localhost:27017/resume_builder', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err);
});

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const resumeRoutes = require('./routes/resume');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', require('./middleware/auth').authenticateUser, userRoutes);
app.use('/api/admin', require('./middleware/auth').authenticateUser, adminRoutes);
app.use('/api/resumes', require('./middleware/auth').authenticateUser, resumeRoutes);

// Serve HTML routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/views/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/views/login.html'));
});

app.get('/dashboard', require('./middleware/auth').authenticateUser, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/views/dashboard.html'));
});

app.get('/admin/dashboard', [
    require('./middleware/auth').authenticateUser,
    require('./middleware/auth').authorizeAdmin
], (req, res) => {
    res.sendFile(path.join(__dirname, '../client/views/admin.html'));
});

// Handle 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../client/views/404.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});