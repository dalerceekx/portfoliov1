import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { env } from '../../config/env';
import { asyncHandler } from '../../utils/async';
import { AppError, ok } from '../../utils/http';
import { hasRole, isAuthenticated } from '../../middleware/auth';
import { csrfProtection } from '../../middleware/csrf';
import { uploadLimiter } from '../../middleware/rateLimit';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export const uploadDir = path.resolve(env.UPLOAD_DIR);

/** Memory storage: nothing untrusted is written to disk before it is validated. */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      cb(new AppError(415, 'Upload a JPEG, PNG, WebP or AVIF image.', 'UNSUPPORTED_MEDIA'));
      return;
    }
    cb(null, true);
  },
});

export const adminUploadRouter = Router();
adminUploadRouter.use(isAuthenticated, hasRole('ADMIN', 'EDITOR'));

adminUploadRouter.post(
  '/',
  uploadLimiter,
  csrfProtection,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw AppError.badRequest('Choose an image to upload.');

    // Re-decode with sharp: this both verifies the bytes really are an image
    // and strips any metadata payload the file may carry.
    try {
      const meta = await sharp(req.file.buffer, { failOn: 'error' }).metadata();
      if (!meta.width || !meta.height) throw new Error('not an image');
    } catch {
      throw AppError.badRequest('That file is not a valid image.');
    }

    // Filenames come from us, never from the client.
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.webp`;
    await fs.mkdir(uploadDir, { recursive: true });
    await sharp(req.file.buffer)
      .rotate()
      .resize({ width: 1600, height: 1200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path.join(uploadDir, name));

    res.status(201).json(ok({ path: `/uploads/${name}` }));
  }),
);
