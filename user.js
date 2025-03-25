const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Resume = require('../models/resume');
const { authenticateUser } = require('../middleware/auth');

// Get user profile
router.get('/profile', authenticateUser, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('resumes');

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
});

// Update user profile
router.put('/profile', authenticateUser, async (req, res) => {
    try {
        const { email, currentPassword, newPassword } = req.body;
        const user = req.user;

        // Update email if provided
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use'
                });
            }
            user.email = email;
        }

        // Update password if provided
        if (currentPassword && newPassword) {
            const isValidPassword = await user.comparePassword(currentPassword);
            if (!isValidPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }
            user.password = newPassword;
        }

        await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// Get user's resumes
router.get('/resumes', authenticateUser, async (req, res) => {
    try {
        const resumes = await Resume.find({ user: req.user._id })
            .sort({ lastModified: -1 });

        res.json({
            success: true,
            data: resumes
        });
    } catch (error) {
        console.error('Get resumes error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch resumes'
        });
    }
});

// Get user's resume by ID
router.get('/resumes/:resumeId', authenticateUser, async (req, res) => {
    try {
        const resume = await Resume.findOne({
            _id: req.params.resumeId,
            user: req.user._id
        });

        if (!resume) {
            return res.status(404).json({
                success: false,
                message: 'Resume not found'
            });
        }

        res.json({
            success: true,
            data: resume
        });
    } catch (error) {
        console.error('Get resume error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch resume'
        });
    }
});

// User statistics
router.get('/stats', authenticateUser, async (req, res) => {
    try {
        const stats = {
            totalResumes: await Resume.countDocuments({ user: req.user._id }),
            recentResumes: await Resume.find({ user: req.user._id })
                .sort({ lastModified: -1 })
                .limit(5),
            lastLogin: req.user.lastLogin
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
});

module.exports = router;