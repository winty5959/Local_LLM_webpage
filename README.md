# ollama_webpage

Docker Compose로 **React(UI) + Node.js(API 프록시) + Ollama(LLM)** 를 한 번에 실행하는 예제입니다.

## 요구사항
- Docker + Docker Compose v2
- (GPU 사용 시) Ubuntu 24.04에서 NVIDIA driver + nvidia-container-toolkit

## 실행
```bash
docker compose up -d --build
```

- 웹: http://localhost:3000
- Ollama API: http://localhost:11434 (선택적으로 노출)

## (Ubuntu) GPU 사용 참고
- **드라이버만 설치**하면 호스트에서 `nvidia-smi`는 동작하지만,
  **Docker 컨테이너가 GPU를 사용**하려면 `nvidia-container-toolkit` 설치 및 Docker 런타임 설정이 추가로 필요합니다.

### 빠른 설치(요약)
```bash
sudo apt-get update
sudo apt-get install -y curl ca-certificates gnupg

curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
  | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \
  | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
  | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list > /dev/null

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

### 동작 확인
```bash
docker run --rm --gpus all nvidia/cuda:12.3.2-base-ubuntu22.04 nvidia-smi
```
- NVIDIA CUDA Docker 이미지로 컨테이너를 생성하고, GPU 상태를 확인한 뒤 자동으로 삭제하는 명령어
  - nvidia/cuda:12.3.2-base-ubuntu22.04 이미지로 새 컨테이너 생성
  - 호스트의 모든 GPU를 컨테이너에 연결
  - 컨테이너 안에서 nvidia-smi 명령어 실행 (GPU 정보 출력)
  - 명령어 완료 후 컨테이너 자동 삭제

## 환경변수(.env 선택)
`compose.yaml`에 기본값이 있어 `.env` 없이도 동작합니다.

필요 시 아래를 참고해 `.env`를 만들 수 있습니다.
```bash
cp .env.example .env
```

## 커스텀 모델
- `ollama/Modelfile`을 수정하거나 교체한 뒤 재실행하면 됩니다.
- 모델명은 `OLLAMA_MODEL`로 관리하며 기본값은 `qwen3-custom` 입니다.

## 스트리밍
프론트는 `/api/chat/stream`(SSE)로 스트리밍을 받고,
서버가 Ollama의 `/api/chat` NDJSON 스트림을 SSE로 변환해 전달합니다.

## 새로고침 UX
- **헤더 타이틀 클릭**: 새로고침 오버레이를 잠깐 표시한 뒤 `window.location.reload()`로 **실제 페이지 리로드**를 수행합니다.
- **브라우저 새로고침(F5/⌘R)**: 최초 접속(navigate)에서는 표시하지 않고, **reload로 진입한 경우에만** 로드 직후 오버레이를 잠깐 표시합니다.
- 헤더 클릭으로 리로드하는 경우에는 리로드 직전/직후 오버레이가 중복 표시되지 않도록 1회 스킵 처리합니다.

---

## 변경 내역
- 마크다운 UX 추가
  - app/client/src/App.jsx
    - react-markdown + remark-gfm 적용
    - assistant 메시지만 마크다운 렌더링(유저 입력은 기존처럼 텍스트)
  - app/client/src/styles.css
    - 버블 내부 마크다운 요소(p/ul/ol/pre/code/table/...) 스타일 추가
  - app/client/package.json / app/client/package-lock.json
    - 의존성 추가: react-markdown, remark-gfm
- 다크모드/일반모드 토글 추가
  - 우상단 `Ollama-local LLM` 옆에 아이콘 버튼(달/해)으로 전환
  - (안드로이드/아이폰) 최초 진입은 기기 설정(`prefers-color-scheme`)을 따르고, 이후 사용자 선택은 localStorage로 유지
  - 초기 진입 시 라이트↔다크 깜빡임(FOUC) 방지를 위해 early theme 적용
- Node 서버에 스트리밍 엔드포인트 `/api/chat/stream`(SSE) 구현 및 스트리밍 안정화(연결 종료 처리)
  - 이전에 스트리밍이 안 나오던 원인은 클라이언트 연결 종료로 오인되어 Ollama 요청이 즉시 abort되던 버그였고, 이를 req.close → req.aborted / res.close로 수정해서 해결
- `localhost:3000` 접속 시 404 발생 문제 수정
  - 정적 파일 경로가 잘못되어 `/public/index.html`(루트 경로)를 찾다가 ENOENT가 발생하던 문제였고, Docker 이미지 내 빌드 산출물 경로(`/app/public`)를 가리키도록 수정
- 새로고침 UX 추가/개선
  - 헤더 타이틀 클릭 시 오버레이 표시 후 실제 리로드 수행
  - 브라우저 새로고침으로 진입한 경우에만 로드 직후 오버레이 표시(최초 접속은 제외)
  - 헤더 클릭 리로드 시 오버레이가 2번 뜨는 문제를 sessionStorage 플래그로 1회 스킵 처리
- 한글 IME 입력 시 Enter 전송 후 마지막 글자 잔류 버그 수정
  - Enter를 눌렀을 때, 마지막 글자(예: 요)가 아직 조합 확정 전이라 keydown에서 먼저 send()가 실행되고 setInput('')로 비워집니다.
  - 그 직후 IME가 조합을 확정하면서 onChange/onCompositionEnd가 마지막 글자를 다시 state에 써서 textarea에 마지막 글자만 남는 현상이 생깁니다.
  - 조합(composition) 중 Enter가 전송으로 처리되며 state가 꼬이던 문제로, `isComposing`/`compositionstart~end` 처리 및 textarea ref 기반 전송으로 해결
