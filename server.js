// server.js
const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
app.use(express.json()); // For parsing JSON request bodies

// OpenAI API Configuration (Make sure to replace this with your own API key)
const openai = new OpenAIApi(new Configuration({
    apiKey: 'your-openai-api-key', // Replace with your OpenAI API key
}));

// Function to scrape Amazon (or any other website)
async function scrapeAmazon(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);

    const product = await page.evaluate(() => {
        const name = document.querySelector('span#productTitle') ? document.querySelector('span#productTitle').textContent.trim() : 'N/A';
        const price = document.querySelector('span#priceblock_ourprice') ? document.querySelector('span#priceblock_ourprice').textContent.trim() : 'N/A';
        const image = document.querySelector('img#landingImage') ? document.querySelector('img#landingImage').src : 'N/A';
        const link = window.location.href;
        return { name, price, image, link };
    });

    await browser.close();
    return product;
}

// Function to rank products using OpenAI
async function rankProducts(products, preferences) {
    const productDescriptions = products.map(product => 
        `Product Name: ${product.name}, Price: ${product.price}, Link: ${product.link}, Description: ${product.name}`).join('\n');

    const prompt = `Given the following product descriptions, rank them based on the user's preferences: ${preferences}\n\nProducts:\n${productDescriptions}\n\nRank the products and explain why.`;

    const completion = await openai.createCompletion({
        model: 'text-davinci-003', // Or GPT-4 if you have access
        prompt: prompt,
        max_tokens: 500,
    });

    return completion.data.choices[0].text;
}

// API endpoint to search for products
app.post('/api/search', async (req, res) => {
    const { query, preferences } = req.body;

    try {
        // Example scraping URLs for demo (Modify for more e-commerce sites)
        const urls = [
            `https://www.amazon.com/s?k=${query}`,  // Amazon search query
        ];

        let allProducts = [];

        for (const url of urls) {
            const productData = await scrapeAmazon(url);
            allProducts.push(productData);
        }

        // Rank products using AI based on user preferences
        const rankedProducts = await rankProducts(allProducts, preferences);

        res.json({ rankedProducts });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing the request');
    }
});

// Start the server on port 3000
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
