/* 리더스 공용 템플릿 스크립트 (leaders-*)
   - 배타 아코디언: .leaders-faq-item(details) 하나가 열리면 나머지는 닫힘
   ※ js-reveal(스크롤 페이드인)은 default 레이아웃의 전역 스크립트가 이미 처리함.
   해당 요소가 없는 페이지에서도 안전(빈 NodeList). */
document.addEventListener('DOMContentLoaded', () => {
  const items = document.querySelectorAll('.leaders-faq-item');
  items.forEach((target) => {
    target.addEventListener('click', () => {
      items.forEach((el) => { if (el !== target) el.removeAttribute('open'); });
    });
  });
});
