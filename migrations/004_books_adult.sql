-- books 테이블에 성인 도서 여부 컬럼 추가
ALTER TABLE books ADD COLUMN IF NOT EXISTS adult boolean NOT NULL DEFAULT false;
