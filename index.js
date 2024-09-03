const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const app = express();
const PORT = 4000; 

const fetchMemeImagesFromPage = async (pageNumber) => {
  try {
    const response = await fetch(`http://apimeme.com/?ref=apilist.fun&page=${pageNumber}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    const memeUrls = [];

    $('img').each((index, element) => {
      let imgSrc = $(element).attr('src');

      if (imgSrc) {
        if (!imgSrc.startsWith('data:') && !imgSrc.startsWith('http://apimeme.comdata:')) {
          if (imgSrc.startsWith('http')) {
            memeUrls.push(imgSrc);
          } else {
            const fullUrl = `http://apimeme.com${imgSrc}`;
            memeUrls.push(fullUrl);
          }
        }
      }
    });

    return memeUrls;
  } catch (error) {
    console.error(`Error fetching page ${pageNumber}:`, error.message);
    return [];
  }
};

app.get('/api/images', async (req, res) => {
  try {
    const allMemeUrls = [];

    for (let page = 1; page <= 29; page++) {
      const memeUrlsFromPage = await fetchMemeImagesFromPage(page);
      allMemeUrls.push(...memeUrlsFromPage);
    }

    // Randomly select 4 images
    const randomMemeUrls = allMemeUrls.sort(() => 0.5 - Math.random()).slice(0, 4);

    res.json({
      status: 'success',
      data: randomMemeUrls
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching memes', 
      error: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
