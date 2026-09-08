const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://root:jjQCeBxaGLUVCB0FlPg8TUhOa91hnG6pbXSs7gXtqQmEVespY5PofCcgsDVs5nM5@n11ca7rihr04rcppauwg6zv8:27017/?directConnection=true';

async function run() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const entries = await db.collection('customerentries').find({ name: /sampletheni/i }).toArray();
  console.log("Customer Entries for sampletheni:", JSON.stringify(entries, null, 2));

  const users = await db.collection('users').find({ _id: entries[0].employeeId }).toArray();
  console.log("Employee:", JSON.stringify(users, null, 2));
  
  process.exit(0);
}

run();
