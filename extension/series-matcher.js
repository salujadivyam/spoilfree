class SeriesMatcher {
  static matchAgainstTVMazeData(text, tvmazeData) {
  if (!tvmazeData || !tvmazeData.found) {
    return {
      matched: false,
      score: 0
    };
  }

  const textLower = text.toLowerCase();
//matches show titles
  if (
    tvmazeData.name &&
    textLower.includes(tvmazeData.name.toLowerCase())
  ) {
    return {
      matched: true,
      score: 10
    };
  }

  //matches characters
  for (const character of tvmazeData.characters || []) {
    if (!character) continue;

    const charName = character.toLowerCase().trim();

    if (charName.length < 4) continue;

    const escaped = charName.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const regex = new RegExp(`\\b${escaped}\\b`, "i");

    if (regex.test(textLower)) {
      return {
        matched: true,
        score: 5
      };
    }
  }

  //match episode titles
  for (const episode of tvmazeData.episodes || []) {
    if (!episode) continue;

    const epName = episode.toLowerCase().trim();

    if (epName.length < 6) continue;

    if (textLower.includes(epName)) {
      return {
        matched: true,
        score: 3
      };
    }
  }

  return {
    matched: false,
    score: 0
  };
}

  
  static levenshteinDistance(str1, str2) {
    const track = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) {
      track[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      track[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator =
          str1[i - 1] === str2[j - 1] ? 0 : 1;

        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }

    return track[str2.length][str1.length];
  }

  static match(extractedSeries, activeSeries, threshold = 0.7) {
    if (!extractedSeries || activeSeries.length === 0) {
      return {
        matched: false,
        seriesName: null,
        score: 0
      };
    }

    let bestMatch = {
      matched: false,
      seriesName: null,
      score: 0
    };

    for (const watchlistTitle of activeSeries) {
      const norm1 = extractedSeries.toLowerCase().trim();
      const norm2 = watchlistTitle.toLowerCase().trim();

      if (norm1 === norm2) {
        return {
          matched: true,
          seriesName: watchlistTitle,
          score: 1
        };
      }

      if (
        norm1.includes(norm2) ||
        norm2.includes(norm1)
      ) {
        return {
          matched: true,
          seriesName: watchlistTitle,
          score: 0.85
        };
      }

      const distance = this.levenshteinDistance(
        norm1,
        norm2
      );

      const maxLen = Math.max(
        norm1.length,
        norm2.length
      );

      const score = Math.max(
        0,
        1 - distance / maxLen
      );

      if (score > bestMatch.score) {
        bestMatch = {
          matched: score >= threshold,
          seriesName: watchlistTitle,
          score
        };
      }
    }

    return bestMatch;
  }
}