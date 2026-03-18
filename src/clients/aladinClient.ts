// src/clients/aladinClient.ts
import fetch from 'node-fetch';
import 'dotenv/config';

const ALADIN_TTB_KEY = process.env.ALADIN_TTB_KEY ?? '';
const BASE_URL = 'https://www.aladin.co.kr/ttb/api';

if (!ALADIN_TTB_KEY) {
  console.warn('⚠️ ALADIN_TTB_KEY 가 .env 에 설정되지 않았습니다.');
}

export async function searchBooksFromAladin(q: string, maxResults = 10) {
  const url = new URL(`${BASE_URL}/ItemSearch.aspx`);
  url.searchParams.set('TTBKey', ALADIN_TTB_KEY);
  url.searchParams.set('Query', q);
  url.searchParams.set('QueryType', 'Keyword'); // 제목+저자+출판사 등 통합 검색
  url.searchParams.set('MaxResults', String(maxResults));
  url.searchParams.set('SearchTarget', 'Book');
  url.searchParams.set('Output', 'JS');
  url.searchParams.set('Cover', 'Big');
  url.searchParams.set('Version', '20131101');

  console.log('🔍 [Aladin] ItemSearch URL:', url.toString());

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    console.error('[Aladin] search error:', res.status, res.statusText, text);
    throw new Error('Aladin search failed');
  }

  const data = (await res.json()) as any;
  return data;
}

// src/clients/aladinClient.ts
export async function getBookDetailFromAladin(id: string) {
  const TTBKey = process.env.ALADIN_TTB_KEY ?? '';

  // ✅ 13자리 숫자면 ISBN13, 아니면 상품번호(ItemId)로 가정
  const isIsbn13 = /^\d{13}$/.test(id);

  const params = new URLSearchParams({
    TTBKey,
    ItemId: id,
    ItemIdType: isIsbn13 ? 'ISBN13' : 'ItemId',
    Output: 'JS',
    Cover: 'Big',
    Version: '20131101',
  });

  const url = `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?${params.toString()}`;
  console.log('📖 [Aladin] ItemLookUp URL:', url);

  const res = await fetch(url);
  const data = await res.json();
  return data;
}

// ✅ 신규: ISBN13 전용
export async function getBookDetailByIsbnFromAladin(isbn13: string) {
  const params = new URLSearchParams({
    TTBKey: process.env.ALADIN_TTB_KEY ?? '',
    ItemId: isbn13,
    ItemIdType: 'ISBN13',   // ✅ 여기 다름
    Output: 'JS',
    Cover: 'Big',
    Version: '20131101',
  });

  const url = `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?${params.toString()}`;
  console.log('📖 [Aladin] ItemLookUp(ISBN13) URL:', url);

  const res = await fetch(url);
  const data = await res.json();
  return data;
}
// src/clients/aladinClient.ts



// src/clients/aladinClient.ts
// src/clients/aladinClient.ts

import axios from "axios";
import { parseStringPromise } from "xml2js";
import { config } from "../core/config";

// 🔥 베스트셀러 (랭킹용)
export async function fetchBestSellers() {
  const url = "https://www.aladin.co.kr/ttb/api/ItemList.aspx";

  const res = await axios.get(url, {
    params: {
      TTBKey: config.aladinTtbKey,
      QueryType: "Bestseller",
      MaxResults: 10,
      start: 1,
      SearchTarget: "Book",
      Output: "XML",
      Version: "20131101",
    },
    headers: {
      "User-Agent": "Mozilla/5.0", // 🔥 핵심
    },
    responseType: "text",
  });

  console.log("🔥 raw XML:", res.data);

  const parsed = await parseStringPromise(res.data);

  console.log("🔥 parsed:", parsed);

  return parsed?.object?.item ?? [];
}