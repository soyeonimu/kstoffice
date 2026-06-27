/**
 * 리더스 합동 법무사 — 상담게시판 Google Apps Script
 *
 * [배포 방법]
 * 1. https://script.google.com 접속
 * 2. 새 프로젝트 생성 → 아래 코드 전체 붙여넣기
 * 3. 상단 [배포] → [새 배포] 클릭
 * 4. 유형: 웹 앱
 *    - 실행: 나
 *    - 액세스: 모든 사람
 * 5. 배포 완료 후 URL 복사
 * 6. board.html 상단 GAS_URL 변수에 붙여넣기
 *
 * [Google Sheet 설정]
 * - 스프레드시트 ID: 기존 시트 사용 또는 새로 생성
 * - 시트 이름: "상담게시판" (탭 이름)
 * - 1행(헤더): 번호 | 날짜 | 상담구분 | 이름 | 연락처 | 거주지역 | 총채무액 | 상담가능시간 | 제목 | 내용 | 상태
 */

// ══ 설정 ══
const SHEET_NAME = "상담게시판";
const SPREADSHEET_ID = "여기에_스프레드시트_ID_입력"; // URL에서 /d/XXXX/edit 부분

// ══ GET: 게시글 목록 반환 ══
function doGet(e) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    // 데이터 없음
    const cb = (e && e.parameter && e.parameter.callback) || "boardLoad";
    return ContentService
      .createTextOutput(cb + "([])")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  const headers = data[0];
  const rows = data.slice(1)
    .filter(row => row[0] !== "") // 빈 행 제거
    .reverse(); // 최신순

  const today = new Date();
  const todayStr = formatDate(today);

  const posts = rows.map(row => {
    const obj = {};
    headers.forEach((h, j) => obj[h] = row[j]);

    const postDate = formatDate(new Date(obj["날짜"]));
    return {
      id: obj["번호"],
      type: obj["상담구분"] || "",
      name: maskName(String(obj["이름"] || "")),
      date: postDate,
      title: obj["제목"] || "",
      preview: String(obj["내용"] || "").substring(0, 60),
      status: obj["상태"] || "접수완료",
      isNew: postDate === todayStr
    };
  });

  const cb = (e && e.parameter && e.parameter.callback) || "boardLoad";
  return ContentService
    .createTextOutput(cb + "(" + JSON.stringify(posts) + ")")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// ══ POST: 새 게시글 저장 ══
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);

    // 헤더 행 없으면 생성
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["번호","날짜","상담구분","이름","연락처","거주지역","총채무액","상담가능시간","제목","내용","상태"]);
    }

    const nextId = sheet.getLastRow(); // 헤더 포함 행 수 = 다음 ID

    sheet.appendRow([
      nextId,
      new Date(),
      data.type || "",
      data.name || "",
      data.phone || "",
      data.region || "",
      data.debtAmount ? data.debtAmount + "만원" : "",
      data.availableTime || "",
      data.title || "",
      data.content || "",
      "접수완료"
    ]);

    // 새 상담 알림 이메일 발송 (선택)
    // sendNotificationEmail(data, nextId);

    return ContentService
      .createTextOutput(JSON.stringify({success: true, id: nextId}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ══ 상태 변경 (관리자용 — 시트에서 직접 수정 가능) ══
// 시트에서 "상태" 열을 직접 "접수완료" / "검토중" / "답변완료" 로 변경하면 됨

// ══ 헬퍼 함수 ══
function maskName(name) {
  if (!name || name.length === 0) return "익명";
  if (name.length === 1) return name + "*";
  return name[0] + "*".repeat(Math.min(name.length - 1, 2));
}

function formatDate(d) {
  if (!d || isNaN(d.getTime())) return "";
  return d.getFullYear() + "."
    + String(d.getMonth() + 1).padStart(2, "0") + "."
    + String(d.getDate()).padStart(2, "0");
}

// ══ (선택) 새 상담 알림 이메일 ══
function sendNotificationEmail(data, id) {
  const recipient = "scatterfragrance@gmail.com";
  const subject = `[새 상담 신청] #${id} ${data.title}`;
  const body = `새 상담이 접수되었습니다.\n\n`
    + `구분: ${data.type}\n`
    + `이름: ${data.name}\n`
    + `연락처: ${data.phone}\n`
    + `지역: ${data.region}\n`
    + `채무액: ${data.debtAmount}만원\n`
    + `상담가능시간: ${data.availableTime}\n\n`
    + `제목: ${data.title}\n`
    + `내용: ${data.content}\n`;
  MailApp.sendEmail(recipient, subject, body);
}
