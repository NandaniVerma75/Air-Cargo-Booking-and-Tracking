import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

// Set test database
const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/air-cargo-booking-test';

// Connect to test database
beforeAll(async () => {
  await mongoose.connect(TEST_MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Clean up after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Close database connection after all tests
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

