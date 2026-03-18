"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommendPortion = recommendPortion;
// src/services/recommendationService.ts
const db_1 = require("../core/db");
const userRepository_1 = require("../repositories/userRepository");
// 🔹 난이도 계수(D) 계산: 카테고리/장르 기반 초기 맵핑
function getDifficultyFactor(categories) {
    if (!categories || categories.length === 0) {
        return 1.0; // 기본값
    }
    const catStr = categories.join(' / '); // ex) "국내도서>소설>한국소설"
    if (catStr.includes('만화') || catStr.toLowerCase().includes('comic')) {
        return 1.3; // 만화
    }
    if (catStr.includes('시') || catStr.includes('시집')) {
        return 1.1; // 시집
    }
    if (catStr.includes('에세이')) {
        return 0.95; // 에세이
    }
    if (catStr.includes('인문') || catStr.includes('경제') || catStr.includes('경영')) {
        return 0.9; // 인문·경제
    }
    if (catStr.includes('학술') || catStr.includes('전문서') || catStr.includes('교재')) {
        return 0.8; // 학술/전문서
    }
    if (catStr.includes('소설')) {
        return 1.0; // 일반 소설
    }
    return 1.0; // fallback
}
// 🔹 여유 계수(ε) 계산: 최근 1주 reading_sessions 기반 자동 조정
async function getSlackFactor(userId) {
    const baseEpsilon = 0.9;
    const minEpsilon = 0.85;
    const maxEpsilon = 0.95;
    // 1) 최근 7일 기준 시간 계산
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    // 2) 최근 7일 간의 세션 데이터 가져오기
    const { data, error } = await db_1.supabase
        .from('reading_sessions')
        .select('planned_pages, actual_pages, started_at')
        .eq('user_id', userId)
        .gte('started_at', oneWeekAgo.toISOString());
    if (error) {
        console.error('[getSlackFactor] reading_sessions query error', error.message, error.details);
        return baseEpsilon;
    }
    if (!data || data.length === 0) {
        // 최근 세션이 없으면 기본값
        return baseEpsilon;
    }
    // 3) 유효한 세션만 필터링 (planned_pages > 0 && actual_pages not null)
    const validSessions = data.filter((s) => {
        const planned = s.planned_pages;
        const actual = s.actual_pages;
        return typeof planned === 'number' && planned > 0 && typeof actual === 'number';
    });
    if (validSessions.length < 3) {
        // 샘플이 너무 적으면 아직 조정하지 않음
        return baseEpsilon;
    }
    // 4) 계획 대비 실제 비율 평균 계산
    let sumRatio = 0;
    for (const s of validSessions) {
        const planned = s.planned_pages;
        const actual = s.actual_pages;
        const ratio = actual / planned;
        // 너무 이상한 값은 클램프 (0 ~ 2배 사이로)
        const clippedRatio = Math.max(0, Math.min(2, ratio));
        sumRatio += clippedRatio;
    }
    const avgRatio = sumRatio / validSessions.length;
    // 5) avgRatio에 따라 ε 조정
    let delta = 0;
    if (avgRatio < 0.8) {
        // 계획보다 항상 많이 못 채움 → 목표 완화
        delta = -0.03;
    }
    else if (avgRatio < 0.95) {
        // 살짝 부족 → 약간 완화
        delta = -0.01;
    }
    else if (avgRatio <= 1.05) {
        // 거의 딱 맞음 → 유지
        delta = 0;
    }
    else if (avgRatio <= 1.2) {
        // 살짝 초과 → 살짝 상향
        delta = 0.01;
    }
    else {
        // 많이 초과 → 좀 더 상향
        delta = 0.03;
    }
    let epsilon = baseEpsilon + delta;
    // 6) 0.85 ~ 0.95 범위로 클램프
    if (epsilon < minEpsilon)
        epsilon = minEpsilon;
    if (epsilon > maxEpsilon)
        epsilon = maxEpsilon;
    return epsilon;
}
/**
 * 분량 추천 핵심 서비스 (정식 산정식 버전)
 *
 * N = T_eff × PPM × D × ε
 */
