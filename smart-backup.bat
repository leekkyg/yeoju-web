@echo off
chcp 65001 >nul
echo ========================================
echo 여주마켓 스마트 백업 스크립트
echo (node_modules, .next 제외)
echo ========================================
echo.

set TODAY=%date:~0,4%-%date:~5,2%-%date:~8,2%
set SOURCE=%cd%
set BACKUP=%SOURCE%-BACKUP-%TODAY%

echo 원본: %SOURCE%
echo 백업: %BACKUP%
echo.
echo 백업을 시작하시겠습니까?
pause

echo.
echo 📦 백업 중...
echo.

mkdir "%BACKUP%"

echo [1/10] app 폴더 복사...
xcopy "%SOURCE%\app" "%BACKUP%\app\" /E /I /H /Y >nul
echo ✅ app 완료

echo [2/10] components 폴더 복사...
xcopy "%SOURCE%\components" "%BACKUP%\components\" /E /I /H /Y >nul
echo ✅ components 완료

echo [3/10] contexts 폴더 복사...
if exist "%SOURCE%\contexts" (
    xcopy "%SOURCE%\contexts" "%BACKUP%\contexts\" /E /I /H /Y >nul
    echo ✅ contexts 완료
) else (
    echo ⏭️  contexts 없음
)

echo [4/10] lib 폴더 복사...
if exist "%SOURCE%\lib" (
    xcopy "%SOURCE%\lib" "%BACKUP%\lib\" /E /I /H /Y >nul
    echo ✅ lib 완료
) else (
    echo ⏭️  lib 없음
)

echo [5/10] public 폴더 복사...
if exist "%SOURCE%\public" (
    xcopy "%SOURCE%\public" "%BACKUP%\public\" /E /I /H /Y >nul
    echo ✅ public 완료
) else (
    echo ⏭️  public 없음
)

echo [6/10] package.json 복사...
copy "%SOURCE%\package.json" "%BACKUP%\" >nul
echo ✅ package.json 완료

echo [7/10] package-lock.json 복사...
if exist "%SOURCE%\package-lock.json" (
    copy "%SOURCE%\package-lock.json" "%BACKUP%\" >nul
    echo ✅ package-lock.json 완료
)

echo [8/10] next.config.js 복사...
if exist "%SOURCE%\next.config.js" (
    copy "%SOURCE%\next.config.js" "%BACKUP%\" >nul
    echo ✅ next.config.js 완료
) else if exist "%SOURCE%\next.config.mjs" (
    copy "%SOURCE%\next.config.mjs" "%BACKUP%\" >nul
    echo ✅ next.config.mjs 완료
)

echo [9/10] tsconfig.json 복사...
if exist "%SOURCE%\tsconfig.json" (
    copy "%SOURCE%\tsconfig.json" "%BACKUP%\" >nul
    echo ✅ tsconfig.json 완료
)

echo [10/10] tailwind.config.ts 복사...
if exist "%SOURCE%\tailwind.config.ts" (
    copy "%SOURCE%\tailwind.config.ts" "%BACKUP%\" >nul
    echo ✅ tailwind.config.ts 완료
) else if exist "%SOURCE%\tailwind.config.js" (
    copy "%SOURCE%\tailwind.config.js" "%BACKUP%\" >nul
    echo ✅ tailwind.config.js 완료
)

echo.
echo 🔒 환경 변수 파일 복사...
if exist "%SOURCE%\.env.local" (
    copy "%SOURCE%\.env.local" "%BACKUP%\" >nul
    echo ✅ .env.local 완료
)

if exist "%SOURCE%\.env" (
    copy "%SOURCE%\.env" "%BACKUP%\" >nul
    echo ✅ .env 완료
)

echo.
echo ========================================
echo ✅ 백업 완료!
echo ========================================
echo.
echo 백업 위치: %BACKUP%
echo.
echo ❌ 제외된 폴더:
echo   - node_modules (400MB+)
echo   - .next (빌드 캐시)
echo.
echo 📝 복원 방법:
echo   1. 백업 폴더를 원하는 위치에 복사
echo   2. cd [백업폴더]
echo   3. npm install (node_modules 생성)
echo   4. npm run dev (또는 npm run build)
echo.
pause
