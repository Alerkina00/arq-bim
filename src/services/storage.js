'use strict';
const fs = require('fs');
const path = require('path');

const USE_R2 = !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID);
const UPLOAD_DIR = path.resolve(__dirname, '../../../uploads');

// Garantir que a pasta uploads existe
if (!USE_R2 && !fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log(`📁 Pasta de uploads criada: ${UPLOAD_DIR}`);
}

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

async function uploadFile(buffer, fileName) {
    if (USE_R2) {
        const { PutObjectCommand } = require('@aws-sdk/client-s3');
        await getS3().send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: 'application/octet-stream'
        }));
        console.log(`📤 Arquivo enviado para R2: ${fileName}`);
        return fileName;
    }
    
    const filePath = path.join(UPLOAD_DIR, fileName);
    fs.writeFileSync(filePath, buffer);
    console.log(`📤 Arquivo salvo localmente: ${filePath}`);
    return fileName;
}

async function getFileStream(fileKey) {
    if (USE_R2) {
        const { GetObjectCommand } = require('@aws-sdk/client-s3');
        const res = await getS3().send(new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey
        }));
        return res.Body;
    }
    
    const filePath = path.join(UPLOAD_DIR, fileKey);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${fileKey}`);
    }
    return fs.createReadStream(filePath);
}

async function deleteFile(fileKey) {
    if (USE_R2) {
        const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
        await getS3().send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey
        }));
        console.log(`🗑️ Arquivo removido do R2: ${fileKey}`);
        return;
    }
    
    const filePath = path.join(UPLOAD_DIR, fileKey);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Arquivo removido localmente: ${filePath}`);
    }
}

module.exports = { uploadFile, getFileStream, deleteFile };
