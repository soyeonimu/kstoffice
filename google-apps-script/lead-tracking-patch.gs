/**
 * 상담 폼 유입 추적 패치 — 배포된 두 Apps Script에 각각 추가
 * ─────────────────────────────────────────────
 * ① 리드 수집 스크립트 (…AKfycbxLHMOg…/exec · 시트 '리드')
 *    홈·연락처·푸터·플로팅 폼. doPost 안 sh.appendRow([...]) 다음 줄에:
 *        ksTrack_(sh, e);
 *
 * ② 상담 게시판 스크립트 (…AKfycbzcn7…/exec · 시트 '상담문의')
 *    /inquiry/ 글쓰기. saveInquiry 안 sh.appendRow([...]) 다음 줄에:
 *        ksTrackRow_(sh, data);
 *    (게시판 목록·상세는 A~L열만 읽으므로 추적 열은 공개되지 않음)
 *
 * 공통: 아래 두 함수를 스크립트 맨 아래에 붙여넣고
 *       배포 → 배포 관리 → 기존 배포 '수정' → 버전: 새 버전 → 배포
 *       (새 배포를 만들면 URL이 바뀌어 사이트 폼이 끊김)
 *
 * 동작: 헤더 행에 추적 열이 없으면 오른쪽 끝에 만들고, 방금 추가된 행에 값을 채운다.
 *       기존 열·기존 로직은 건드리지 않는다.
 */
function ksTrack_(sheet, e) {
  var d = (e && e.parameter) || {};
  // no-cors 전송은 Content-Type이 text/plain으로 바뀌므로 타입과 무관하게 JSON 파싱을 시도
  if (!d.page && e && e.postData && e.postData.contents) {
    try { d = JSON.parse(e.postData.contents); } catch (err) {}
  }
  ksTrackRow_(sheet, d);
}

function ksTrackRow_(sheet, d) {
  try {
    if (!d || !d.page) return; // 추적값이 없는 요청(구버전 폼 등)은 건너뜀
    var FIELDS = [
      ['page', '제출페이지'], ['pageTitle', '제출페이지제목'], ['prevPage', '직전페이지'],
      ['landingPage', '최초유입페이지'], ['firstReferrer', '최초리퍼러'], ['firstVisit', '최초방문일시'],
      ['utmSource', 'utm_source'], ['utmMedium', 'utm_medium'], ['utmCampaign', 'utm_campaign'],
      ['utmTerm', 'utm_term'], ['utmContent', 'utm_content']
    ];
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
    console.error('ksTrackRow_ 실패: ' + err);
  }
}
