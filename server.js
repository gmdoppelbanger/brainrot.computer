import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.wasm': 'application/wasm',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.webm': 'video/webm'
};

const server = http.createServer((req, res) => {
  // Handle POST requests for saving voice samples
  if (req.method === 'POST' && req.url === '/save-sample') {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(body);
        const contentType = req.headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^\s;]+))/);
        const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]) : null;

        if (!boundary) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No boundary found' }));
          return;
        }

        const boundaryBuffer = Buffer.from('--' + boundary);
        let filename = '';
        let audioData = null;

        // Find parts by searching for boundary in buffer (preserves binary data)
        let pos = 0;
        while (pos < buffer.length) {
          const boundaryPos = buffer.indexOf(boundaryBuffer, pos);
          if (boundaryPos === -1) break;

          const partStart = boundaryPos + boundaryBuffer.length + 2; // Skip boundary + CRLF
          const nextBoundary = buffer.indexOf(boundaryBuffer, partStart);
          if (nextBoundary === -1) break;

          const partEnd = nextBoundary - 2; // Before CRLF
          const part = buffer.slice(partStart, partEnd);

          // Find header/body separator (double CRLF)
          const headerEnd = part.indexOf('\r\n\r\n');
          if (headerEnd === -1) { pos = nextBoundary; continue; }

          const headers = part.slice(0, headerEnd).toString();
          const bodyData = part.slice(headerEnd + 4);

          if (headers.includes('name="filename"')) {
            filename = bodyData.toString().trim();
          } else if (headers.includes('name="audio"')) {
            audioData = bodyData;
          }

          pos = nextBoundary;
        }

        if (filename && audioData && audioData.length > 0) {
          const samplesDir = path.join(__dirname, 'samples');
          if (!fs.existsSync(samplesDir)) fs.mkdirSync(samplesDir);
          fs.writeFileSync(path.join(samplesDir, filename), audioData);
          console.log(`Saved sample: ${filename} (${audioData.length} bytes)`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing data', filename: !!filename, audioLength: audioData?.length }));
        }
      } catch (err) {
        console.error('Save sample error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Decode URL-encoded characters (spaces, etc.)
  const decodedUrl = decodeURIComponent(req.url);
  let filePath = path.join(__dirname, decodedUrl === '/' ? 'index.html' : decodedUrl);

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found: ' + decodedUrl);
      return;
    }

    // For video files, support range requests (for seeking)
    if (ext === '.mp4' || ext === '.webm') {
      const fileSize = stats.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        const fileStream = fs.createReadStream(filePath, { start, end });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': contentType,
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Resource-Policy': 'same-origin'
        });
        fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Resource-Policy': 'same-origin'
        });
        fs.createReadStream(filePath).pipe(res);
      }
      return;
    }

    // For other files, read and send
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Server error: ' + err.message);
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Resource-Policy': 'same-origin'
      });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}/`);
  console.log('✅ SharedArrayBuffer + CORS headers enabled');
  console.log('✅ Video streaming with range requests supported');
});
