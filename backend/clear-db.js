const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://sakshamhans301_db_user:Abcd%401234@cluster0.btv7osv.mongodb.net/adv-backend';

if (!MONGO_URI) {
  console.error('ERROR: MONGO_URI is not defined.');
  process.exit(1);
}

console.log('Connecting to MongoDB to clear all collections...');

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Successfully connected to MongoDB.');
    
    // Get actual collections from the DB
    const dbCollections = await mongoose.connection.db.listCollections().toArray();
    const names = dbCollections.map(c => c.name);
    
    if (names.length === 0) {
      console.log('No collections exist in the database yet.');
    } else {
      console.log(`Found active collections in DB: ${names.join(', ')}`);
      for (const name of names) {
        console.log(`Clearing collection: ${name}...`);
        const result = await mongoose.connection.db.collection(name).deleteMany({});
        console.log(`Cleared collection: ${name}. Deleted ${result.deletedCount} documents.`);
      }
    }
    
    console.log('All database collections have been cleared successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('An error occurred while clearing the database:', err);
    process.exit(1);
  });
