# 도서 API 개발 설명서 (카테고리/섹션 조회)

=> 카테고리 도서 조회와 카테고리 섹션 조회 API 문서

## BASE URL
- 로컬: `http://localhost:4000`
- 배포: `https://daedokdan-api.onrender.com`

## 최종 API 엔드포인트

| 기능 | 메서드 | 엔드포인트 |
|---|---|---|
| 단일 카테고리 도서 조회(저장 포함) | GET | `/api/books/category` |
| 카테고리 섹션 조회(신작/베스트) | GET | `/api/books/sections` |

---

## 1. 단일 카테고리 도서 조회
### 1-1. 개요
`categoryId`로 알라딘 카테고리 도서를 조회하고, `books` 테이블에 upsert 후 반환한다.

### 1-2. 요청
- Method: `GET`
- URL: `/api/books/category?categoryId=51391`

Query Params

| 이름 | 타입 | 필수 | 설명 |
|---|---|---|---|
| categoryId | number | ✅ | 알라딘 카테고리 ID |

### 1-3. Response
```json
{
  "success": true,
  "data": {
    "books": [
      {
        "id": "book-uuid",
        "isbn13": "9788925588735",
        "title": "프로젝트 헤일메리",
        "authors": ["앤디 위어 (지은이)", "강동혁 (옮긴이)"],
        "publisher": "알에이치코리아(RHK)",
        "published_date": "2021-05-04",
        "page_count": 0,
        "language": "ko",
        "categories": ["국내도서>소설/시/희곡>과학소설(SF)>외국 과학소설"],
        "thumbnail_url": "https://image.aladin.co.kr/...",
        "google_books_id": null,
        "created_at": "2026-03-24T00:00:00.000Z",
        "aladin_item_id": "270454373"
      }
    ]
  },
  "error": null
}
```

### 1-4. 필드 설명

상위 레벨

| 필드명 | 타입 | 설명 |
|---|---|---|
| success | boolean | 성공 여부 |
| data | object \| null | 성공 시 데이터 |
| error | string \| null | 실패 시 에러 메시지 |

`data.books[]` 구조

| 필드명 | 타입 | 설명 |
|---|---|---|
| id | string (uuid) | DB books.id |
| aladin_item_id | string | 알라딘 상품 ID (upsert 기준) |
| isbn13 | string \| null | ISBN13 |
| title | string | 도서명 |
| authors | string[] | 저자 목록 |
| publisher | string \| null | 출판사 |
| published_date | string \| null | 출간일 |
| page_count | number \| null | 페이지 수 |
| language | string \| null | 언어 |
| categories | string[] | 카테고리 |
| thumbnail_url | string \| null | 표지 URL |
| google_books_id | string \| null | 구글북스 ID |
| created_at | string | 생성 시각 |

---

## 2. 카테고리 섹션 조회 (신작/베스트)
### 2-1. 개요
카테고리 키(`novel`, `essay` 등)를 받아 내부 `CATEGORY_MAP`의 카테고리 ID들에 대해  
알라딘 `ItemNewAll` + `Bestseller`를 병렬 호출하여 섹션 형태로 반환한다.

### 2-2. 요청
- Method: `GET`
- URL: `/api/books/sections?category=essay`

Query Params

| 이름 | 타입 | 필수 | 설명 |
|---|---|---|---|
| category | string | ✅ | 카테고리 키 (`CATEGORY_MAP` 기준) |

### 2-3. Response
```json
{
  "success": true,
  "data": {
    "category": "시/에세이",
    "sections": [
      {
        "title": "시/에세이 신작",
        "books": [
          {
            "aladin_item_id": 388781354,
            "isbn13": "9791192628639",
            "title": "저항하는 독자",
            "authors": ["주디스 페털리 (지은이)", "임유진 (옮긴이)"],
            "publisher": "북튜브",
            "published_date": "2026-03-30",
            "page_count": 0,
            "language": "ko",
            "categories": ["국내도서>인문학>책읽기/글쓰기>책읽기"],
            "thumbnail_url": "https://image.aladin.co.kr/...",
            "google_books_id": null
          }
        ]
      },
      {
        "title": "시/에세이 베스트",
        "books": []
      }
    ]
  }
}
```

### 2-4. 필드 설명

상위 레벨

| 필드명 | 타입 | 설명 |
|---|---|---|
| success | boolean | 성공 여부 |
| data.category | string | 카테고리 한글명 |
| data.sections | array | 섹션 목록 |

`data.sections[]` 구조

| 필드명 | 타입 | 설명 |
|---|---|---|
| title | string | 섹션 제목 (`{카테고리명} 신작/베스트`) |
| books | array | 도서 목록 (섹션별 최대 20권) |

`books[]` 구조

| 필드명 | 타입 | 설명 |
|---|---|---|
| aladin_item_id | number \| string | 알라딘 상품 ID |
| isbn13 | string \| null | ISBN13 |
| title | string | 도서명 |
| authors | string[] | 저자 목록 |
| publisher | string \| null | 출판사 |
| published_date | string \| null | 출간일 |
| page_count | number \| null | 페이지 수 (없으면 0/NULL) |
| language | string | 언어 |
| categories | string[] | 카테고리 |
| thumbnail_url | string \| null | 표지 URL |
| google_books_id | string \| null | 구글북스 ID |

---

## 3. 에러 응답 규칙

공통 실패 형식
```json
{
  "success": false,
  "error": "error message"
}
```

대표 에러 케이스
- `400`: `categoryId`, `category` 누락 또는 잘못된 값
- `500`: 외부 API 호출 실패 / DB upsert 실패 / 서버 내부 에러

