const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const makeToken = (user) => jwt.sign({id: user._id, role: user.role}, process.env.JWT_SECRET, {expiresIn:"7d"});

const register = async(req, res) => {
    try {
        const {name, email, password} = req.body;
        if(!name || !email || !password) {
            return res.status(400).json({message: "Name, email and password are required"});
        }
        const exists = await User.findOne({email});
        if(exists) {
            return res.status(400).json({message: "Email already registered"});
        }
        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({name, email, password:hashed});

        res.status(201).json({
            token: makeToken(user),
            user: {id: user._id, name: user.name, email: user.email, role: user.role},
        });
    }
    catch(err){
        res.status(500).json({message: err.message});
    }
};

    const login = async(req, res) => {
    try{
        const {email, password} = req.body;
        const user = await User.findOne({email});
        if(!user || !(await bcrypt.compare(password, user.password))){
            return res.status(400).json({message: "Invalid Email or password"});
        }
        if(user.isBlocked){
            return res.status(403).json({message: "This account has been blocked"})
        }
        res.status(200).json({
            token: makeToken(user),
            user: {id: user._id, name: user.name, email: user.email, role: user.role},
        });
    }
    catch(err){
        res.status(500).json({message:err.message});
    }
    };
    const getMe = async(req, res) =>{
        try{
            const user = await User.findById(req.user.id).select("-password");
            if(!user){
                return res.status(404).json({message: "User not found"});
            }
                res.status(200).json(user);
            
        }
            catch(err){
                res.status(500).json({message:err.message});
            }
    }

    const updateMe = async (req, res) =>{
        try{
            const {name, currentPassword, newPassword} = req.body;
            if(name === undefined && !newPassword){
                return res.status(400).json({message:"nothing to update"})
            }
            const user = await User.findById(req.user.id)
            if(!user) return res.status(404).json({message: "User not found"}) 

                if(name !== undefined){
                    if(name.trim()===""){
                        return res.status(400).json({message: "Name cannot be empty"});
                    }user.name = name.trim();
                }
                if(newPassword){
                    if(!currentPassword){
                        return res.status(400).json({message:"enter your current password"});
                    }
                    if(newPassword.length<6){
                        return res.status(400).json({message: "New password must be at least 6 characters"});
                    }
                    const matches = await bcrypt.compare(currentPassword, user.password);
                    if(!matches) return res.status(401).json({message: "Current password is incorrect"})
                    user.password = await bcrypt.hash(newPassword, 10);
                }
                await user.save();
                res.status(200).json({ id: user._id, name: user.name, email: user.email, role: user.role});
        }
        catch(err){
            res.status(500).json({message: err.message});
        }
    }

module.exports = {register, login, getMe, updateMe};