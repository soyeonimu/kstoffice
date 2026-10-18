/**
 * 상담 폼 유입 추적 패치 — 실제 배포된 리드 수집 스크립트에 추가
 * ─────────────────────────────────────────────
 * 적용 방법:
 *   1. 사이트 폼이 전송하는 웹앱(…AKfycbxLHMOg…/exec)의 Apps Script 편집기를 연다
 *   2. 이 파일의 ksTrack_ 함수를 통째로 맨 아래에 붙여넣는다
 *   3. doPost 안에서 sheet.appendRow([...]) 바로 다음 줄에 추가:
 *        ksTrack_(sheet, e);
 *   4. 배포 → 배포 관리 → 기존 배포 '수정' → 버전: 새 버전 → 배포
 *      (새 배포를 만들면 URL이 바뀌므로 반드시 '기존 배포 수정')
 *
 * 동작: 헤더 행에 아래 열이 없으면 오른쪽 끝에 만들고, 방금 추가된 행에 값을 채운다.
 *       기존 열·기존 로직은 건드리지 않는다.
 */
function ksTrack_(sheet, e) {
  try {
    var FIELDS = [
      ['page', '제출페이지'], ['pageTitle', '제출페이지제목'],
      ['landingPage', '최초유입페이지'], ['firstReferrer', '최초리퍼러'], ['firstVisit', '최초방문일시'],
      ['utmSource', 'utm_source'], ['utmMedium', 'utm_medium'], ['utmCampaign', 'utm_campaign'],
      ['utmTerm', 'utm_term'], ['utmContent', 'utm_content']
    ];
    var d = (e && e.parameter) || {};
    if (!d.page && e && e.postData && /json/.test(e.postData.type || '')) {
      try { d = JSON.parse(e.postData.contents); } catch (err) {}
    }
    if (!d.page) return; // 추적값이 없는 요청(구버전 폼 등)은 건너뜀

    var lastCol = Math.max(sheet.getLastColumn(), 1);
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var row = sheet.getLastRow();
    FIELDS.forEach(function (f) {
      var col = headers.indexOf(f[1]) + 1;
      if (!col) {
        col = headers.length + 1;
        sheet.getRange(1, col).setValue(f[1]).setFontWeight('bold');
        headers.push(f[1]);
      }
      sheet.getRange(row, col).setValue(d[f[0]] || '');
    });
  } catch (err) {
    console.error('ksTrack_ 실패: ' + err);
  }
}
