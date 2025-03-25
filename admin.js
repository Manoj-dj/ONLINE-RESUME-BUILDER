const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Resume = require('../models/resume');
const { authorizeAdmin } = require('../middleware/auth');

// Protect all admin routes
router.use(authorizeAdmin);

// Get admin dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const stats = {
            totalUsers: await User.countDocuments({ role: 'user' }),
            totalResumes: await Resume.countDocuments(),
            recentUsers: await User.find({ role: 'user' })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('-password'),
            recentActivity: await Resume.find()
                .sort({ lastModified: -1 })
                .limit(10)
                .populate('user', 'username')
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch admin statistics'
        });
    }
});

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({ role: 'user' })
            .select('-password')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
});

// Get user details
router.get('/users/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('-password')
            .populate('resumes');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get user details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user details'
        });
    }
});

// Update user
router.put('/users/:userId', async (req, res) => {
    try {
        const { email, status } = req.body;
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (email) user.email = email;
        if (status) user.status = status;

        await user.save();

        res.json({
            success: true,
            message: 'User updated successfully',
            data: user
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user'
        });
    }
});

// Delete user
router.delete('/users/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Delete user's resumes
        await Resume.deleteMany({ user: user._id });
        await user.remove();

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
});

module.exports = router;