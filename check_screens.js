import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/vikalp_promotions");

const screenSchema = new mongoose.Schema({}, { strict: false });
const Screen = mongoose.model('Screen', screenSchema, 'screens');

async function checkScreens() {
  try {
    const screens = await Screen.find({}).lean();
    console.log(`Total screens found: ${screens.length}`);
    screens.forEach((s, i) => {
      console.log(`Screen ${i+1}: username="${s.username}", password="${s.password}", isActive=${s.isActive}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

checkScreens();