async function recommendPortion({ userId, bookId, availableMinutes, }) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    if (availableMinutes <= 0) {
        throw new Error('availableMinutes must be > 0');
    }
    // 1) user_books + books 조인해서 현재 진행 상황 + 전체 페이지 수 + 카테고리 가져오기
    const { data: row, error } = await db_1.supabase
        .from('user_books')
        .select(`
      id,
      status,
      start_page,
      current_page,
      end_page,
      books:book_id (
        id,
        title,
        authors,
        thumbnail_url,
        page_count,
        categories
      )
    `)
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .maybeSingle();
    if (error) {
        console.error('[recommendPortion] user_books query error', error.message, error.details, error.hint);
        throw new Error('failed to load user_book');
    }
    if (!row) {
        throw new Error('user_book not found for this user/book');
    }
    const r = row;
    const pageCount = (_c = (_a = r.end_page) !== null && _a !== void 0 ? _a : (_b = r.books) === null || _b === void 0 ? void 0 : _b.page_count) !== null && _c !== void 0 ? _c : null;
    if (!pageCount || pageCount <= 0) {
        throw new Error('pageCount is not available for this book');
    }
    const currentPage = (_d = r.current_page) !== null && _d !== void 0 ? _d : 0;
    const title = (_f = (_e = r.books) === null || _e === void 0 ? void 0 : _e.title) !== null && _f !== void 0 ? _f : '제목 없음';
    // 이미 완독 상태인지 체크
    const isAlreadyCompleted = currentPage >= pageCount;
    // 2) 사용자 기본 PPM 가져오기 (없으면 기본값 사용)
    const basePpm = await (0, userRepository_1.getUserBasePpm)(userId);
    const usedPpm = basePpm && basePpm > 0 ? basePpm : 0.8; // 기본 0.8 페이지/분
    // 3) 난이도 계수(D) & 여유 계수(ε) 계산
    const difficultyFactor = getDifficultyFactor((_g = r.books) === null || _g === void 0 ? void 0 : _g.categories);
    const slackFactor = await getSlackFactor(userId);
    // 4) 읽을 페이지 수 계산 (정식 산정식)
    //    N = T_eff × PPM × D × ε
    console.log("=========================================");
    console.log("[recommendPortion] 계산 과정");
    console.log("-----------------------------------------");
    console.log(`T_eff (availableMinutes) = ${availableMinutes}`);
    console.log(`PPM (usedPpm)            = ${usedPpm}`);
    console.log(`난이도 계수(D)           = ${difficultyFactor}`);
    console.log(`여유계수(ε)              = ${slackFactor}`);
    const calc = availableMinutes * usedPpm * difficultyFactor * slackFactor;
    console.log("");
    console.log(`→ rawPagesToRead 계산`);
    console.log(`  = round(${availableMinutes} × ${usedPpm} × ${difficultyFactor} × ${slackFactor})`);
    console.log(`  = round(${calc})`);
    console.log("");
    const rawPagesToRead = Math.max(1, Math.round(availableMinutes * usedPpm * difficultyFactor * slackFactor));
    // 5) 시작/끝 페이지 계산
    const startPage = Math.min(currentPage + 1, pageCount);
    let endPage = Math.min(pageCount, startPage + rawPagesToRead - 1);
    // 이미 끝까지 다 읽은 경우
    let pagesToRead = 0;
    if (startPage > pageCount) {
        endPage = pageCount;
        pagesToRead = 0;
    }
    else {
        pagesToRead = endPage - startPage + 1;
    }
    const remainingPages = Math.max(0, pageCount - currentPage);
    const result = {
        userBookId: r.id,
        bookId: (_j = (_h = r.books) === null || _h === void 0 ? void 0 : _h.id) !== null && _j !== void 0 ? _j : bookId,
        title,
        authors: (_l = (_k = r.books) === null || _k === void 0 ? void 0 : _k.authors) !== null && _l !== void 0 ? _l : null,
        coverUrl: (_o = (_m = r.books) === null || _m === void 0 ? void 0 : _m.thumbnail_url) !== null && _o !== void 0 ? _o : null,
        currentPage,
        startPage,
        endPage,
        pagesToRead,
        pageCount,
        remainingPages,
        availableMinutes, // = T_eff
        usedPpm,
        isAlreadyCompleted,
        difficultyFactor,
        slackFactor,
    };
    return result;
}
