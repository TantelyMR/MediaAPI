export const clampAndRankTags = (tags = [], scores = {}) =>
  [...tags]
    .sort((a, b) => (scores[b] ?? -1) - (scores[a] ?? -1))
    .slice(0, 33);
