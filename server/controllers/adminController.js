const mongoose = require("mongoose");
const User = require("../models/User")
const isValidId = (id) => mongoose.isObjectIdOrHexString(id);
const getUsers = async(req, res) =>{
    try{
        const users = await User.find().select("-password").sort({createdAt: -1})
        const q = (req.query.q || "").trim().toLowerCase()
        if(q === "") return res.status(200).json(users);

        const results = []
        for(let i = 0; i < users.length;i++){
            const name = users[i].name.toLowerCase();
            const email = users[i].email.toLowerCase();
            if(name.includes(q)||email.includes(q)) results.push(users[i])
        }
    res.status(200).json(results);
    }
    catch(err){
        res.status(500).json({message:err.message});
    }
}

const updateUserRole = async(req,res) => {
    try{
        if(!isValidId(req.params.id)){return res.status(400).json({message:"Invalid user Id"})}
        const {role} = req.body;
        if(role !== "user" && role !== "admin"){
            return res.status(400).json({message: "Role must be user or admin"})
        }
        if(req.params.id === req.user.id){
            return res.status(400).json({message: "You can't change your own role"})
        }

        const user = await User.findByIdAndUpdate(req.params.id, {role}, {new:true, runValidators: true}).select("-password");
        if(!user){
            return res.status(404).json({message: "User not found"});
        }
        res.status(200).json(user);
    }catch(err){
        res.status(500).json({message:err.message});
    }
}

const setBlocked = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    const { isBlocked } = req.body;
    if (typeof isBlocked !== "boolean") {
      return res.status(400).json({ message: "isBlocked must be true or false" });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "You can not block yourself" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked }, { new: true, runValidators: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  }catch(err) {
    res.status(500).json({ message: err.message });
  }
}
module.exports = { getUsers, updateUserRole, setBlocked };