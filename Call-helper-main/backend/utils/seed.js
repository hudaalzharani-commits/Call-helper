import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import KnowledgeBase from '../models/KnowledgeBase.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rafeeq_db';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await KnowledgeBase.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create admin user
    const admin = new User({
      username: 'admin',
      password: 'admin123',
      name: 'مدير النظام',
      email: 'admin@rafeeq.com',
      role: 'admin',
      accountStatus: 'active',
      isActive: true,
      permAdminPanel: true,
      permContentCreate: true,
      uiVisibility: {},
    });
    await admin.save();
    console.log('✅ Created admin user');

    // Create regular user
    const user = new User({
      username: 'user',
      password: 'user123',
      name: 'مستخدم عادي',
      email: 'user@rafeeq.com',
      role: 'user',
      accountStatus: 'active',
      isActive: true,
      permAdminPanel: false,
      permContentCreate: false,
      uiVisibility: {},
    });
    await user.save();
    console.log('✅ Created regular user');

    const support = new User({
      username: 'support',
      password: 'support123',
      name: 'موظف خدمة عملاء',
      email: 'support@rafeeq.com',
      role: 'customer_service',
      accountStatus: 'active',
      isActive: true,
      permAdminPanel: false,
      permContentCreate: false,
      uiVisibility: {},
    });
    await support.save();
    console.log('✅ Created customer_service user');

    // Create sample knowledge base articles
    const articles = [
      {
        title: 'مشكلة التسجيل في النظام',
        description: 'كيفية حل مشاكل التسجيل الشائعة',
        category: 'registration',
        solution: 'تأكد من صحة البيانات المدخلة وأن الحساب غير مسجل مسبقاً',
        keywords: ['تسجيل', 'حساب', 'مشكلة'],
        confidence: 85,
        examples: [
          {
            scenario: 'عميل لا يستطيع التسجيل',
            resolution: 'التحقق من البريد الإلكتروني وإعادة المحاولة'
          }
        ],
        createdBy: admin._id,
        isPublished: true
      },
      {
        title: 'مشاكل الفوترة',
        description: 'حل مشاكل الفواتير والدفع',
        category: 'billing',
        solution: 'مراجعة تفاصيل الفاتورة والتأكد من طريقة الدفع',
        keywords: ['فاتورة', 'دفع', 'رسوم'],
        confidence: 90,
        examples: [],
        createdBy: admin._id,
        isPublished: true
      }
    ];

    await KnowledgeBase.insertMany(articles);
    console.log('✅ Created knowledge base articles');

    console.log(`
╔════════════════════════════════════════════╗
║                                            ║
║   ✅  Database seeded successfully!       ║
║                                            ║
║   👤  Admin: admin / admin123             ║
║   👤  User: user / user123                ║
║                                            ║
╚════════════════════════════════════════════╝
    `);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
