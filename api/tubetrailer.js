export default async function handler(req, res) {
  // CORS headers - ADD THESE LINES
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }   
  
let cache = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, id, query, type, maxResults = '30' } = req.query;
  const cacheKey = `${action}-${id || query || type}-${maxResults}`;
  
  console.log('🎯 API Request:', { action, id, query, type });
  
  // Check cache (1 hour)
  const cachedData = cache.get(cacheKey);
  if (cachedData && Date.now() - cachedData.timestamp < 3600000) {
    console.log('✅ Serving from cache');
    return res.json(cachedData.data);
  }

  try {
    let data;
    
    switch (action) {
      case 'explore':
        data = await handleExplore();
        break;
      case 'search':
        data = await handleSearch(query, maxResults);
        break;
      case 'video':
        data = await handleVideoDetails(id);
        break;
      case 'related':
        data = await handleRelatedVideos(id, maxResults);
        break;
      case 'channel':
        data = await handleChannelDetails(id);
        break;
      case 'foryou':
        data = await handleForYou(type, maxResults);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    // Cache the result
    cache.set(cacheKey, {
      data: data,
      timestamp: Date.now()
    });
    
    console.log('✅ Fresh data fetched and cached');
    res.json(data);
    
  } catch (error) {
    console.error('❌ API error:', error);
    res.status(500).json({ error: error.message });
  }
}

// 1. EXPLORE: Get all explore page data at once
async function handleExplore() {
  const [trailers, movies, anime] = await Promise.all([
    handleSearch('latest movie trailers', '30'),
    handleSearch('latest full movie -trailer', '30'), 
    handleSearch('latest anime trailer OR full movie', '20')
  ]);
  
  return {
    trailers: trailers.items || [],
    movies: movies.items || [],
    anime: anime.items || [],
    timestamp: new Date().toISOString()
  };
}

// 2. SEARCH: Generic search function with YouTube + RapidAPI fallback
async function handleSearch(query, maxResults) {
  // Try YouTube API first
  try {
    const youtubeData = await tryYouTubeSearch(query, maxResults);
    return youtubeData;
  } catch (youtubeError) {
    console.log('🔄 YouTube failed, trying RapidAPI...');
    // Fallback to RapidAPI
    return await tryRapidAPISearch(query, maxResults);
  }
}

// YouTube API function
async function tryYouTubeSearch(query, maxResults) {
  const YOUTUBE_API_KEYS = [
    'AIzaSyC_syRSRRxQR1DbtHZzMw9glxcR7My8ly4',
    'AIzaSyABi7KdpAijF9gu09dSefpXJyhjIRY66Eg',
    'AIzaSyAqLty-6vku33b3bpdG5S4oLkyoimdw8TU',
    'AIzaSyBYixFCdGHJ2P512iW010glQRvd93EB6O8',
    'AIzaSyDLW2mkmVVgQcoUpM86VFtOaCegFvyVk_g',
    'AIzaSyDe7rOrqZFH3vIqP9zBtNkQ0Lqz4mBz9BI',
    'AIzaSyDFH66idOZwfx-PfO1AXdsUeCa2gV1kCk4',
    'AIzaSyAlbWmxyzhL2RaNPNlPsANzY7R0JZUj_TU',
    'AIzaSyC4WKW6-m7RlZyu6EctRsN9XjiOz5Z7GWk',
    'AIzaSyDSBtLwMoliYaFW09BnVyzTQADrGABHzKw',
    'AIzaSyCME7E2t1cd8JTwpXIgDSyAwVMja2QHkL8',
    'AIzaSyDdrHGuGB5IKzv6_h7Dkgc60magvKu7YRI',
    'AIzaSyDKnfDW7ujsfEFFGV3kWxsmQg9DDtRAUTM',
    'AIzaSyC7v1svD5oJFa9Sg4aXFvatOMiwKB2EG2A',
    'AIzaSyBS1tt0v9_lLc5HAIAFMkTYbRzVUL27yI0',
    'AIzaSyDRA0Fzdwg5oIIxBBt2NowcrdbeucEa6cc'
  ];

  for (const apiKey of YOUTUBE_API_KEYS) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&type=video&key=${apiKey}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ YouTube API success');
        return data;
      }
    } catch (error) {
      console.log(`❌ YouTube key failed, trying next...`);
    }
  }
  throw new Error('All YouTube APIs failed');
}

