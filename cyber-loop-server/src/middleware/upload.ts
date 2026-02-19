import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const uploadDir = process.env.UPLOAD_DIR || './uploads';
const maxSizeMb = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10);

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const type = file.mimetype.startsWith('image/') ? 'images'
      : file.mimetype === 'application/pdf' ? 'pdfs' : 'text';
    cb(null, path.join(uploadDir, type));
  },
  filename: (_req, file, cb) => {
    const randomName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname) || '';
    cb(null, `${randomName}${ext}`);
  },
});

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/webp',
    'application/pdf', 'text/plain',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMb * 1024 * 1024 },
});
