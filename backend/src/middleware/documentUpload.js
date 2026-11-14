const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { randomUUID } = require('crypto');

const MAX_FILE_SIZE_DEFAULT = 10 * 1024 * 1024;
const isPathInside = (directory, candidate) => {
  const relativePath = path.relative(directory, candidate);
  return relativePath === ''
    || (!path.isAbsolute(relativePath)
      && relativePath !== '..'
      && !relativePath.startsWith(`..${path.sep}`));
};
const MIME_TYPES_BY_EXTENSION = new Map([
  ['.pdf', new Set(['application/pdf'])],
  ['.jpg', new Set(['image/jpeg'])],
  ['.jpeg', new Set(['image/jpeg'])],
  ['.png', new Set(['image/png'])],
  ['.zip', new Set(['application/zip', 'application/x-zip-compressed'])],
  ['.doc', new Set(['application/msword'])],
  ['.docx', new Set(['application/vnd.openxmlformats-officedocument.wordprocessingml.document'])],
  ['.xls', new Set(['application/vnd.ms-excel'])],
  ['.xlsx', new Set(['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])],
  ['.mp3', new Set(['audio/mpeg', 'audio/mp3'])],
  ['.wav', new Set(['audio/wav', 'audio/x-wav', 'audio/wave'])],
  ['.ogg', new Set(['audio/ogg', 'application/ogg'])],
  ['.flac', new Set(['audio/flac'])],
  ['.m4a', new Set(['audio/mp4', 'audio/x-m4a'])],
  ['.mp4', new Set(['video/mp4'])],
  ['.mov', new Set(['video/quicktime'])],
  ['.webm', new Set(['video/webm'])],
  ['.avi', new Set(['video/x-msvideo'])],
  ['.mpeg', new Set(['video/mpeg'])],
  ['.mpg', new Set(['video/mpeg'])],
]);

const ZIP_SIGNATURE = (header) =>
  header.length >= 4
  && header[0] === 0x50
  && header[1] === 0x4b
  && [0x03, 0x05, 0x07].includes(header[2])
  && [0x04, 0x06, 0x08].includes(header[3]);

function isSupportedUploadMetadata(file) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const mimeType = String(file.mimetype || '').split(';', 1)[0].trim().toLowerCase();
  return MIME_TYPES_BY_EXTENSION.get(extension)?.has(mimeType) === true;
}

function matchesFileSignature(extension, header) {
  switch (extension) {
    case '.pdf':
      return header.subarray(0, 5).toString('ascii') === '%PDF-';
    case '.jpg':
    case '.jpeg':
      return header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    case '.png':
      return header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case '.zip':
    case '.docx':
    case '.xlsx':
      return ZIP_SIGNATURE(header);
    case '.doc':
    case '.xls':
      return header.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
    case '.mp3':
      return header.subarray(0, 3).toString('ascii') === 'ID3'
        || (header.length >= 2 && header[0] === 0xff && (header[1] & 0xe0) === 0xe0);
    case '.wav':
      return header.subarray(0, 4).toString('ascii') === 'RIFF'
        && header.subarray(8, 12).toString('ascii') === 'WAVE';
    case '.ogg':
      return header.subarray(0, 4).toString('ascii') === 'OggS';
    case '.flac':
      return header.subarray(0, 4).toString('ascii') === 'fLaC';
    case '.m4a':
    case '.mp4':
    case '.mov':
      return header.subarray(4, 8).toString('ascii') === 'ftyp';
    case '.webm':
      return header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    case '.avi':
      return header.subarray(0, 4).toString('ascii') === 'RIFF'
        && header.subarray(8, 12).toString('ascii') === 'AVI ';
    case '.mpeg':
    case '.mpg':
      return header.length >= 3
        && header[0] === 0x00
        && header[1] === 0x00
        && header[2] === 0x01;
    default:
      return false;
  }
}

function getMaximumFileSize(env = process.env) {
  const configured = env.MAX_FILE_SIZE;
  if (configured === undefined || configured === '') return MAX_FILE_SIZE_DEFAULT;
  const value = Number(configured);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('MAX_FILE_SIZE must be a positive integer number of bytes');
  }
  return value;
}

function getDocumentStorageDirectories(env = process.env) {
  const publicUploadsDirectory = path.resolve(__dirname, '../../uploads');
  const configuredRoot = env.UPLOAD_DIR
    ? path.resolve(__dirname, '../..', env.UPLOAD_DIR)
    : path.resolve(__dirname, '../../private_uploads');
  const uploadDirectory = path.resolve(configuredRoot, 'documents');
  const legacyUploadDirectory = path.resolve(__dirname, '../../uploads/documents');
  if (isPathInside(publicUploadsDirectory, uploadDirectory)) {
    throw new Error('Document upload storage must be outside the publicly served uploads directory');
  }
  return [...new Set([uploadDirectory, legacyUploadDirectory])];
}

function getUploadDirectory(env = process.env) {
  const [uploadDirectory] = getDocumentStorageDirectories(env);
  fs.mkdirSync(uploadDirectory, { recursive: true });
  const publicUploadsDirectory = fs.realpathSync(path.resolve(__dirname, '../../uploads'));
  const actualUploadDirectory = fs.realpathSync(uploadDirectory);
  if (isPathInside(publicUploadsDirectory, actualUploadDirectory)) {
    throw new Error('Document upload storage must resolve outside the publicly served uploads directory');
  }
  return uploadDirectory;
}

async function resolveDocumentStoragePath(filePath, env = process.env) {
  if (typeof filePath !== 'string' || !filePath) return null;
  const candidate = path.resolve(filePath);

  for (const storageDirectory of getDocumentStorageDirectories(env)) {
    let realStorageDirectory;
    let realCandidate;
    try {
      [realStorageDirectory, realCandidate] = await Promise.all([
        fs.promises.realpath(storageDirectory),
        fs.promises.realpath(candidate),
      ]);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') continue;
      throw error;
    }

    const relativePath = path.relative(realStorageDirectory, realCandidate);
    if (
      relativePath
      && relativePath !== '..'
      && !relativePath.startsWith(`..${path.sep}`)
      && !path.isAbsolute(relativePath)
    ) {
      const stats = await fs.promises.stat(realCandidate);
      if (stats.isFile()) return realCandidate;
    }
  }
  return null;
}

function createDocumentUpload(options = {}) {
  const uploadDirectory = options.uploadDirectory || getUploadDirectory(options.env);
  const maximumFileSize = options.maximumFileSize || getMaximumFileSize(options.env);
  fs.mkdirSync(uploadDirectory, { recursive: true });

  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, callback) => callback(null, uploadDirectory),
      filename: (_req, file, callback) => {
        callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
      },
    }),
    limits: { fileSize: maximumFileSize, files: 1 },
    fileFilter: (_req, file, callback) => {
      if (!isSupportedUploadMetadata(file)) {
        const error = new Error('Unsupported file extension or MIME type');
        error.code = 'UNSUPPORTED_FILE_TYPE';
        return callback(error);
      }
      return callback(null, true);
    },
  });

  return (req, res, next) => {
    upload.single('file')(req, res, (uploadError) => {
      if (uploadError) {
        if (uploadError.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: `File exceeds the ${maximumFileSize} byte upload limit` });
        }
        if (uploadError.code === 'UNSUPPORTED_FILE_TYPE' || uploadError instanceof multer.MulterError) {
          return res.status(400).json({ error: uploadError.message });
        }
        return next(uploadError);
      }

      if (!req.file) return next();

      const extension = path.extname(req.file.originalname).toLowerCase();
      fs.promises.open(req.file.path, 'r')
        .then(async (fileHandle) => {
          try {
            const header = Buffer.alloc(4096);
            const { bytesRead } = await fileHandle.read(header, 0, header.length, 0);
            if (!matchesFileSignature(extension, header.subarray(0, bytesRead))) {
              const error = new Error('Uploaded file content does not match its declared file type');
              error.code = 'INVALID_FILE_SIGNATURE';
              throw error;
            }
          } finally {
            await fileHandle.close();
          }
        })
        .then(() => next())
        .catch(async (error) => {
          try {
            await fs.promises.unlink(req.file.path);
          } catch (cleanupError) {
            if (cleanupError.code !== 'ENOENT') {
              console.error('Failed to remove invalid uploaded file:', cleanupError);
            }
          }
          if (error.code === 'INVALID_FILE_SIGNATURE') {
            return res.status(400).json({ error: error.message });
          }
          return next(error);
        });
    });
  };
}

module.exports = {
  createDocumentUpload,
  getMaximumFileSize,
  getDocumentStorageDirectories,
  getUploadDirectory,
  isSupportedUploadMetadata,
  matchesFileSignature,
  resolveDocumentStoragePath,
};
