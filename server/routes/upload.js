const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype);
        const uploadDir = path.join(__dirname, '../../uploads', isVideo ? 'videos' : 'images');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit for video/images
    fileFilter: (req, file, cb) => {
        if ([...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image or video files are allowed.'));
        }
    }
});

// Original endpoint for images
router.post('/', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
    }

    const fileUrl = `http://localhost:3000/uploads/images/${req.file.filename}`;

    res.json({
        success: true,
        url: fileUrl,
        filename: req.file.filename,
        media_type: 'image',
        size: req.file.size
    });
});

// New endpoint for video
router.post('/video', upload.single('video'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No video file provided' });

    const isVideo = ALLOWED_VIDEO_TYPES.includes(req.file.mimetype);
    const subdir = isVideo ? 'videos' : 'images';
    const fileUrl = `http://localhost:3000/uploads/${subdir}/${req.file.filename}`;

    res.json({
        success: true,
        url: fileUrl,
        filename: req.file.filename,
        media_type: isVideo ? 'video' : 'image',
        size: req.file.size,
    });
});

module.exports = router;
