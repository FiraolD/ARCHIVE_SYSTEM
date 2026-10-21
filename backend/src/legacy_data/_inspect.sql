\echo '===== 1. DISTINCT BRANCH IN Claim TABLE ====='
SELECT DISTINCT branch, COUNT(*) AS cnt
FROM public."Claim"
GROUP BY branch
ORDER BY cnt DESC;

\echo ''
\echo '===== 2. FIRST 50 ROWS FROM branch TABLE ====='
SELECT branch FROM public.branch ORDER BY branch LIMIT 50;

\echo ''
\echo '===== 3. DISTINCT ACTIVITIES IN file_activity ====='
SELECT activity, COUNT(*) AS cnt
FROM public.file_activity
GROUP BY activity
ORDER BY cnt DESC;

\echo ''
\echo '===== 4. SAMPLE CLAIM ROWS (first 5) ====='
SELECT claim_no, name, plateno, branch, location, date_of_accident
FROM public."Claim"
LIMIT 5;

\echo ''
\echo '===== 5. DISTINCT FILE TYPES / LOCATIONS ====='
SELECT location, COUNT(*) AS cnt
FROM public."Claim"
GROUP BY location
ORDER BY cnt DESC
LIMIT 20;
