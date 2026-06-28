/**
 * 리더스 합동 법무사 — 리드 통합 수집 스크립트
 * ─────────────────────────────────────────────
 * 배포 방법:
 *   1. script.google.com → 새 프로젝트 → 이 코드 전체 붙여넣기
 *   2. 배포 → 새 배포 → 유형: 웹앱
 *   3. 실행 계정: "나" / 액세스 권한: "모든 사용자 (익명 포함)"
 *   4. 배포 → 웹앱 URL 복사
 *   5. diagnosis.html의 LEAD_GAS_URL 상수에 붙여넣기
 *      (기존 submitRepayForm의 fetch URL도 같이 교체)
 *
 * 수집 시트: "리드" (없으면 자동 생성)
 */

const SHEET_NAME = "리드";

function doPost(e) {
  try {
    const raw  = e.postData ? e.postData.contents : "{}";
    const data = JSON.parse(raw);

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let sheet   = ss.getSheetByName(SHEET_NAME);

    // 시트 없으면 자동 생성 + 헤더
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        "수집일시", "이름", "연락처", "유입경로",
        "채무금액", "주요고민", "연체기간", "직업", "메모"
      ]);
      sheet.setFrozenRows(1);
      sheet.getRange("A1:I1").setBackground("#1a3055").setFontColor("#ffffff").setFontWeight("bold");
      sheet.setColumnWidth(1, 160);
      sheet.setColumnWidth(3, 130);
    }

    sheet.appendRow([
      new Date(),
      data.name         || "",
      data.phone        || "",
      data.source       || "",
      data.debtAmount   || "",
      data.mainConcern  || "",
      data.arrears      || "",
      data.job          || "",
      data.memo         || ""
    ]);

    return _ok({ status: "ok", message: "저장 완료" });

  } catch (err) {
    return _ok({ status: "error", message: err.message });
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput("리더스 법무사 리드 수집 서버 — 정상 작동 중")
    .setMimeType(ContentService.MimeType.TEXT);
}

function _ok(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
