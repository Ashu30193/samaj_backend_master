require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect(process.env.DB_LOCAL_URL || process.env.DB_PRODUCTION_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  seedAdmin();
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function seedAdmin() {
  try {
    // Get Role model
    const Role = require('./models/role');
    const SystemAdmin = require('./models/admin');

    // Create or find admin role
    let adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) {
      adminRole = await Role.create({ name: 'admin' });
      console.log('Created admin role:', adminRole._id);
    } else {
      console.log('Admin role exists:', adminRole._id);
    }

    // Check if admin already exists
    const existingAdmin = await SystemAdmin.findOne({ email: 'admin@gmail.com' });
    if (existingAdmin) {
      console.log('Admin already exists:', existingAdmin.email);
      console.log('Admin ID:', existingAdmin._id);
      process.exit(0);
    }

    // Create a temporary ObjectId for self-reference
    const tempId = new mongoose.Types.ObjectId();

    // Create admin
    const admin = new SystemAdmin({
      _id: tempId,
      first_name: 'Super',
      last_name: 'Admin',
      email: 'admin@gmail.com',
      password: 'admin123',
      isActive: true,
      role: adminRole._id,
      createdBy: tempId,
      updatedBy: tempId
    });

    await admin.save();
    console.log('Admin created successfully!');
    console.log('Email: admin@gmail.com');
    console.log('Password: admin123');
    console.log('Admin ID:', admin._id);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}
