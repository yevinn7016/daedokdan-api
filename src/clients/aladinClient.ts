// src/clients/aladinClient.ts
import fetch from 'node-fetch';
import { config } from '../core/config';

const BASE_URL = 'https://www.aladin.co.kr/ttb/api';

/**
 * 알라딘 검색 API (ItemSearch)
 */
export async function searchBooksFromAladin(query: string, maxResults = 10) {
  if (!config.aladinTtbKey) {
    throw new Error('ALADIN_TTB_KEY is not set');
  }

  const url =
    `${BASE_URL}/ItemSearch.aspx?` +
    `TTBKey=${encodeURIComponent(config.aladinTtbKey)}` +
    `&Query=${encodeURIComponent(query)}` +
    `&QueryType=Title` +
    `&MaxResults=${maxResults}` +
    `&start=1` +
    `&SearchTarget=Book` +
    `&Output=JS` +
    `&Version=20131101`;

  console.log('🔍 [Aladin] ItemSearch URL:', url);

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    console.error('❌ [Aladin] ItemSearch error:', res.status, res.statusText, text);
    throw new Error(`Aladin API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data;
}

/**
 * 알라딘 상세 API (ItemLookUp)
 */
export async function getBookDetailFromAladin(itemId: string) {
  if (!config.aladinTtbKey) {
    throw new Error('ALADIN_TTB_KEY is not set');
  }

  const url =
    `${BASE_URL}/ItemLookUp.aspx?` +
    `TTBKey=${encodeURIComponent(config.aladinTtbKey)}` +
    `&ItemId=${encodeURIComponent(itemId)}` +
    `&ItemIdType=ItemId` +
    `&Output=JS` +
    `&Cover=Big` +
    `&Version=20131101`;

  console.log('📖 [Aladin] ItemLookUp URL:', url);

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    console.error('❌ [Aladin] ItemLookUp error:', res.status, res.statusText, text);
    throw new Error(`Aladin Detail error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data;
}
