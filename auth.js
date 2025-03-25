const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const { authenticateUser } = require('../middleware/auth');

// Helper function to format UTC timestamp
function getUTCTimestamp() {
    const now = new Date();
    return now.toISOString().replace('T', ' ').slice(0, 19);
}

// Helper function to log actions
function logAction(action, user, status, details = {}) {
    const timestamp = getUTCTimestamp();
    console.log(`[${timestamp}] ${action} - User: ${user} - Status: ${status}`, details);
}

// Register new user
router.post('/register', async (req, res) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    
    try {
        const { username, email, password } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required',
                timestamp
            });
        }

        // Check existing username
        const existingUsername = await User.findOne({ username: username.toLowerCase() });
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: 'Username already exists',
                errorType: 'duplicateUsername',
                timestamp
            });
        }

        // Check existing email
        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered',
                errorType: 'duplicateEmail',
                timestamp
            });
        }

        // Create new user
        const newUser = new User({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password, // Will be hashed by pre-save hook
            role: 'user',
            createdAt: new Date(),
            registeredBy: req.body.currentUser || 'Manoj-dj',
            status: 'active'
        });

        await newUser.save();

        console.log(`[${timestamp}] New user registered: ${username}`);

        res.status(201).json({
            success: true,
            message: 'Registration successful! Please login.',
            timestamp
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp
        });
    }
});

// Login
router.post('/login', async (req, res) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    
    try {
        const { username, password } = req.body;

        // Admin login
        if (username === 'admin' && password === 'pass123') {
            req.session.user = {
                username: 'admin',
                role: 'admin',
                loginTime: timestamp
            };
            
            return res.json({
                success: true,
                user: {
                    username: 'admin',
                    role: 'admin'
                },
                timestamp
            });
        }

        // Regular user login
        const user = await User.findOne({ username: username.toLowerCase() });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password',
                timestamp
            });
        }

        // Verify password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password',
                timestamp
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Set session
        req.session.user = {
            id: user._id,
            username: user.username,
            role: user.role,
            loginTime: timestamp
        };

        res.json({
            success: true,
            user: {
                username: user.username,
                role: user.role
            },
            timestamp
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp
        });
    }
});

// Logout
router.post('/logout', (req, res) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({
                success: false,
                message: 'Logout failed',
                timestamp
            });
        }

        res.clearCookie('connect.sid');
        res.json({
            success: true,
            message: 'Logged out successfully',
            timestamp
        });
    });
});

// Check session
router.get('/check-session', (req, res) => {
    const timestamp = getUTCTimestamp();

    if (req.session && req.session.user) {
        // Update last activity
        req.session.lastActivity = Date.now();

        logAction('Session Check', req.session.user.username, 'Success');
        res.json({
            isLoggedIn: true,
            user: req.session.user,
            timestamp
        });
    } else {
        logAction('Session Check', 'Unknown', 'Failed', { reason: 'No active session' });
        res.json({
            isLoggedIn: false,
            timestamp
        });
    }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
    const timestamp = getUTCTimestamp();
    const currentUser = req.body.currentUser || 'Manoj-dj';

    try {
        const { email } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            logAction('Forgot Password', currentUser, 'Failed', { reason: 'Email not found', attempted: email });
            return res.status(404).json({
                success: false,
                message: 'If this email is registered, you will receive reset instructions.',
                timestamp
            });
        }

        // Generate password reset token (implementation details omitted for security)
        const resetToken = require('crypto').randomBytes(32).toString('hex');
        
        // Save reset token to user (you would need to add this field to your user model)
        user.resetToken = resetToken;
        user.resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
        await user.save();

        // Log the action (but don't expose the token in logs)
        logAction('Forgot Password', currentUser, 'Success', { username: user.username });

        // In a real application, you would send an email here
        // For demo purposes, we'll just return success
        res.json({
            success: true,
            message: 'Password reset instructions sent to your email.',
            timestamp
        });

    } catch (error) {
        logAction('Forgot Password', currentUser, 'Error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to process password reset request.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp
        });
    }
});

// Reset password
router.post('/reset-password', async (req, res) => {
    const timestamp = getUTCTimestamp();
    const currentUser = req.body.currentUser || 'Manoj-dj';

    try {
        const { token, newPassword } = req.body;

        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            logAction('Reset Password', currentUser, 'Failed', { reason: 'Invalid or expired token' });
            return res.status(400).json({
                success: false,
                message: 'Password reset token is invalid or has expired.',
                timestamp
            });
        }

        // Update password
        user.password = await bcrypt.hash(newPassword, 10);
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        logAction('Reset Password', user.username, 'Success');

        res.json({
            success: true,
            message: 'Password has been reset successfully. Please login with your new password.',
            timestamp
        });

    } catch (error) {
        logAction('Reset Password', currentUser, 'Error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to reset password.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp
        });
    }
});

module.exports = router;