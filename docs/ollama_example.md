사용방법

# 질문
```bash
time curl -X POST http://ip주소:포트/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-custom",
    "messages": [
      {
        "role": "user",
        "content": "/no_think KT는 어떤회사인가요?"
      }
    ],
    "stream": false
  }'
```

# 답변
```json
{"model":"qwen3-custom","created_at":"2026-02-04T08:26:49.573360641Z","message":{"role":"assistant","content":"KT(케이티)는 한국의 대표적인 통신기업으로, 1999년 설립된 **KT Corporation**입니다. 모바일 통신, 인터넷 서비스, 텔레비전 등 다양한 분야에서 활동하며 한국에서 가장 큰 통신사 중 하나로 알려져 있습니다. \n\n추가로 궁금한 점이 있다면 언제든지 알려주세요! 😊","thinking":"Okay, the user is asking \"no_think KT는 어떤회사인가요?\" which translates to \"What company is KT?\" in Korean. Let me think.\n\nFirst, I need to confirm what KT is. In South Korea, KT is a major telecommunications company. The full name is KT Corporation. They are one of the leading telecom providers in South Korea, similar to SK Telecom (SKT) and LG U+.\n\nWait, the user wrote \"no_think\" before the question. Maybe that's a typo or part of the query. Let me check. The user might have meant to type something else, but the main question is about KT.\n\nI should respond in Korean since the user's question is in Korean. Let me make sure to use proper Korean terms.\n\nKT Corporation is a South Korean multinational telecommunications company. They provide mobile, internet, and TV services. They were founded in 1999, I think. Their headquarters are in Seoul.\n\nI should structure the answer clearly. Start by stating that KT is a major telecom company in South Korea, mention their services, maybe their history, and if there's any confusion with other companies.\n\nWait, the user wrote \"no_think\" which might be a mistake. Maybe they meant \"No think\" as in not to think, but in the context, it's probably a typo. Since the user is asking about KT, I'll focus on that.\n\nSo, the answer should be in Korean, friendly and helpful.\n\nLet me draft it: \"KT(케이티)는 한국의 대표적인 통신기업으로, 1999년 설립된 KT Corporation입니다. 모바일, 인터넷, 텔레비전 서비스를 제공하며, 한국에서 가장 큰 통신사 중 하나입니다. 추가로 궁금한 사항이 있다면 알려주세요!\"\n\nWait, but I should check if KT is the correct company. Yes, KT is a major telecom in South Korea. Sometimes people confuse it with SK Telecom (SKT), but KT is a separate company.\n\nAlso, the user might have meant \"no_think\" as a prefix, but since it's in the query, maybe they just want a quick answer without thinking. But I should answer the question as is.\n\nI think that's correct. Let me make sure the company name is right. KT Corporation is indeed a South Korean company, established in 1. 1999, and they operate in mobile, internet, and TV.\n\nYes, so the answer in Korean should be accurate.\n"},"done":true,"done_reason":"stop","total_duration":31256522890,"load_duration":75834423,"prompt_eval_count":70,"prompt_eval_duration":105457717,"eval_count":622,"eval_duration":30889122299}curl -X POST http://ip주소:포트/api/chat -H  -d   0.01s user 0.01s system 0% cpu 31.324 total
```