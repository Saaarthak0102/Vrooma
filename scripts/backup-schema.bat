@echo off
REM ==============================================================================
REM VROOMA DATABASE SCHEMA & SEED BACKUP SCRIPT (Windows)
REM Dumps full public/private schemas, RLS policies, functions and seed data.
REM ==============================================================================

setlocal enabledelayedexpansion

set BACKUP_DIR=supabase\backups
set PROJECT_ID=%SUPABASE_PROJECT_ID%
if "%PROJECT_ID%"=="" set PROJECT_ID=eobtzcwinjmimzisypca

REM Format timestamp YYYYMMDD_HHMMSS
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set dt=%%I
set TIMESTAMP=%dt:~0,8%_%dt:~8,6%

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo ==========================================
echo  Starting Vrooma Database Backup (Windows)
echo  Target Project: %PROJECT_ID%
echo  Timestamp:      %TIMESTAMP%
echo ==========================================

set SCHEMA_FILE=%BACKUP_DIR%\schema_%TIMESTAMP%.sql
set DATA_FILE=%BACKUP_DIR%\data_%TIMESTAMP%.sql

where supabase >nul 2>nul
if %ERRORLEVEL% equ 0 (
  echo --^> Dumping schema via Supabase CLI...
  call supabase db dump --project-ref %PROJECT_ID% --schema public,private -f "%SCHEMA_FILE%"

  echo --^> Dumping catalog seed data...
  call supabase db dump --project-ref %PROJECT_ID% --data-only --use-copy -f "%DATA_FILE%"

  echo Backup completed successfully in %BACKUP_DIR%.
  dir "%BACKUP_DIR%\*%TIMESTAMP%*"
) else (
  if not "%DATABASE_URL%"=="" (
    echo --^> Dumping schema via pg_dump using DATABASE_URL...
    pg_dump "%DATABASE_URL%" --schema=public --schema=private --schema-only --no-owner --no-privileges -f "%SCHEMA_FILE%"
    echo Schema backup created: %SCHEMA_FILE%
  ) else (
    echo [ERROR] Neither 'supabase' CLI nor 'DATABASE_URL' is available.
    echo Please install Supabase CLI or set DATABASE_URL in your environment.
    exit /b 1
  )
)

echo ==========================================
echo  Database Backup Completed Successfully
echo ==========================================
endlocal

