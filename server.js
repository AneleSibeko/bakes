const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
let db;
MongoClient.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sample_mflix', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(client => {
  console.log('Connected to MongoDB');
  db = client.db('sample_mflix');
})
.catch(error => console.error(error));

// Basic Auth Middleware
const basicAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ 
      error: 'Authorization header missing or invalid format' 
    });
  }

  try {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    // Simple credential check (you should use environment variables)
    const validUsername = process.env.AUTH_USERNAME || 'admin';
    const validPassword = process.env.AUTH_PASSWORD || 'password';

    if (username === validUsername && password === validPassword) {
      next();
    } else {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    return res.status(401).json({ error: 'Invalid authorization header' });
  }
};

// Collection routes based on your image
const collections = [
  'checkout',
  'order-confirmations',
  'orders',
  'payment-details',
  'product',
  'reviews',
  'reviews/feedback',
  'users'
];

// CRUD Routes for each collection
collections.forEach(collectionName => {
  const routePath = collectionName.replace('/', '-');

  // CREATE - Add new document
  app.post(`/api/${routePath}`, basicAuth, async (req, res) => {
    try {
      const collection = db.collection(collectionName);
      const result = await collection.insertOne({
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      const newDoc = await collection.findOne({ _id: result.insertedId });
      res.status(201).json({
        success: true,
        data: newDoc
      });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // READ - Get all documents with pagination and filtering
  app.get(`/api/${routePath}`, basicAuth, async (req, res) => {
    try {
      const collection = db.collection(collectionName);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      // Build filter object from query parameters
      const filter = {};
      Object.keys(req.query).forEach(key => {
        if (!['page', 'limit', 'sort'].includes(key)) {
          if (ObjectId.isValid(req.query[key])) {
            filter[key] = new ObjectId(req.query[key]);
          } else {
            filter[key] = new RegExp(req.query[key], 'i'); // Case insensitive search
          }
        }
      });

      const sort = req.query.sort ? JSON.parse(req.query.sort) : { createdAt: -1 };
      
      const documents = await collection
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();
      
      const total = await collection.countDocuments(filter);
      
      res.json({
        success: true,
        data: documents,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // READ - Get single document by ID
  app.get(`/api/${routePath}/:id`, basicAuth, async (req, res) => {
    try {
      const collection = db.collection(collectionName);
      const document = await collection.findOne({ _id: new ObjectId(req.params.id) });
      
      if (!document) {
        return res.status(404).json({ 
          success: false, 
          error: 'Document not found' 
        });
      }
      
      res.json({
        success: true,
        data: document
      });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // UPDATE - Update document by ID
  app.put(`/api/${routePath}/:id`, basicAuth, async (req, res) => {
    try {
      const collection = db.collection(collectionName);
      const updateData = {
        ...req.body,
        updatedAt: new Date()
      };
      
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      if (!result.value) {
        return res.status(404).json({ 
          success: false, 
          error: 'Document not found' 
        });
      }
      
      res.json({
        success: true,
        data: result.value
      });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // PATCH - Partially update document by ID
  app.patch(`/api/${routePath}/:id`, basicAuth, async (req, res) => {
    try {
      const collection = db.collection(collectionName);
      const updateData = {
        ...req.body,
        updatedAt: new Date()
      };
      
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      if (!result.value) {
        return res.status(404).json({ 
          success: false, 
          error: 'Document not found' 
        });
      }
      
      res.json({
        success: true,
        data: result.value
      });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // DELETE - Delete document by ID
  app.delete(`/api/${routePath}/:id`, basicAuth, async (req, res) => {
    try {
      const collection = db.collection(collectionName);
      const result = await collection.findOneAndDelete({ _id: new ObjectId(req.params.id) });
      
      if (!result.value) {
        return res.status(404).json({ 
          success: false, 
          error: 'Document not found' 
        });
      }
      
      res.json({
        success: true,
        message: 'Document deleted successfully',
        data: result.value
      });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // DELETE - Delete multiple documents
  app.delete(`/api/${routePath}`, basicAuth, async (req, res) => {
    try {
      const collection = db.collection(collectionName);
      const filter = req.body.filter || {};
      
      // Safety check - prevent deleting all documents without explicit confirmation
      if (Object.keys(filter).length === 0 && !req.body.confirmDeleteAll) {
        return res.status(400).json({
          success: false,
          error: 'To delete all documents, include confirmDeleteAll: true in request body'
        });
      }
      
      const result = await collection.deleteMany(filter);
      
      res.json({
        success: true,
        message: `${result.deletedCount} documents deleted successfully`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Sample MFlix API Server',
    version: '1.0.0',
    endpoints: collections.map(collection => ({
      collection,
      endpoints: [
        `GET /api/${collection.replace('/', '-')} - List all documents`,
        `GET /api/${collection.replace('/', '-')}/:id - Get document by ID`,
        `POST /api/${collection.replace('/', '-')} - Create new document`,
        `PUT /api/${collection.replace('/', '-')}/:id - Update document by ID`,
        `PATCH /api/${collection.replace('/', '-')}/:id - Partially update document`,
        `DELETE /api/${collection.replace('/', '-')}/:id - Delete document by ID`,
        `DELETE /api/${collection.replace('/', '-')} - Delete multiple documents`
      ]
    })),
    authentication: 'Basic Auth required for all endpoints (except this one)'
  });
});

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Available collections: ${collections.join(', ')}`);
});

module.exports = app;