import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const DEFAULT_USERS = [
  {
    username: 'admin',
    password: 'admin123',
    name: 'مدير النظام',
    email: 'admin@rafeeq.com',
    role: 'admin',
  },
  {
    username: 'user',
    password: 'user123',
    name: 'موظف خدمة العملاء',
    email: 'user@rafeeq.com',
    role: 'user',
  },
  {
    username: 'supervisor',
    password: 'supervisor123',
    name: 'Supervisor',
    email: 'supervisor@rafeeq.com',
    role: 'moderator',
  },
];

const seedUsers = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rafeeq_db';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    for (const userData of DEFAULT_USERS) {
      const permAdminPanel = userData.role === 'admin';
      const permContentCreate = userData.role === 'admin' || userData.role === 'moderator';
      const payload = { ...userData, permAdminPanel, permContentCreate };
      const existing = await User.findOne({ username: userData.username.toLowerCase() });
      if (!existing) {
        await User.create(payload);
        console.log(`✅ Created user: ${userData.username} (${userData.role})`);
        continue;
      }

      existing.name = userData.name;
      existing.email = userData.email;
      existing.role = userData.role;
      existing.permAdminPanel = permAdminPanel;
      existing.permContentCreate = permContentCreate;
      if (!existing.comparePassword || !(await existing.comparePassword(userData.password))) {
        existing.password = userData.password;
      }
      await existing.save();
      console.log(`♻️ Updated user: ${userData.username} (${userData.role})`);
    }

    console.log('✅ Users seeding completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Users seeding failed:', error);
    process.exit(1);
  }
};

seedUsers();
