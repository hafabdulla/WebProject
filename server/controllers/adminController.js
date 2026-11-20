const mongoose = require("mongoose");
const User = require("../models/User")
const Review = require("../models/Review");
const Thread = require("../models/Thread")
const Report = require("../models/Report"); 
const isValidId = (id) => mongoose.isObjectIdOrHexString(id);

//a listof the last 'days' days, oldes will be first and each will start at 0
function makeDays(days){
    const list = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--){
        const day = new Date(today);
        day.setDate(today.getDate() -i);
        list.push({date:day.toISOString().slice(0,10), count:0});
    }
    return list;
} 

function countByDay(items, days){
    for(let i= 0; i< items.length;i++){
        const date = items[i].createdAt.toISOString().slice(0, 10);
        for(let j = 0; j < days.length;j++){
            if(days[j].date=== date){
                days[j].count = days[j].count +1; 
            }
        }
    }
}
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

const MIN_REVIEWS = 2;
//GET /api/adin/stats
const getStats = async(req, res)=>{
    try{
        const users = await User.find().select("createdAt");
        const reviews = await Review.find().select("movieId rating createdAt");
        const threads = await Thread.find().select("_id");
        const openReports = await Report.find({status:"open"}).select("_id");
        const signups = makeDays(14);
        countByDay(users, signups);
        const reviewActivity = makeDays(14);
        countByDay(reviews, reviewActivity);
        //add up the rating of each movie
        const movies = [];
        for(let i = 0; i < reviews.length; i++){
            let found = -1;
            for(let j = 0; j < movies.length;j++){
                if(movies[j].movieId === reviews[i].movieId){
                    found = j;
                }
            }
            if(found === -1){
                movies.push({movieId: reviews[i].movieId, total:0, count: 0})
                found = movies.length - 1;
            }
            movies[found].total = movies[found].total + reviews[i].rating;
            movies[found].count = movies[found].count + 1;
        }

        const ranked = []
        for(let i = 0; i < movies.length;i++){
            if(movies[i].count >= MIN_REVIEWS){
                const average = Math.round((movies[i].total/movies[i].count) * 10)/10;
                ranked.push({movieId: movies[i].movieId, average: average, count: movies[i].count});
            }
        }
        //bubble sort for highest average 
        for(let i = 0; i < ranked.length - 1;i++){
            for(let j = 0; j < ranked.length - 1 - i;j++){
                const a = ranked[j];
                const b = ranked[j+1];
                const B_higher = (b.average > a.average) || (b.average === a.average && b.count > a.count)
                    if(B_higher){
                        ranked[j] = b;
                        ranked[j +1] = a;
                    }
                }
            }
            const topRated = [];
            for(let i=0; i < ranked.length && i < 5;i++){
                topRated.push(ranked[i]);
            }
            res.status(200).json({
                totals: {
                    users: users.length,
                    reviews:reviews.length,
                    threads:threads.length,
                    openReports: openReports.length,
                },
                signups: signups,
                reviewActivity: reviewActivity,
                topRated:topRated,
            })
        }catch(err){
            res.status(500).json({message:err.message});
        }
    }


module.exports = { getUsers, updateUserRole, setBlocked,getStats };