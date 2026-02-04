import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://ollama:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3-custom';
const OLLAMA_REQUEST_KEEP_ALIVE = process.env.OLLAMA_REQUEST_KEEP_ALIVE || '300m';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/healthz', (_req, res) => res.json({ ok: true }));

// Ollama NDJSON stream -> SSE
app.post('/api/chat/stream', async (req, res) => {
  const { messages } = req.body || {};
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: 'messages must be an array' });
    return;
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  // nginx 등 프록시 버퍼링 방지용 (없어도 무방)
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  // 일부 클라이언트/프록시에서 "첫 바이트"가 필요할 수 있어 주석 이벤트로 즉시 flush
  res.write(': connected\n\n');

  const abort = new AbortController();
  // 클라이언트 연결이 끊기면 Ollama 요청도 중단
  req.on('aborted', () => abort.abort());
  res.on('close', () => abort.abort());

  try {
    const ollamaRes = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: true,
        keep_alive: OLLAMA_REQUEST_KEEP_ALIVE
      }),
      signal: abort.signal
    });

    if (!ollamaRes.ok || !ollamaRes.body) {
      const text = await ollamaRes.text().catch(() => '');
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'ollama_error', status: ollamaRes.status, text })}\n\n`);
      res.end();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    // Node의 fetch()는 Web ReadableStream을 반환하므로 getReader()로 읽습니다.
    const reader = ollamaRes.body.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;

        let obj;
        try {
          obj = JSON.parse(line);
        } catch {
          continue;
        }

        const delta = obj?.message?.content ?? '';
        if (delta) {
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }

        if (obj?.done) {
          res.write(`event: done\ndata: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
          return;
        }
      }
    }

    // stream ended unexpectedly
    res.write(`event: done\ndata: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    if (abort.signal.aborted) return;
    res.write(`event: error\ndata: ${JSON.stringify({ error: 'server_error', message: String(err?.message || err) })}\n\n`);
    res.end();
  }
});

// Serve React build
// Dockerfile에서 빌드 산출물을 /app/public 에 복사합니다.
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.get('*', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`server listening on :${PORT}`);
});
