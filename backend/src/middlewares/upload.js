const multer = require('multer');
const crypto = require('node:crypto');
const path = require('node:path');

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      return cb(new Error('Type de fichier non autorisé. Formats acceptés : JPEG, PNG, WebP'));
    }
    cb(null, true);
  },
});

module.exports = { upload, ALLOWED_MIMES };
