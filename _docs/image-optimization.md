# 이미지 최적화 기록

## 1차 — 시범 적용 (2026-10-27, 커밋 89db038)
- 범위: 게시판 목록(/board/) + 조회 상위 3편(mortgage-cancellation-self, self-registration-guide, unpaid-loan-fraud-vs-civil)
- 방식: 원본 PNG/JPG 보존. scripts/optimize_images.py 로 assets/img/board/opt/(본문 ≤1200px, q82)·opt/thumb/(640px, q78) WebP 별도 생성.
  게시판 목록은 현재 페이지 카드만 썸네일 로드. 본문은 <picture>(WebP + 원본 fallback), width/height, 첫 이미지 eager·나머지 lazy.
- 변경 안 함: 원본 URL, OG 이미지, 구조화 데이터, 제목·설명·본문, 상담 UI, GA4

### 실측 (모바일 390px, Playwright, 이미지 전송량 — blog/measure-weight.js)
| 페이지 | 변경 전 (라이브) | 변경 후 (라이브) | 절감 |
|---|---|---|---|
| /board/ | 59,143KB (98장) | 346KB (12장) | 99.4% |
| 근저당 말소 셀프 | 5,204KB | 첫 화면 391KB / 끝까지 576KB | 89% |
| 셀프등기 | 2,436KB | 첫 화면 1,098KB / 끝까지 1,238KB | 49% |
| 빌려준 돈 | 5,220KB | 첫 화면 760KB / 끝까지 935KB | 82% |

- 남은 무게: 글 하단 '관련 글' 썸네일·홈 썸네일은 아직 원본 PNG(1차 범위 밖) → 2차에서 opt/thumb 적용 예정
- PageSpeed 점수: API 일일 한도 초과로 미측정 → pagespeed.web.dev 에서 수동 측정해 아래 기입
  - 변경 후 모바일 점수(/board/): __ · LCP __ · CLS __
  - 변경 후 모바일 점수(근저당): __ · LCP __ · CLS __

## 2차 — 전체 확대 (예정)
- _config.yml img_opt.all_posts: true, 관련 글·홈 카드 썸네일 WebP 적용
- 새 이미지 추가 시: python scripts/optimize_images.py 실행 후 커밋 (매니페스트에 없으면 원본 태그 그대로 출력됨)
