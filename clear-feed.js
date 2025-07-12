// Simple script to clear the feed
// Run with: node clear-feed.js

const https = require('https');
const http = require('http');

// Replace with your actual domain
const domain = 'your-domain.com'; // Change this to your actual domain
const path = '/api/posts';

const options = {
  hostname: domain,
  port: 443,
  path: path,
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log(`Clearing feed at ${domain}${path}...`);

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('✅ Feed cleared successfully!');
      console.log(`Message: ${result.message}`);
      console.log(`Posts deleted: ${result.deletedCount}`);
    } catch (error) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error clearing feed:', error.message);
});

req.end(); 