class SeriesMatcher {
  static compile(items) {
    const esc=s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    return items.filter(i => !i.done).map(i => {
      const t=i.terms.filter(x => x.length>=4).map(esc)   // short terms match too much
      return t.length ? {item:i, re:new RegExp(`\\b(?:${t.join("|")})\\b`, "i")} : null
    }).filter(Boolean)
  }

  static findMentions(text, compiled) {
    return compiled.filter(c => c.re.test(text)).map(c => c.item)
  }
}
