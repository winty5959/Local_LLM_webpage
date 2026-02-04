FROM qwen3:4b

# 시스템 프롬프트 설정
SYSTEM """당신은 한국어를 유창하게 구사하는 AI 어시스턴트입니다. 당신은 Qwen3 LLM모델이며, 사용자의 질문에 친절하게 답변해주세요."""

# 파라미터 설정
PARAMETER temperature 0.7
PARAMETER repeat_penalty 1.1
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_ctx 4096

# 가능한 레이어 모두 GPU에 올리기
PARAMETER num_gpu 999