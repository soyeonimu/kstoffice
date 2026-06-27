/**
 * 리더스 합동 법무사 - 상담 게시판 Google Apps Script
 *
 * [배포 방법]
 * 1. https://script.google.com 접속 → 새 프로젝트
 * 2. 아래 코드 전체 붙여넣기
 * 3. 배포 → 새 배포 → 웹 앱 → 액세스: 모든 사용자 → 배포
 * 4. 생성된 URL을 inquiry.html 의 GAS_URL 변수에 붙여넣기
 *
 * [스프레드시트 구조 - 자동 생성됨]
 * 열: ID | 날짜 | 구분 | 이름 | 전화번호 | 채무액 | 상담가능시간 | 비밀번호 | 제목 | 내용 | 상태 | 답변
 */

var SHEET_NAME = '상담문의';

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['ID','날짜','구분','이름','전화번호','채무액','상담가능시간','비밀번호','제목','내용','상태','답변']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function doGet(e) {
  var action = e.parameter.action || 'list';
  var callback = e.parameter.callback || '';
  var result;

  if (action === 'list') {
    result = getList();
  } else if (action === 'view') {
    result = getView(e.parameter.id, e.parameter.pw);
  } else {
    result = { error: 'unknown action' };
  }

  var json = JSON.stringify(result);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var data;
  try { data = JSON.parse(e.postData.contents); }
  catch(err) { data = {}; }

  if (data.action === 'write') {
    saveInquiry(data);
  }

  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== 목록 조회 (개인정보 마스킹) =====
function getList() {
  var sh = getSheet();
  var rows = sh.getDataRange().getValues();
  var result = [];

  for (var i = rows.length - 1; i >= 1; i--) {
    var r = rows[i];
    var name = String(r[3] || '');
    var masked = name.length > 0 ? name.charAt(0) + '**' : '익명';

    result.push({
      id:           r[0],
      date:         r[1] ? Utilities.formatDate(new Date(r[1]), 'Asia/Seoul', 'yyyy-MM-dd') : '',
      category:     r[2] || '',
      authorMasked: masked,
      title:        r[8] || '',
      status:       r[10] || '접수완료'
      // 전화번호·비밀번호·내용 절대 포함 안 함
    });
  }
  return result;
}

// ===== 개별 글 조회 (비밀번호 확인) =====
function getView(id, pw) {
  var sh = getSheet();
  var rows = sh.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (String(r[0]) === String(id)) {
      if (String(r[7]) !== String(pw)) {
        return { error: 'wrong_password' };
      }
      var name = String(r[3] || '');
      return {
        id:       r[0],
        category: r[2],
        authorMasked: name.charAt(0) + '**',
        debt:     r[5],
        time:     r[6],
        title:    r[8],
        content:  r[9],
        status:   r[10] || '접수완료',
        answer:   r[11] || ''
      };
    }
  }
  return { error: 'not_found' };
}

// ===== 새 문의 저장 =====
function saveInquiry(data) {
  var sh = getSheet();
  var rows = sh.getDataRange().getValues();

  // 다음 ID
  var nextId = 1;
  if (rows.length > 1) {
    var ids = rows.slice(1).map(function(r){ return Number(r[0])||0; });
    nextId = Math.max.apply(null, ids) + 1;
  }

  sh.appendRow([
    nextId,
    new Date(),
    data.category  || '',
    data.name      || '',
    data.phone     || '',
    data.debt      || '',
    data.time      || '',
    data.password  || '',
    data.title     || '',
    data.content   || '',
    '접수완료',
    ''
  ]);

  // 관리자 이메일 알림 (선택사항 — 이메일 주소 입력 시 활성화)
  // sendAlert(nextId, data);
}

// ===== 이메일 알림 (선택) =====
function sendAlert(id, data) {
  var email = 'YOUR_EMAIL@gmail.com'; // 여기에 이메일 입력
  MailApp.sendEmail({
    to: email,
    subject: '[상담게시판] 새 문의 #' + id + ': ' + (data.title||''),
    body: [
      '새 상담 문의가 접수되었습니다.',
      '',
      '번호: ' + id,
      '구분: ' + (data.category||''),
      '이름: ' + (data.name||''),
      '전화: ' + (data.phone||''),
      '채무액: ' + (data.debt||''),
      '상담시간: ' + (data.time||''),
      '',
      '제목: ' + (data.title||''),
      '내용:\n' + (data.content||''),
    ].join('\n')
  });
}
