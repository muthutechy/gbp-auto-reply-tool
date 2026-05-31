const templates = [
  "Thank you for your feedback!",
  "We appreciate your kind words!",
  "Thanks for sharing your experience!",
  "We're glad you had a good experience!",
  "Thank you for choosing us!",
];

function getRandomOpening() {
  return templates[Math.floor(Math.random() * templates.length)];
}

module.exports = { getRandomOpening, templates };
