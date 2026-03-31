import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ [Database] Connected");
    } catch (error) {
        console.error("❌ [Database] Connection Failed due to " + error.message);
        process.exit(1);
    }
};

export default connectDB;
