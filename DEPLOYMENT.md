# Vercel Deployment Guide

## Overview
This project includes a public feed system that allows users to share encoded images globally. Everything is deployed on Vercel for simplicity and performance.

## Quick Deploy to Vercel

### Option 1: Deploy with Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy the project**:
   ```bash
   vercel
   ```

3. **Follow the prompts**:
   - Link to existing project or create new
   - Choose your team/account
   - Confirm deployment settings

4. **Your site will be live** at: `https://your-project.vercel.app`

### Option 2: Deploy via GitHub Integration

1. **Push your code to GitHub**
2. **Go to [vercel.com](https://vercel.com)**
3. **Click "New Project"**
4. **Import your GitHub repository**
5. **Deploy automatically**

## What Gets Deployed

### Frontend (Static Files):
- `Encoder.html` - Image encoding page
- `feed.html` - Public feed page
- `index.html` - Home page
- `documentation.html` - Documentation
- `assets/` - Images and resources
- `styles/` - CSS files

### Backend (Serverless Functions):
- `api/posts.js` - API endpoint for posts
- `vercel.json` - Vercel configuration

### Data Storage:
- `data/posts.json` - Posts storage (auto-created)

## API Endpoints

- `GET /api/posts` - Retrieve all posts
- `POST /api/posts` - Create new post

## Features

✅ **Public Feed**: All users see the same posts globally  
✅ **Real-time Updates**: Auto-refreshes every 30 seconds  
✅ **Upload Numbers**: Sequential numbering (00001, 00002, etc.)  
✅ **Dotlock Avatars**: Consistent profile pictures  
✅ **Like & Comment**: Interactive features  
✅ **Download Images**: Save encoded images  
✅ **Responsive Design**: Works on all devices  

## File Structure
```
/
├── api/
│   └── posts.js          # API endpoint
├── data/
│   └── posts.json        # Posts storage (auto-created)
├── assets/
│   ├── dotlock.png       # Avatar image
│   ├── clean logo.png    # Logo
│   └── ...               # Other assets
├── styles/
│   └── style.css         # Styles
├── Encoder.html          # Encoder page
├── feed.html            # Feed page
├── index.html           # Home page
├── documentation.html   # Documentation
├── vercel.json          # Vercel config
└── DEPLOYMENT.md        # This file
```

## Migration from GitHub Pages

### Before Deploying:
1. **Backup your current site** (if needed)
2. **Test locally** with `vercel dev` (optional)
3. **Update any hardcoded URLs** in your code

### After Deploying:
1. **Update your domain** (if you have a custom domain)
2. **Test all functionality**:
   - Image encoding
   - Sharing to feed
   - Viewing feed
   - Downloading images

## Troubleshooting

### Posts not showing up?
- Check browser console for errors
- Verify API endpoint: `https://your-site.vercel.app/api/posts`
- Check Vercel function logs in dashboard

### Deployment issues?
- Ensure all files are committed to Git
- Check `vercel.json` configuration
- Verify API function syntax

### Performance?
- Images are stored as base64 (may be large)
- Monitor Vercel function execution time
- Consider image compression for better performance

## Benefits of Vercel

🚀 **Fast Deployment**: Automatic deployments from Git  
⚡ **Global CDN**: Fast loading worldwide  
🔧 **Serverless Functions**: No server management  
📊 **Analytics**: Built-in performance monitoring  
🔄 **Auto-scaling**: Handles traffic spikes  
💰 **Free Tier**: Generous free hosting  

## Next Steps

After deployment, consider:
- Adding user authentication
- Implementing image compression
- Setting up a database for better scalability
- Adding moderation features
- Custom domain setup 