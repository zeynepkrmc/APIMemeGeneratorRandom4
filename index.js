const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const Jimp = require('jimp');

const app = express();
const PORT = 4000; 

// Çözünürlüğü artırmak için resmi yeniden boyutlandırma ve filtre uygulama
const enhanceImageResolution = async (imageUrl, scaleFactor) => {
  try {
    const image = await Jimp.read(imageUrl);
    
    // Çözünürlüğü artırma (ölçeklendirme)
    image.scale(scaleFactor); // Örneğin, 2 katına çıkarmak için scaleFactor = 2 kullanın

    // Keskinleştirme filtresi uygulama (resmi netleştirmek için)
    image.convolute([
      [ 0, -1,  0 ],
      [-1,  5, -1 ],
      [ 0, -1,  0 ]
    ]);

    // Sonuç olarak işlenen resmi döndürme
    return await image.getBufferAsync(Jimp.MIME_JPEG);
  } catch (error) {
    console.error(`Error enhancing image ${imageUrl}:`, error.message);
    return null;
  }
};

// Meme resimlerini sayfa numarasına göre getirme
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

    const enhancedImages = [];

    for (const url of randomMemeUrls) {
      const enhancedImageBuffer = await enhanceImageResolution(url, 2); // Çözünürlüğü 2 kat artır

      if (enhancedImageBuffer) {
        const base64Image = enhancedImageBuffer.toString('base64');
        enhancedImages.push(`data:image/jpeg;base64,${base64Image}`);
      }
    }

    if (enhancedImages.length > 0) {
      res.json({
        status: 'success',
        data: enhancedImages
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to enhance images'
      });
    }
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
