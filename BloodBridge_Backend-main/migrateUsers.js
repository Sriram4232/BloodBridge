const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const migrate = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('Error: MONGODB_URI is not defined in the environment variables.');
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for migration.');

    const users = await User.find({});
    console.log(`Found ${users.length} users to inspect.`);

    for (let user of users) {
      let needsUpdate = false;
      let targetLoc = user.location;

      // Check if location is correct GeoJSON Point
      if (!targetLoc || typeof targetLoc !== 'object' || targetLoc.type !== 'Point' || !Array.isArray(targetLoc.coordinates) || targetLoc.coordinates.length !== 2) {
        needsUpdate = true;
      } else if (isNaN(Number(targetLoc.coordinates[0])) || isNaN(Number(targetLoc.coordinates[1]))) {
        needsUpdate = true;
      }

      if (needsUpdate) {
        console.log(`Updating user: ${user.name} (${user.email}) from current location object:`, JSON.stringify(targetLoc));
        // Set fallback coordinates (Uppalaguptam/Kakinada)
        await User.updateOne(
          { _id: user._id },
          { 
            $set: { 
              location: {
                type: 'Point',
                coordinates: [82.2198, 16.7324]
              },
              cityName: 'Uppalaguptam',
              lastUpdated: new Date()
            }
          }
        );
        console.log(`User ${user.email} location migrated successfully.`);
      } else {
        console.log(`User ${user.name} already has valid location coordinates:`, JSON.stringify(targetLoc));
      }
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
