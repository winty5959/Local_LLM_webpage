import { useEffect, useMemo, useRef, useState } from 'react';

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const SKIP_RELOAD_OVERLAY_ONCE_KEY = 'skip_reload_overlay_once';

function Header({ onReset, isResetting }) {
  return (
    <header className="chat-header">
      <button className="header-title" type="button" onClick={onReset} title="새로고침">
        <span className="brand-dot" />
        <h1>KT-Open 테넌트 Chat bot</h1>
      </button>
      <div className="header-meta">Ollama-local LLM</div>
      {isResetting ? <span className="reset-pulse" aria-hidden="true" /> : null}
    </header>
  );
}

function Bubble({ role, content, streaming }) {
  return (
    <div className={`bubble-row ${role}`}>
      <div className={`bubble ${streaming ? 'streaming' : ''}`}>
        {content}
        {streaming ? <span className="cursor" /> : null}
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]); // {id, role, content}
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const textareaRef = useRef(null);
  const isComposingRef = useRef(false);
  const abortRef = useRef(null);
  const bottomRef = useRef(null);

  const apiMessages = useMemo(
    () => messages.map((m) => ({ role: m.role, content: m.content })),
    [messages]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isStreaming]);

  // 브라우저 "새로고침"으로 진입한 경우에만, 로드 직후 리프레시 UX를 잠깐 표시
  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    let navType;
    try {
      navType = performance?.getEntriesByType?.('navigation')?.[0]?.type;
    } catch {
      navType = undefined;
    }

    // legacy fallback
    if (!navType && typeof performance?.navigation?.type === 'number') {
      // 1 === TYPE_RELOAD
      navType = performance.navigation.type === 1 ? 'reload' : 'navigate';
    }

    if (navType !== 'reload') return;

    // 헤더 클릭으로 이미 "리로드 직전" 오버레이를 보여줬다면, 리로드 후 오버레이는 1회 스킵
    try {
      const skip = window.sessionStorage?.getItem(SKIP_RELOAD_OVERLAY_ONCE_KEY);
      if (skip) {
        window.sessionStorage?.removeItem(SKIP_RELOAD_OVERLAY_ONCE_KEY);
        return;
      }
    } catch {
      // ignore
    }

    setIsResetting(true);
    const showMs = reduceMotion ? 0 : 480;
    const t = window.setTimeout(() => setIsResetting(false), showMs);
    return () => window.clearTimeout(t);
  }, []);

  async function send() {
    // IME(한글 등) 조합 중 Enter 전송 시 마지막 글자가 onChange로 늦게 들어와 남는 현상 방지
    if (isComposingRef.current) return;

    const raw = textareaRef.current?.value ?? input;
    const text = raw.trim();
    if (!text || isStreaming) return;

    const userMsg = { id: uid(), role: 'user', content: text };
    const assistantMsg = { id: uid(), role: 'assistant', content: '' };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...apiMessages, { role: 'user', content: text }] }),
        signal: controller.signal
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const eventBlock = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          // parse SSE block
          const lines = eventBlock.split('\n');
          let event = 'message';
          let data = '';
          for (const line of lines) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            if (line.startsWith('data:')) data += line.slice(5).trim();
          }

          if (!data) continue;
          const payload = JSON.parse(data);

          if (event === 'done') {
            setIsStreaming(false);
            abortRef.current = null;
            return;
          }

          const delta = payload?.delta ?? '';
          if (delta) {
            setMessages((prev) => {
              const next = [...prev];
              for (let i = next.length - 1; i >= 0; i--) {
                if (next[i].role === 'assistant') {
                  next[i] = { ...next[i], content: next[i].content + delta };
                  break;
                }
              }
              return next;
            });
          }
        }
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      setMessages((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].role === 'assistant') {
            next[i] = { ...next[i], content: `오류: ${String(e?.message || e)}` };
            break;
          }
        }
        return next;
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      // IME 조합 중에는 Enter가 "조합 확정"에 쓰이므로 전송/preventDefault 하지 않음
      if (e.isComposing || isComposingRef.current) return;
      e.preventDefault();
      send();
    }
  }

  function onPrimaryAction() {
    if (isStreaming) return stop();

    // 조합 중 버튼 클릭 시, 먼저 조합을 확정(blur)한 다음 전송
    if (isComposingRef.current) {
      textareaRef.current?.blur();
      window.setTimeout(() => send(), 0);
      return;
    }

    send();
  }

  function stop() {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }

  function resetLikeRefresh() {
    // 실제 페이지 리로드 + 리로드 UX(오버레이) 제공
    stop();
    setIsResetting(true);

    // 즉시 리로드하면 효과가 보이지 않으므로 아주 짧게 딜레이
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const delayMs = reduceMotion ? 0 : 420;

    // 리로드 후 오버레이 중복 표시 방지(헤더 클릭의 경우엔 리로드 직전에 이미 오버레이를 보여줌)
    try {
      window.sessionStorage?.setItem(SKIP_RELOAD_OVERLAY_ONCE_KEY, '1');
    } catch {
      // ignore
    }

    // 혹시 리로드가 막히는 환경을 대비해 상태 초기화도 함께 수행
    setMessages([]);
    setInput('');

    // 다음 프레임에 오버레이를 렌더링한 뒤 리로드
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        window.location.reload();
      }, delayMs);
    });

    // 리로드 실패/취소 대비(드물지만) UX 복구
    window.setTimeout(() => setIsResetting(false), Math.max(delayMs + 1200, 1500));
  }

  return (
    <div className={`chat-shell ${isResetting ? 'chat-resetting' : ''}`}>
      <Header onReset={resetLikeRefresh} isResetting={isResetting} />

      <div className={`refresh-overlay ${isResetting ? 'is-visible' : ''}`} aria-hidden={!isResetting}>
        <div className="refresh-card" role="status" aria-live="polite">
          <svg className="refresh-spinner" viewBox="0 0 50 50" aria-hidden="true">
            <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="3" />
          </svg>
          <div className="refresh-text">
            <div className="title">새로고침 중…</div>
            <div className="subtitle">잠시만 기다려주세요</div>
          </div>
        </div>
      </div>

      <main className="chat-transcript">
        <div className="reset-veil" aria-hidden="true" />
        <div className="transcript-inner">
          {messages.map((m, idx) => (
            <Bubble
              key={m.id}
              role={m.role}
              content={m.content}
              streaming={isStreaming && m.role === 'assistant' && idx === messages.length - 1}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="chat-composer">
        <textarea
          ref={textareaRef}
          className="composer-input"
          rows={2}
          value={input}
          placeholder="메시지를 입력하세요…"
          onChange={(e) => setInput(e.target.value)}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={(e) => {
            isComposingRef.current = false;
            // 조합 확정 시점 값으로 동기화
            setInput(e.currentTarget.value);
          }}
          onKeyDown={onKeyDown}
          disabled={false}
        />
        <div className="composer-actions">
          <button
            className={`composer-primary ${isStreaming ? 'is-stop' : 'is-send'}`}
            onClick={onPrimaryAction}
            type="button"
            disabled={!isStreaming && !input.trim()}
          >
            {isStreaming ? 'Stop' : 'Send'}
          </button>
        </div>
      </footer>
    </div>
  );
}
