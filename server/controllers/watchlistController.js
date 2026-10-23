const Watchlist = require("../models/Watchlist");

// GET /api/watchlist  or  /api/watchlist?status=want  - my watchlist
const getWatchlist = async (req, res) => {
  try {
    const filter = { user: req.user.id };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const items = await Watchlist.find(filter);
    res.status(200).json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/watchlist  - add a movie, or change its status if it is already there
const saveToWatchlist = async (req, res) => {
  try {
    const { movieId, status } = req.body;
    if (!movieId || !["want", "watched"].includes(status)) {
      return res
        .status(400)
        .json({ message: "movieId and a status of want or watched are required" });
    }

    let item = await Watchlist.findOne({ user: req.user.id, movieId });
    if (item) {
      item.status = status;
      await item.save();
      return res.status(200).json(item);
    }

    item = await Watchlist.create({ user: req.user.id, movieId, status });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/watchlist/:movieId  - remove a movie from my watchlist
const removeFromWatchlist = async (req, res) => {
  try {
    const item = await Watchlist.findOneAndDelete({
      user: req.user.id,
      movieId: req.params.movieId,
    });
    if (!item) {
      return res.status(404).json({ message: "Movie is not in your watchlist" });
    }

    res.status(200).json({ message: "Removed from watchlist" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getWatchlist, saveToWatchlist, removeFromWatchlist };