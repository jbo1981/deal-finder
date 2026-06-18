export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY; 
  const encodedQuery = encodeURIComponent(query);

  // Set up the URLs for Walmart, eBay, and Amazon via ScraperAPI
  const walmartUrl = `https://api.scraperapi.com/structured/walmart/search?api_key=${SCRAPER_API_KEY}&query=${encodedQuery}`;
  const ebayUrl = `https://api.scraperapi.com/structured/ebay/search?api_key=${SCRAPER_API_KEY}&query=${encodedQuery}`;
  const amazonUrl = `https://api.scraperapi.com/structured/amazon/search?api_key=${SCRAPER_API_KEY}&query=${encodedQuery}`;

  try {
    // Fetch all three marketplaces at the exact same time
    const responses = await Promise.allSettled([
      fetch(walmartUrl).then(r => r.json()),
      fetch(ebayUrl).then(r => r.json()),
      fetch(amazonUrl).then(r => r.json())
    ]);

    let combinedResults = [];

    // 1. Process Walmart Results
    if (responses[0].status === 'fulfilled' && responses[0].value.results) {
      const walmartData = responses[0].value.results.map(item => ({
        title: item.name || item.title,
        price: item.price,
        image: item.image,
        link: item.url,
        platform: 'Walmart'
      }));
      combinedResults = [...combinedResults, ...walmartData];
    }

    // 2. Process eBay Results
    if (responses[1].status === 'fulfilled' && responses[1].value.results) {
      const ebayData = responses[1].value.results.map(item => ({
        title: item.title,
        price: item.price,
        image: item.image || item.thumbnail,
        link: item.url,
        platform: 'eBay'
      }));
      combinedResults = [...combinedResults, ...ebayData];
    }

    // 3. Process Amazon Results
    if (responses[2].status === 'fulfilled' && responses[2].value.results) {
      const amazonData = responses[2].value.results.map(item => ({
        title: item.name || item.title,
        price: item.price,
        image: item.image,
        link: item.url,
        platform: 'Amazon'
      }));
      combinedResults = [...combinedResults, ...amazonData];
    }

    // Sort results from lowest price to highest price
    combinedResults.sort((a, b) => {
      const priceA = parseFloat(String(a.price).replace(/[^0-9.]/g, '')) || 0;
      const priceB = parseFloat(String(b.price).replace(/[^0-9.]/g, '')) || 0;
      return priceA - priceB;
    });

    // Send the live data back to the frontend
    return res.status(200).json({ results: combinedResults });

  } catch (error) {
    console.error("Multi-platform search failed:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
