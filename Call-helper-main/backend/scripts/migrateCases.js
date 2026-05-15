import mongoose from 'mongoose';
import Case from '../models/Case.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const migrateCases = async () => {
  try {
    console.log('🔄 Starting case migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Update all existing cases to add new fields with empty defaults
    const result = await Case.updateMany(
      {},
      {
        $set: {
          extraKeywords: '',
          synonyms: '',
          negativeKeywords: '',
          responseText: '',
          why: '',
          fallbackText: '',
          notes: ''
        }
      }
    );

    console.log(`✅ Migration complete! Updated ${result.modifiedCount} cases`);
    console.log(`📊 Matched ${result.matchedCount} cases in total`);
    
    // Close connection
    await mongoose.connection.close();
    console.log('👋 Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrateCases();
