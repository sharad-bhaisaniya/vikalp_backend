const { MongoClient, ObjectId } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();
  const db = client.db('vikalp-promotions');
  
  await db.collection('advertisements').updateMany({}, { $set: { user_id: new ObjectId('6a4225c572d799dffd23be16') } });
  console.log('Done');
  process.exit(0);
}
run();
