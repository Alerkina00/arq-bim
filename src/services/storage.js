'use strict';
const fs = require('fs');
const path = require('path');

const USE_R2 = !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID);

let _s3 = null;
function getS3() {
  if (_s3) return _s3;
  const { S3Client } = require('@aws-sdk/client-s3');
  _s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    }
  });
  return _s3;
}

const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');
if (!USE_R2 && !fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

async function uploadFile(buffer, fileName) {
  if (USE_R2) {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    await getS3().send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: buffer
    }));
    return fileName;
  }
  fs.writeFileSync(path.join(UPLOAD_DIR, fileName), buffer);
  return fileName;
}

async function getFileStream(fileKey) {
  if (USE_R2) {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const res = await getS3().send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: fileKey }));
    return res.Body;
  }
  return fs.createReadStream(path.join(UPLOAD_DIR, fileKey));
}

module.exports = { uploadFile, getFileStream };
