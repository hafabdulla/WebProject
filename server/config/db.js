const mongoose = require("mongoose");
const dns = require("dns");

// On some Windows PCs Node uses a local DNS server (127.0.0.1) that refuses the
// SRV lookup that "mongodb+srv://" links need. Using public DNS fixes that.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const connectDB = async() => {
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected");
    }catch(err){
        console.error("MongoDB connection failed", err.message);
        process.exit(1);
    }
};
module.exports = connectDB;
