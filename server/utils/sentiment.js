// A small sentiment analyser for movie reviews.
// Each known word has a score from -3 (very negative) to +3 (very positive).
// We add up the scores of the words in the review, with a few simple rules:
//   - "not", "never", "wasn't"... flip the next few words ("not good" is negative)
//   - "very", "really", "so"... make the next word stronger
//   - "a bit", "kinda", "slightly"... make the next word weaker
//   - after "but" / "however", what comes after counts more than what came before
// The total is then squeezed into a number from -1 to 1.

const WORDS = {
  // positive
  amazing: 3, awesome: 3, brilliant: 3, masterpiece: 3, excellent: 3, outstanding: 3,
  perfect: 3, perfectly: 3, fantastic: 3, incredible: 3, superb: 3, wonderful: 3,
  stunning: 3, hilarious: 3, heartwarming: 3, unforgettable: 3, magnificent: 3,
  flawless: 3, gem: 3, best: 3, favorite: 3, favourite: 3, love: 3, loved: 3,
  beautiful: 2, beautifully: 2, great: 2, good: 2, fun: 2, funny: 2, enjoyed: 2,
  enjoy: 2, enjoyable: 2, lovely: 2, liked: 2, gripping: 2, captivating: 2,
  engaging: 2, entertaining: 2, charming: 2, clever: 2, touching: 2, moving: 2,
  powerful: 2, recommend: 2, recommended: 2, worth: 2, impressive: 2, memorable: 2,
  epic: 2, thrilling: 2, exciting: 2, refreshing: 2, satisfying: 2, wow: 2,
  classic: 2, hooked: 2, rewatch: 2, underrated: 2, fascinating: 2, laughed: 2,
  solid: 1, nice: 1, smart: 1, fresh: 1, original: 1, strong: 1, cool: 1, sweet: 1,
  happy: 1, glad: 1, pleasant: 1, decent: 1, fine: 1, laugh: 1,

  // negative
  terrible: -3, awful: -3, horrible: -3, worst: -3, boring: -3, waste: -3,
  wasted: -3, hate: -3, hated: -3, garbage: -3, trash: -3, unwatchable: -3,
  sucks: -3, sucked: -3,
  bad: -2, bored: -2, dull: -2, disappointing: -2, disappointed: -2,
  disappointment: -2, mediocre: -2, poor: -2, poorly: -2, weak: -2, stupid: -2,
  dumb: -2, predictable: -2, confusing: -2, messy: -2, mess: -2, annoying: -2,
  cringe: -2, cringey: -2, overrated: -2, pointless: -2, forgettable: -2, lame: -2,
  nonsense: -2, painful: -2, tedious: -2, dragged: -2, drags: -2, bland: -2,
  lazy: -2, ugly: -2, worse: -2, fail: -2, failed: -2, failure: -2, lacking: -2,
  unfunny: -2, pretentious: -2, shallow: -2, asleep: -2,
  meh: -1, slow: -1, silly: -1, cliche: -1, cliched: -1, confused: -1, flat: -1,
  cheap: -1, problem: -1, problems: -1, lacks: -1, lack: -1, ridiculous: -1,
};

// words that flip the meaning of the words after them
const NEGATORS = [
  "not", "no", "never", "nothing", "hardly", "barely", "without", "nor", "neither",
  "isnt", "wasnt", "arent", "werent", "dont", "doesnt", "didnt", "cant", "cannot",
  "couldnt", "wont", "wouldnt", "shouldnt", "aint",
];

// words that make the next word stronger
const BOOSTERS = [
  "very", "really", "so", "extremely", "super", "absolutely", "totally",
  "incredibly", "truly", "highly", "too", "most", "completely", "utterly",
];

// words that make the next word weaker
const SOFTENERS = ["kinda", "somewhat", "slightly", "bit", "little", "fairly", "quite"];

// words after which the rest of the sentence matters more
const CONTRAST = ["but", "however", "though", "yet"];

// how many words after "not" are flipped
const NEGATION_REACH = 3;

// Gives back { score, words }:
//   score: from -1 (very negative) to 1 (very positive), 0 when nothing was found
//   words: the words that counted, e.g. ["not good", "boring"]
const analyse = (text) => {
  if (!text || typeof text !== "string") {
    return { score: 0, words: [] };
  }

  // cut the text into pieces at . , ! ? ; so "not" does not reach into the next sentence
  const pieces = text.toLowerCase().split(/[.,!?;:\n]+/);

  // the score of every word that counted, in order
  const scores = [];
  const found = [];

  for (let p = 0; p < pieces.length; p++) {
    // "wasn't" becomes "wasnt", then split into words
    const words = pieces[p].replace(/[’']/g, "").split(/[^a-z]+/);

    let negateLeft = 0; // how many more words are flipped by a "not"
    let strength = 1; // 1.5 after "very", 0.5 after "a bit"

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!word) {
        continue;
      }

      if (CONTRAST.includes(word)) {
        // everything that came before "but" counts half
        for (let k = 0; k < scores.length; k++) {
          scores[k] = scores[k] * 0.5;
        }
        negateLeft = 0;
        strength = 1;
        continue;
      }
      if (NEGATORS.includes(word)) {
        negateLeft = NEGATION_REACH;
        continue;
      }
      if (BOOSTERS.includes(word)) {
        strength = 1.5;
        continue;
      }
      if (SOFTENERS.includes(word)) {
        strength = 0.5;
        continue;
      }

      // "like" is usually not about liking ("it looks like..."), so it only
      // counts after a "not": "didn't like it" is negative
      let base = WORDS[word];
      if (word === "like" && negateLeft > 0) {
        base = 2;
      }

      if (base !== undefined) {
        let value = base * strength;
        let label = word;
        if (negateLeft > 0) {
          // "not good" is negative, but "not bad" is only a little positive
          value = value * -0.75;
          label = "not " + word;
        }
        scores.push(value);
        found.push(label);
        strength = 1;
      }

      if (negateLeft > 0) {
        negateLeft = negateLeft - 1;
      }
    }
  }

  let total = 0;
  for (let k = 0; k < scores.length; k++) {
    total = total + scores[k];
  }

  // squeeze the total into -1..1: a score of 2 gives about 0.46, 6 gives about 0.84
  const score = total / Math.sqrt(total * total + 15);
  return { score: Math.round(score * 100) / 100, words: found };
};

// turns a score into a word for the screen
const labelOf = (score) => {
  if (score >= 0.25) {
    return "positive";
  }
  if (score <= -0.25) {
    return "negative";
  }
  return "neutral";
};

module.exports = { analyse, labelOf };
