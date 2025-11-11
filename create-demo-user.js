const mongoose = require('mongoose');
const config = require('./config.json');
const User = require('./models/user');
const Role = require('./models/role');

// Connect to MongoDB
mongoose.connect(config.db.localurl)
  .then(async () => {
    console.log('Connected to MongoDB');

    try {
      // Check if demo user already exists
      const existingUser = await User.findOne({ email: 'demo@samaj.com' });
      if (existingUser) {
        console.log('Demo user already exists!');
        console.log('Email: demo@samaj.com');
        console.log('Password: Demo@123');
        process.exit(0);
      }

      // Find or create a default role
      let role = await Role.findOne({ name: 'user' });
      if (!role) {
        // Create a default user role if it doesn't exist
        role = await Role.create({
          name: 'user',
          description: 'Standard user role'
        });
        console.log('Created default user role');
      }

      // Create demo user
      const demoUser = await User.create({
        name: 'Demo User',
        email: 'demo@samaj.com',
        password: 'Demo@123',
        phone: '+919999999999',
        role: role._id,
        gender: 'Male',
        isActive: true,
        isVerified: true,
        hasDetails: true
      });

      console.log('\n✅ Demo user created successfully!');
      console.log('═══════════════════════════════════');
      console.log('Email: demo@samaj.com');
      console.log('Password: Demo@123');
      console.log('═══════════════════════════════════\n');

      process.exit(0);
    } catch (error) {
      console.error('Error creating demo user:', error.message);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
