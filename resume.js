const express = require('express');
const router = express.Router();
const Resume = require('../models/resume');
const { authenticateUser } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Protect all resume routes
router.use(authenticateUser);

// Create new resume
router.post('/', async (req, res) => {
    try {
        const { templateId, data } = req.body;
        
        const resume = new Resume({
            user: req.user._id,
            templateId,
            data
        });

        await resume.save();

        res.status(201).json({
            success: true,
            message: 'Resume created successfully',
            data: resume
        });
    } catch (error) {
        console.error('Create resume error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create resume'
        });
    }
});

// Get all resumes for current user
router.get('/', async (req, res) => {
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

// Get single resume by ID
router.get('/:id', async (req, res) => {
    try {
        const resume = await Resume.findOne({
            _id: req.params.id,
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

// Update resume
router.put('/:id', async (req, res) => {
    try {
        const { templateId, data } = req.body;
        const resume = await Resume.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!resume) {
            return res.status(404).json({
                success: false,
                message: 'Resume not found'
            });
        }

        resume.templateId = templateId || resume.templateId;
        resume.data = data || resume.data;
        resume.lastModified = Date.now();

        await resume.save();

        res.json({
            success: true,
            message: 'Resume updated successfully',
            data: resume
        });
    } catch (error) {
        console.error('Update resume error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update resume'
        });
    }
});

// Delete resume
router.delete('/:id', async (req, res) => {
    try {
        const resume = await Resume.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!resume) {
            return res.status(404).json({
                success: false,
                message: 'Resume not found'
            });
        }

        await resume.remove();

        res.json({
            success: true,
            message: 'Resume deleted successfully'
        });
    } catch (error) {
        console.error('Delete resume error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete resume'
        });
    }
});

// Export resume as PDF
router.get('/:id/export', async (req, res) => {
    try {
        const resume = await Resume.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!resume) {
            return res.status(404).json({
                success: false,
                message: 'Resume not found'
            });
        }

        // Create PDF
        const doc = new PDFDocument();
        const filename = `resume-${Date.now()}.pdf`;

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        // Pipe the PDF to the response
        doc.pipe(res);

        // Add content to PDF
        generatePDF(doc, resume.data);

        // Finalize PDF
        doc.end();
    } catch (error) {
        console.error('Export resume error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export resume'
        });
    }
});

// Helper function to generate PDF
function generatePDF(doc, data) {
    // Add personal info
    doc.fontSize(20).text('Resume', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(16).text(data.personalInfo.fullName);
    doc.fontSize(12).text(data.personalInfo.email);
    doc.text(data.personalInfo.phone);
    doc.text(data.personalInfo.address);
    doc.moveDown();

    // Add education
    doc.fontSize(14).text('Education', { underline: true });
    doc.moveDown();
    data.education.forEach(edu => {
        doc.fontSize(12).text(edu.institution);
        doc.fontSize(10)
            .text(edu.degree)
            .text(edu.year)
            .moveDown();
    });

    // Add experience
    doc.fontSize(14).text('Experience', { underline: true });
    doc.moveDown();
    data.experience.forEach(exp => {
        doc.fontSize(12).text(exp.company);
        doc.fontSize(10)
            .text(exp.position)
            .text(exp.duration)
            .text(exp.description)
            .moveDown();
    });

    // Add skills
    doc.fontSize(14).text('Skills', { underline: true });
    doc.moveDown();
    doc.fontSize(10).text(data.skills.join(', '));
}

module.exports = router;