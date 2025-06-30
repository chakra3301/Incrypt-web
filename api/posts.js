import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = 'incryptfeed';
const collectionName = 'posts';

let cachedClient = null;

async function getClient() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  cachedClient = client;
  return client;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const client = await getClient();
  const db = client.db(dbName);
  const posts = db.collection(collectionName);

  if (req.method === 'GET') {
    // Get all posts
    const allPosts = await posts.find({}).sort({ id: -1 }).toArray();
    res.status(200).json(allPosts);
  } else if (req.method === 'POST') {
    // Add new post
    const { image, description } = req.body;
    
    if (!image || !description) {
      return res.status(400).json({ error: 'Image and description are required' });
    }

    const count = await posts.countDocuments();
    const uploadNumber = (count + 1).toString().padStart(5, '0');
    
    const newPost = {
      id: Date.now(),
      image,
      description,
      timestamp: new Date().toISOString(),
      user: uploadNumber,
      likes: 0,
      comments: []
    };

    await posts.insertOne(newPost);
    
    res.status(201).json(newPost);
  } else if (req.method === 'PUT') {
    // Handle likes and comments
    const { action, postId, comment } = req.body;
    
    const post = await posts.findOne({ id: parseInt(postId) });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (action === 'like') {
      const updated = await posts.findOneAndUpdate(
        { id: parseInt(postId) },
        { $inc: { likes: 1 } },
        { returnDocument: 'after' }
      );
      res.status(200).json({ likes: updated.value.likes });
    } else if (action === 'comment') {
      if (!comment || !comment.trim()) {
        return res.status(400).json({ error: 'Comment is required' });
      }
      
      const count = post.comments ? post.comments.length : 0;
      const commentUploadNumber = (count + 1).toString().padStart(5, '0');
      const newComment = {
        id: Date.now(),
        user: commentUploadNumber,
        text: comment.trim(),
        timestamp: new Date().toISOString()
      };
      const updated = await posts.findOneAndUpdate(
        { id: parseInt(postId) },
        { $push: { comments: newComment } },
        { returnDocument: 'after' }
      );
      res.status(200).json({ comments: updated.value.comments });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 