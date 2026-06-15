// ────────────────────────────────────────────────
//  리더스 합동 법무사 — 개인회생 진단 리드 수집기
//  Google Apps Script (시트 웹훅)
// ────────────────────────────────────────────────

// 1) 이 파일을 복사해서 Apps Script 편집기에 붙여넣기
// 2) [배포] → [새 배포] → 유형: 웹 앱
//    - 실행 계정: 나(본인)
//    - 액세스 권한: 모든 사용자(익명 포함)
// 3) 배포 후 나오는 URL을 diagnosis.html 의 SHEET_WEBHOOK_URL 에 붙여넣기

const SHEET_NAME = "리드";   // 시트 탭 이름 (없으면 자동 생성)

function doPost(e) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let   sheet = ss.getSheetByName(SHEET_NAME);

    // 시트가 없으면 새로 만들고 헤더 추가
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        "수집시간", "연락처",
        "주요걱정", "연체상태", "총채무액", "직업",
        "월소득", "부양가족", "거주형태", "차량보유",
        "최근대출", "채무원인", "보험여부", "압류상태", "연령대",
        "예상변제금범위", "진단점수"
      ]);
      // 헤더 스타일
      sheet.getRange(1, 1, 1, 17)
        .setBackground("#0f172a")
        .setFontColor("#c5a059")
        .setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    const body = e.postData ? e.postData.contents : (e.parameter ? JSON.stringify(e.parameter) : "{}");
    const d = JSON.parse(body);

    sheet.appendRow([
      d.timestamp       || "",
      d.phone           || "",
      d.mainConcern     || "",
      d.arrears         || "",
      d.debtAmount      || "",
      d.job             || "",
      d.monthlyIncome   || "",
      d.dependents      || "",
      d.residence       || "",
      d.hasCar          || "",
      d.recentLoan      || "",
      d.debtReason      || "",
      d.insurance       || "",
      d.seizureStatus   || "",
      d.age             || "",
      d.repaymentRange  || "",
      d.score           || ""
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// GET 요청으로 동작 확인용
function doGet() {
  return ContentService
    .createTextOutput("리더스 법무사 웹훅 정상 작동 중")
    .setMimeType(ContentService.MimeType.TEXT);
}
