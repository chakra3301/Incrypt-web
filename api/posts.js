// In-memory storage for posts (will reset on function restart)
let posts = [];

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // Get all posts
    res.status(200).json(posts);
  } else if (req.method === 'POST') {
    // Add new post
    try {
      const { image, description } = req.body;
      
      if (!image || !description) {
        return res.status(400).json({ error: 'Image and description are required' });
      }

      const uploadNumber = (posts.length + 1).toString().padStart(5, '0');
      
      const newPost = {
        id: Date.now(),
        image,
        description,
        timestamp: new Date().toISOString(),
        user: uploadNumber,
        likes: 0,
        comments: []
      };

      posts.unshift(newPost); // Add to beginning
      
      res.status(201).json(newPost);
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    // Handle likes and comments
    try {
      const { action, postId, comment } = req.body;
      
      const post = posts.find(p => p.id === parseInt(postId));
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (action === 'like') {
        post.likes++;
        res.status(200).json({ likes: post.likes });
      } else if (action === 'comment') {
        if (!comment || !comment.trim()) {
          return res.status(400).json({ error: 'Comment is required' });
        }
        
        const commentUploadNumber = (posts.length + 1).toString().padStart(5, '0');
        post.comments.push({
          id: Date.now(),
          user: commentUploadNumber,
          text: comment.trim(),
          timestamp: new Date().toISOString()
        });
        
        res.status(200).json({ comments: post.comments });
      } else {
        res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Error updating post:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 