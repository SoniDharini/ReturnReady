import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_ROOT = path.join(__dirname, '../../uploads');
export const PROPERTY_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'properties');
export const INSPECTION_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'inspections');

fs.mkdirSync(PROPERTY_UPLOADS_DIR, { recursive: true });
fs.mkdirSync(INSPECTION_UPLOADS_DIR, { recursive: true });

const propertyStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, PROPERTY_UPLOADS_DIR);
  },
  filename(_req, file, cb) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe}`);
  },
});

const inspectionStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, INSPECTION_UPLOADS_DIR);
  },
  filename(_req, file, cb) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!file.mimetype?.startsWith('image/')) {
    return cb(new ApiError(400, 'Only image files are allowed'));
  }
  return cb(null, true);
}

export const propertyImageUpload = multer({
  storage: propertyStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 20,
  },
});

export const inspectionEvidenceUpload = multer({
  storage: inspectionStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10,
  },
});
