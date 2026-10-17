const jwt = require("jsonwebtoken");
const protect = (req, res, next)=>{
    const header = req.headers.authorization;
    if(!header || !header.startsWith("Bearer ")){
        return res.status(401).json({message: "Not authorized, no token"});
    }
    try{
        const token = header.split(" ")[1];
        req.user = jwt.verify(token, process.env.JWT_SECRET);
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