// RapidAPI fallback function
async function tryRapidAPISearch(query, maxResults) {
  const RAPID_API_KEYS = [
    "bbcd1df015mshcbfd8a8f912f109p1f68a0jsn8e1dca2c166d",
    "cbb6e2b6bamsh041eed1c81e7e0dp1b846ejsn669acdaca5ed"
  ];

  const rapidApis = [
    {
      name: "YouTube v3 (ytdlfree)",
      searchUrl: "https://youtube-v31.p.rapidapi.com/search?part=snippet&q={query}&maxResults={maxResults}&type=video",
      host: "youtube-v31.p.rapidapi.com"
    },
    {
      name: "YouTube Data16",
      searchUrl: "https://youtube-data16.p.rapidapi.com/search/?q={query}&hl=en",
      host: "youtube-data16.p.rapidapi.com"
    },
    {
      name: "YouTube v3 Lite",
      searchUrl: "https://youtube-v3-lite.p.rapidapi.com/search?part=snippet&q={query}&maxResults={maxResults}&type=video",
      host: "youtube-v3-lite.p.rapidapi.com"
    },
    {
      name: "YouTube Scraper3",
      searchUrl: "https://youtube-scraper3.p.rapidapi.com/api/v1/search?query={query}",
      host: "youtube-scraper3.p.rapidapi.com"
    }
  ];

  for (const apiKey of RAPID_API_KEYS) {
    for (const api of rapidApis) {
      try {
        const url = api.searchUrl
          .replace('{query}', encodeURIComponent(query))
          .replace('{maxResults}', maxResults);

        const response = await fetch(url, {
          headers: {
            "x-rapidapi-key": apiKey,
            "x-rapidapi-host": api.host
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Transform to match YouTube format
          return transformRapidResponse(data);
        }
      } catch (error) {
        console.log(`❌ RapidAPI ${api.name} failed, trying next...`);
      }
    }
  }
  throw new Error('All RapidAPIs failed');
}

// 3. VIDEO DETAILS (with RapidAPI fallback)
async function handleVideoDetails(videoId) {
  // Try YouTube first
  const YOUTUBE_API_KEYS = [/* your keys from above */];
  
  for (const apiKey of YOUTUBE_API_KEYS) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`;
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch (error) {
      console.log('Video details API failed, trying next...');
    }
  }
  
  // RapidAPI fallback for video details would go here
  throw new Error('All video APIs failed');
}

// 4. RELATED VIDEOS
async function handleRelatedVideos(videoId, maxResults) {
  const YOUTUBE_API_KEYS = [/* your keys */];
  
  for (const apiKey of YOUTUBE_API_KEYS) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&relatedToVideoId=${videoId}&type=video&maxResults=${maxResults}&key=${apiKey}`;
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch (error) {
      console.log('Related videos API failed');
    }
  }
  
  // Fallback to popular videos
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=${maxResults}&key=${YOUTUBE_API_KEYS[0]}`;
    const response = await fetch(url);
    if (response.ok) return await response.json();
  } catch (error) {
    console.log('Popular videos fallback failed');
  }

  return { items: [] };
}

// 5. CHANNEL DETAILS
async function handleChannelDetails(channelId) {
  // Similar pattern to above
  return { items: [] }; // Placeholder
}

// 6. FOR YOU (personalized)
async function handleForYou(contentType, maxResults) {
  return await handleSearch(`${contentType} trailer OR full movie`, maxResults);
}

// Transform RapidAPI response to match YouTube format
function transformRapidResponse(data) {
  const items = data.items || data.contents || data.videos || data.results || [];
  
  return {
    items: items.map(item => ({
      id: { 
        videoId: item.id?.videoId || item.id || item.videoId || Math.random().toString(36).substring(7)
      },
      snippet: {
        title: item.snippet?.title || item.title || "Unknown Title",
        description: item.snippet?.description || item.description || "",
        channelTitle: item.snippet?.channelTitle || item.channelTitle || "Unknown Channel",
        publishedAt: item.snippet?.publishedAt || item.publishedTime || item.uploadedAt || new Date().toISOString(),
        thumbnails: {
          medium: { 
            url: item.snippet?.thumbnails?.medium?.url || 
                 item.snippet?.thumbnails?.high?.url || 
                 item.thumbnail || 
                 item.thumbnails?.[0]?.url || 
                 "" 
          }
        }
      }
    })).filter(item => item.snippet.title !== "Unknown Title")
  };
}
