const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { exec } = require('child_process');
const config = require('../src/config');

async function backup() {
  const outDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archivePath = path.join(outDir, `backup-${timestamp}.zip`);
  const output = fs.createWriteStream(archivePath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    console.log('Backup completed:', archivePath, archive.pointer(), 'bytes');
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);

  // 如果是 sqlite，备份 sqlite 文件
  if (config.database && config.database.url && config.database.url.startsWith('file:')) {
    const dbPath = config.database.url.replace(/^file:\/\//, '').replace(/^file:/, '');
    const resolved = path.resolve(path.join(__dirname, '..', dbPath));
    if (fs.existsSync(resolved)) {
      archive.file(resolved, { name: path.basename(resolved) });
    }
  }

  // 备份 uploads 目录
  const uploadsDir = config.storage && config.storage.localPath ? config.storage.localPath : path.join(__dirname, '..', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    archive.directory(uploadsDir, 'uploads');
  }

  await archive.finalize();
}

backup().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
