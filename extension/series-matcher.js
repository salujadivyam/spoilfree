class SeriesMatcher {
  // lowercase, no accents, punctuation becomes a space, so "Avengers: Endgame" matches "avengers endgame"
  static norm(s) {
    return s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f'’]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim()
  }

  static compile(items) {
    return items.filter(i => !i.done).map(i => {
      const t=[...new Set(i.terms.map(x => SeriesMatcher.norm(x)).filter(x => x.length>=4))]   // short terms match too much
      return t.length ? {item:i, re:new RegExp(`(?:^| )(?:${t.join("|")})(?: |$)`)} : null
    }).filter(Boolean)
  }

  static findMentions(text, compiled) {
    const n=SeriesMatcher.norm(text)
    return compiled.filter(c => c.re.test(n)).map(c => c.item)
  }
}
