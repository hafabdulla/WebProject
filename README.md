# MovieHive

MovieHive is a social movie platform built with the MERN stack (MongoDB, Express, React, Node.js).
You can browse and search movies, keep a watchlist, write reviews, make movie lists with friends,
chat, talk on the forum, and get recommendations that learn from how your reviews sound.

Movie data (titles, posters, trailers, cast) comes from [TMDB](https://www.themoviedb.org/).

**Live site:** _add the Vercel link here after deploying_

## Features

- **Accounts**: sign up and log in with JWT. Admins and normal users have different roles, and blocked users can't log in.
- **Movies**: popular, trending, top rated and upcoming lists, search, genre and year filters, and a details page with trailer, cast and director.
- **Watchlist**: mark movies as "want to watch" or "watched".
- **Reviews**: 1 to 5 stars plus text. You can edit, delete and like reviews, with one review per movie per user.
- **Sentiment analysis**: every review gets a tone score (positive, neutral or negative) from its words. The review form shows the tone while you type.
- **Personal recommendations**:
  - The app tracks how you feel about each genre, from your stars and the tone of your words.
  - "Picked for you" suggests movies from genres you like.
  - If you keep disliking a genre, it is paused for 30 days and its watchlist movies move to a "Paused for now" section. You can resume it early.
- **Mood recommendations**: pick a mood (feel good, intense, mind bending...) and get matching movies.
- **Friends**: search users, send, accept or decline friend requests, and see public profile pages.
- **Custom lists**: make movie lists and invite friends to edit them together. Changes show up live.
- **Chat**: private messages between friends, in real time with Socket.IO, with read receipts and unread counts.
- **Notifications**: friend requests, list invites and new messages, delivered live.
- **Forum**: boards, threads and replies. Users can edit or delete their own posts and report bad ones.
- **Admin dashboard**: site stats with charts, and user management (change roles, block accounts).

## Tech stack

| Part | Tools |
| --- | --- |
| Frontend | React 19, Vite, Redux Toolkit, React Router, Socket.IO client |
| Backend | Node.js, Express 5, Mongoose, Socket.IO, JWT, bcryptjs |
| Database | MongoDB Atlas |
| Movie data | TMDB API |
| Hosting | Vercel (frontend), Render (backend) |

## Project structure

```
WebProject/
├── client/                 React app (Vite)
│   ├── src/
│   │   ├── components/     reusable parts (Navbar, MovieCard, Reviews...)
│   │   ├── pages/          one file per page (Home, MovieDetails, Chat...)
│   │   ├── store/          Redux (login state)
│   │   └── socket.js       the live connection to the server
│   ├── vercel.json         Vercel settings (forwards /api to the server)
│   └── vite.config.js      forwards /api to the server on your PC
├── server/                 Express API
│   ├── config/             database connection, allowed websites (CORS)
│   ├── controllers/        what each route does
│   ├── middleware/         login check (protect) and admin check
│   ├── models/             Mongoose schemas
│   ├── routes/             the API addresses
│   ├── utils/              TMDB helper, sentiment analyser, genre taste, notifications
│   ├── socket.js           Socket.IO setup
│   └── index.js            starts the server
└── docs/                   project proposal
```

## Running it on your PC

You need [Node.js](https://nodejs.org/) 20 or newer, a MongoDB Atlas database and a TMDB API key.

1. **Get the code**

   ```
   git clone https://github.com/hafabdulla/WebProject.git
   cd WebProject
   ```

2. **Set up the server**

   ```
   cd server
   npm install
   ```

   Copy `server/.env.example` to `server/.env` and fill it in:

   | Name | What it is |
   | --- | --- |
   | `PORT` | `5000` |
   | `MONGO_URI` | your MongoDB Atlas connection link |
   | `JWT_SECRET` | any long random text, used to sign logins |
   | `CLIENT_URL` | `http://localhost:5173` (several sites can be separated by commas) |
   | `TMDB_API_KEY` | your TMDB API key |

   Then start it:

   ```
   npm run dev
   ```

3. **Set up the client**, in a second terminal:

   ```
   cd client
   npm install
   npm run dev
   ```

4. Open http://localhost:5173

To make yourself an admin, open the `users` collection in MongoDB Atlas and change your
user's `role` from `user` to `admin`, then log out and in again.

## Deploying

The backend goes on Render and the frontend on Vercel. Both have free plans.

### 1. MongoDB Atlas

In Atlas, go to **Network Access** and add the address `0.0.0.0/0` (allow from anywhere).
Render's servers don't have a fixed address, so Atlas has to accept all of them.

### 2. Backend on Render

1. On [render.com](https://render.com), click **New > Web Service** and connect this GitHub repo.
2. Fill in:
   - **Name**: `moviehive-api`
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path** (under Advanced): `/api/health`
3. Add the environment variables: `MONGO_URI`, `JWT_SECRET`, `TMDB_API_KEY`, and
   `CLIENT_URL` (for now `http://localhost:5173`; you add the Vercel link in step 4).
   Don't add `PORT`, because Render sets it.
4. Deploy, then copy the address Render gives you, e.g. `https://moviehive-api.onrender.com`.

### 3. Frontend on Vercel

1. `client/vercel.json` forwards `/api` to our Render address, `https://moviehive-api-p8nc.onrender.com`.
   If you deploy your own copy, put your Render address there instead and push.
2. On [vercel.com](https://vercel.com), click **Add New > Project** and import this repo.
3. Fill in:
   - **Root Directory**: `client` (Vercel then detects Vite by itself)
   - **Environment Variable**: `VITE_SERVER_URL` = your Render address, e.g. `https://moviehive-api.onrender.com`
4. Deploy and copy the Vercel address, e.g. `https://moviehive.vercel.app`.

### 4. Connect them

On Render, set `CLIENT_URL` to your Vercel address. To keep your PC working too, add both:

```
CLIENT_URL=http://localhost:5173,https://moviehive.vercel.app
```

Render restarts by itself. The site is now live.

### How the deployed parts talk to each other

- The browser sends API requests (`/api/...`) to Vercel. `vercel.json` forwards them to Render,
  so the React code uses the same `/api/...` addresses on your PC and online.
- The live connection for chat and notifications can't be forwarded by Vercel, so the browser
  connects straight to Render, using `VITE_SERVER_URL`. Render only accepts it from the sites in `CLIENT_URL`.
- On Render's free plan the server sleeps after 15 minutes with no visitors. The first request after
  that takes about a minute while it wakes up.

## API overview

Every route starts with `/api`. 🔒 means you have to be logged in, and 🛡️ means admin only.

| Route | What it does |
| --- | --- |
| `/auth` | register, login, `/me` |
| `/movies` | categories, search, discover, genres, moods, movie details |
| `/watchlist` 🔒 | get, add or update, remove |
| `/reviews` | movie reviews, user reviews, `/mine` 🔒, write, edit, delete, like; all reviews 🛡️ |
| `/taste` 🔒 | genre taste, suggestions, resume a paused genre, analyse text |
| `/friends` 🔒 | friends, requests, accept, decline, remove, status |
| `/users` | search users, public user info |
| `/lists` 🔒 | lists, items, members, invites |
| `/chat` 🔒 | conversations, messages, send, mark read, unread count |
| `/notifications` 🔒 | list, mark read |
| `/forum` | boards, threads, replies, reports (the reports list is 🛡️) |
| `/admin` 🛡️ | stats, users, change role, block |
