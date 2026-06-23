"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchPlaylistVideos = fetchPlaylistVideos;
exports.updateYoutubeVideos = updateYoutubeVideos;
exports.getYoutubeVideosFromDB = getYoutubeVideosFromDB;
const axios_1 = __importDefault(require("axios"));
const db_1 = require("../core/db");
const PLAYLISTS = [
    {
        id: "PL4-UCyPXds6-f_9i8Xgqg2LrE0ddPmiH0",
        title: "다들 뭐 봐? 책장 엿보기",
    },
    {
        id: "PL4-UCyPXds6_XUO9n1ZCITEH6CIc_9Xs2",
        title: "책 추천이 필요해? 들어와",
    },
    {
        id: "PLUpgTv3bu9rGxQBAMVaMvam27P0YbiY29",
        title: "이동진이 추천하는 책 모음",
    },
];
// duration 변환
function formatDuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = parseInt((match === null || match === void 0 ? void 0 : match[1]) || "0");
    const minutes = parseInt((match === null || match === void 0 ? void 0 : match[2]) || "0");
    const seconds = parseInt((match === null || match === void 0 ? void 0 : match[3]) || "0");
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
// videos API
async function fetchVideoDetails(videoIds) {
    const res = await axios_1.default.get("https://www.googleapis.com/youtube/v3/videos", {
        params: {
            key: process.env.YOUTUBE_API_KEY,
            part: "contentDetails,snippet",
            id: videoIds.join(","),
        },
    });
    const map = {};
    for (const item of res.data.items) {
        map[item.id] = {
            duration: formatDuration(item.contentDetails.duration),
            description: item.snippet.description,
        };
    }
    return map;
}
// 전체 영상 가져오기
async function fetchAllVideosFromPlaylist(playlistId) {
    let videos = [];
    let nextPageToken = undefined;
    do {
        const res = await axios_1.default.get("https://www.googleapis.com/youtube/v3/playlistItems", {
            params: {
                key: process.env.YOUTUBE_API_KEY,
                part: "snippet,contentDetails",
                maxResults: 50,
                playlistId,
                pageToken: nextPageToken,
            },
        });
        videos.push(...res.data.items);
        nextPageToken = res.data.nextPageToken;
    } while (nextPageToken);
    return videos;
}
// 🔥 데이터 수집
async function fetchPlaylistVideos() {
    const results = await Promise.all(PLAYLISTS.map(async (p) => {
        const items = await fetchAllVideosFromPlaylist(p.id);
        const videoIds = items.map((i) => i.contentDetails.videoId);
        const detailsMap = await fetchVideoDetails(videoIds);
        return items.map((item) => {
            const videoId = item.contentDetails.videoId;
            const detail = detailsMap[videoId] || {};
            return {
                video_id: videoId,
                title: item.snippet.title,
                thumbnail_url: item.snippet.thumbnails.medium.url,
                channel_name: item.snippet.channelTitle,
                published_at: item.contentDetails.videoPublishedAt,
                playlist_id: p.id,
                duration: detail.duration || "0:00",
                description: detail.description || "",
            };
        });
    }));
    return results.flat();
}
// 🔥 DB 업데이트
async function updateYoutubeVideos() {
    const videos = await fetchPlaylistVideos();
    for (const v of videos) {
        await db_1.supabase.from("youtube_videos").upsert(v, {
            onConflict: "video_id",
        });
    }
    console.log(`✅ YouTube 영상 ${videos.length}개 업데이트 완료`);
}
// 🔥 조회 (섹션 형태)
async function getYoutubeVideosFromDB() {
    const { data, error } = await db_1.supabase
        .from("youtube_videos")
        .select("*")
        .order("published_at", { ascending: false });
    if (error)
        throw error;
    const PLAYLIST_MAP = {
        "PL4-UCyPXds6-f_9i8Xgqg2LrE0ddPmiH0": "다들 뭐 봐? 책장 엿보기",
        "PL4-UCyPXds6_XUO9n1ZCITEH6CIc_9Xs2": "책 추천이 필요해? 들어와",
        "PLUpgTv3bu9rGxQBAMVaMvam27P0YbiY29": "이동진이 추천하는 책 모음",
    };
    const grouped = {};
    for (const v of data) {
        if (!grouped[v.playlist_id])
            grouped[v.playlist_id] = [];
        grouped[v.playlist_id].push({
            videoId: v.video_id,
            title: v.title,
            thumbnailUrl: v.thumbnail_url,
            channelName: v.channel_name,
            duration: v.duration,
            description: v.description.slice(0, 80),
            externalUrl: `https://youtube.com/watch?v=${v.video_id}`,
        });
    }
    return {
        sections: Object.entries(grouped).map(([playlistId, items]) => ({
            playlistId,
            title: PLAYLIST_MAP[playlistId] || "기타",
            items,
        })),
    };
}
