@echo off
cd /d "C:\Users\김소연\Desktop\site"
echo === Lock 파일 제거 ===
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
echo === Git 커밋 ===
git commit -m "긴급: default.html 복원 (흰화면 수정)"
echo === Git Push ===
git push origin main
echo.
echo === 완료! ===
pause
