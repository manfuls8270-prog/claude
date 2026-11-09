# 그록 커넥터 (Grok Connector for Claude)

Claude가 필요할 때 **그록(xAI Grok)** 에게 질문하거나, 그록의 **X(트위터)·웹 실시간 검색**을 쓰게 해주는 커넥터(MCP 서버)예요.

## 할 수 있는 일

| 기능 | 설명 | 이렇게 말해보세요 |
|---|---|---|
| `ask_grok` | 그록에게 질문하고 답을 받아와요 | "이 문제에 대해 그록 의견도 물어봐줘" |
| `grok_live_search` | 그록이 X·웹을 실시간으로 검색해서 요약해요 (출처 포함) | "오늘 삼성전자에 대한 X 반응을 그록으로 찾아줘" |

---

## 설치 방법 (Claude 데스크톱 앱 기준, 약 10분)

### 1단계. xAI API 키 받기
1. https://console.x.ai 에 접속해 로그인해요 (X 계정으로 가능해요).
2. **Billing** 메뉴에서 크레딧을 충전해요. API는 쓴 만큼 요금이 나가요.
3. **API Keys** 메뉴에서 새 키를 만들고 `xai-`로 시작하는 키를 복사해 둬요.
   > 이 키는 비밀번호와 같아요. 다른 사람에게 보여주지 마세요.

### 2단계. Node.js 설치
https://nodejs.org 에서 **LTS** 버전을 받아 설치해요. 설치 화면에서 "다음"만 누르면 돼요.

### 3단계. 커넥터 파일 받기
1. 이 저장소의 GitHub 페이지에서 초록색 **Code** 버튼을 누르고 **Download ZIP**을 눌러요.
2. 압축을 풀고, 안에 있는 `grok-connector` 폴더를 기억하기 쉬운 곳으로 옮겨요.
   - 예 (윈도우): `C:\grok-connector`
   - 예 (맥): `/Users/내이름/grok-connector`
3. 그 폴더에서 터미널을 열고 아래 명령을 한 번 실행해요.
   - 윈도우: 폴더 주소창에 `cmd` 입력 후 Enter
   - 맥: 폴더를 오른쪽 클릭한 뒤 "폴더에서 새로운 터미널"
   ```
   npm install
   ```

### 4단계. Claude 데스크톱 앱에 등록
1. Claude 데스크톱 앱에서 **설정 → 개발자(Developer) → 설정 편집(Edit Config)** 을 눌러요.
2. 열린 `claude_desktop_config.json` 파일에 아래 내용을 넣어요.
   `경로`와 `API 키`는 본인 것으로 바꿔요.

**윈도우 예시**
```json
{
  "mcpServers": {
    "grok": {
      "command": "node",
      "args": ["C:\\grok-connector\\server.js"],
      "env": {
        "XAI_API_KEY": "xai-여기에-본인-키"
      }
    }
  }
}
```

**맥 예시**
```json
{
  "mcpServers": {
    "grok": {
      "command": "node",
      "args": ["/Users/내이름/grok-connector/server.js"],
      "env": {
        "XAI_API_KEY": "xai-여기에-본인-키"
      }
    }
  }
}
```

> 파일에 이미 `"mcpServers"`가 있다면 그 안에 `"grok": { ... }` 부분만 쉼표로 이어서 추가해요.

3. Claude 앱을 **완전히 종료한 뒤 다시 실행**해요.
4. 채팅창의 도구(🔨 또는 커넥터) 메뉴에 `grok`이 보이면 연결된 거예요.

### (선택) Claude Code에서 쓰기
터미널에서 아래 명령 한 줄이면 돼요.
```
claude mcp add grok -e XAI_API_KEY=xai-본인키 -- node /경로/grok-connector/server.js
```

---

## 추가 설정 (선택)

`env` 안에 아래 항목을 더 넣을 수 있어요.

| 이름 | 기본값 | 설명 |
|---|---|---|
| `GROK_MODEL` | `grok-4` | 사용할 그록 모델. xAI 콘솔의 Models 메뉴에서 최신 이름을 확인해 바꿀 수 있어요 |
| `GROK_BASE_URL` | `https://api.x.ai/v1` | 보통은 바꿀 필요 없어요 |

## 문제가 생겼을 때

| 메시지 | 해결 방법 |
|---|---|
| `XAI_API_KEY가 설정되지 않았습니다` | 4단계 설정 파일에 키를 넣었는지 확인해요 |
| `401` / `403` | API 키가 틀렸어요. 다시 복사해서 넣어요 |
| `429` | 크레딧이 부족하거나 너무 자주 호출했어요. 충전 상태를 확인해요 |
| `404` (모델 이름) | `GROK_MODEL`을 xAI 콘솔에 있는 모델 이름으로 바꿔요 |
| 도구 목록에 grok이 안 보임 | 경로에 오타가 없는지 보고, Claude 앱을 완전히 껐다 켜요 |
