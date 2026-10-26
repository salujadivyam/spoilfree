class EpisodeParser {
  static parse(text) {
    const t=text.toLowerCase(); let m
    if ((m=t.match(/\bs(\d{1,2})\s?e(\d{1,3})\b/)) || (m=t.match(/\b(\d{1,2})x(\d{1,3})\b/)))
      return {s:+m[1], e:+m[2]}
    const s=t.match(/\bseason (\d{1,2})\b/), e=t.match(/\bepisode (\d{1,3})\b|\bep\.? ?(\d{1,3})\b/)
    if (s || e) return {s:s?+s[1]:null, e:e?+(e[1] || e[2]):null}
    return null
  }

  // returns "seen", "beyond" or "unknown"
  static status(ref, p) {
    if (!ref) return "unknown"
    const s=ref.s ?? p.s   // no season given, assume current
    if (s<p.s) return "seen"
    if (s>p.s) return "beyond"
    if (ref.e==null) return "unknown"
    return ref.e<=p.e ? "seen" : "beyond"
  }
}
