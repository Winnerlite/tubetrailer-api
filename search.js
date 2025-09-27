// Simple cache
let cache = new Map();

export default async function handler(req, res) {
  // Allow all websites to access this API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle browser preflight check
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get search parameters
  const { q = 'trailers', maxResults = '30' } = req.query;
  const cacheKey = `search-${q}-${maxResults}`;
  
  console.log('🔍 Search request:', q);
  
  // Check cache (1 hour)
  const cachedData = cache.get(cacheKey);
  if (cachedData && Date.now() - cachedData.timestamp < 3600000) {
    console.log('✅ Serving from cache');
    return res.json(cachedData.data);
  }

  try {
    // First try YouTube API
    const youtubeData = await tryYouTubeAPI(q, maxResults);
    
    // Cache the result
    cache.set(cacheKey, {
      data: youtubeData,
      timestamp: Date.now()
    });
    
    console.log('✅ YouTube API success');
    return res.json(youtubeData);
    
  } catch (youtubeError) {
    console.log('🔄 YouTube failed, trying RapidAPI...');
    
    try {
      // Fallback to RapidAPI
      const rapidData = await tryRapidAPI(q, maxResults);
      
      // Cache the result
      cache.set(cacheKey, {
        data: rapidData,
        timestamp: Date.now()
      });
      
      console.log('✅ RapidAPI success');
      return res.json(rapidData);
      
    } catch (rapidError) {
      console.error('❌ All APIs failed');
      res.status(500).json({ error: 'All APIs failed: ' + rapidError.message });
    }
  }
}

// YouTube API function
async function tryYouTubeAPI(query, maxResults) {
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

  // Try each YouTube API key
  for (const apiKey of YOUTUBE_API_KEYS) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&type=video&key=${apiKey}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        return data; // YouTube API success
      }
    } catch (error) {
      // Continue to next key
      console.log(`❌ YouTube key failed, trying next...`);
    }
  }
  
  throw new Error('All YouTube APIs failed');
}

// RapidAPI function
async function tryRapidAPI(query, maxResults) {
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

  // Try each RapidAPI key and endpoint combination
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
          // Transform RapidAPI response to match YouTube format
          return transformRapidResponse(data, api);
        }
      } catch (error) {
        console.log(`❌ RapidAPI ${api.name} failed, trying next...`);
      }
    }
  }
  
  throw new Error('All RapidAPIs failed');
}

// Transform RapidAPI response to match YouTube API format
function transformRapidResponse(data, api) {
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