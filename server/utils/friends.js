const Friendship = require("../models/Friendship");

// true if the two users are friends (an accepted friendship in either direction)
const areFriends = async (userA, userB) => {
  const friendship = await Friendship.findOne({
    status: "accepted",
    $or: [
      { requester: userA, recipient: userB },
      { requester: userB, recipient: userA },
    ],
  });
  return friendship !== null;
};

module.exports = { areFriends };
