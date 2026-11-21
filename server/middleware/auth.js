const jwt = require("jsonwebtoken");
const User = require("../models/User")
const protect = async (req, res, next)=>{
    const header = req.headers.authorization;
    if(!header || !header.startsWith("Bearer ")){
        return res.status(401).json({message: "Not authorized, no token"});
    }
    try{
        const token = header.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("role isBlocked")
        if(!user){
            return res.status(401).json({message: "User no longer exists"})
        }
        if(user.isBlocked){
            return res.status(403).json({message: "This account has been blocked"})
        }
        req.user = {id:decoded.id, role: user.role};
        next();
    }catch(err){
        res.status(401).json({message: "Token invalid or expired"});
    }
};

const adminOnly=(req, res, next) =>{
    if(req.user && req.user.role === "admin"){
        return next();
    }res.status(403).json({message: "Admin access Only"});
};

module.exports = {protect, adminOnly};