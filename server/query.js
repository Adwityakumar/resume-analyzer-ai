import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const User = (await import('./src/models/User.js')).default;
    const users = await User.find({ "resumes.0": { $exists: true } });
    console.log(JSON.stringify(users.map(u => ({ id: u._id, resumes: u.resumes })), null, 2));
    process.exit(0);
});
