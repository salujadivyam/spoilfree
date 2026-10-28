# Labeling guide

**Spoiler (1):** text reveals something that happens after the premise: a death, twist,
identity reveal, betrayal, who wins, how it ends.

**Not a spoiler (0):** premise and setup, who the characters are, opinions, ratings,
cast and release news, and any text that says it is spoiler free.

One test for every example: with the show name covered, does the text tell a new viewer
something that happens in the story after the setup? If yes, label 1. One reveal is
enough to make a whole chunk a 1, however minor it is.

## Hard cases

- "The ending is amazing" with no detail: 0 (opinion, no reveal)
- "A man is murdered and a detective investigates": 0 (setup)
- "The detective turns out to be the murderer": 1
- "No spoilers, but you will cry": 0
- Reveal with no show name ("she dies at the end"): 1
- "There is a huge twist" with no detail: 0
- Vague hype ("wait until season 3", "that finale!"): 0
- "I cried at the end" or other reactions with no plot fact: 0, even when the review is
  spoiler-flagged
- "I can't believe they killed him off": 1 (the reaction leaks the event)
- First episode or opening scenes: 0 (setup), but its final-minute cliffhanger: 1
- One reveal sentence inside otherwise harmless text: 1
- Book plot for an adapted show or film: 1
- Fan theory clearly framed as a guess: 0, but a stated plot fact: 1
- A real reveal inside a non-spoiler review: 1 (the review flag does not override the text)
- Cast, casting, release dates, awards, box office: 0
- Character "leaves the show" with no outcome (casting news): 0, "dies": 1

If you cannot decide, drop the example. A missing example is better than a noisy label.
When a sentence is borderline, lean toward 0: a false blur on harmless text is more
visible to the user than a missed spoiler.

## Dataset rules (build_dataset.py)

- Spoiler chunks: late synopsis sentences with a reveal cue, plus review sentences from
  spoiler-labeled reviews with a reveal cue.
- Safe chunks: plot_summary, early synopsis without cues, sentences from non-spoiler reviews.
- Sentences from spoiler reviews with no cue are dropped (label unknown).
- Split by movie_id so test movies are never seen in training.

## Quality checks

- **Source balance:** keep the 0/1 ratio similar within each source (synopsis, plot
  summary, reviews). Otherwise the model can learn "synopsis style means 1" instead of
  "reveal means 1". Include safe examples taken from synopses, such as early,
  event-light sentences.
- **Cue noise:** the reveal cue is a keyword proxy. Hand-check about 100 cue-labelled 1s
  and 100 cue-free 0s, and fix the cue list if either set is noisy.
- **Review-label noise:** a review flagged as spoiler can contain opinion-only sentences
  with a cue word, and a safe review can contain a real reveal. Drop or relabel these
  per the hard cases above.
- **Duplicates:** remove copies and near-copies so one sentence does not dominate.
- **Second labeller:** have someone else label about 10% of a sample. If you disagree on
  more than 1 in 10, tighten the rules above.
- **Real-world test set:** keep a small hand-labelled set from the places the extension
  actually runs (Reddit comments, Google AI Overview lines, headlines, TV discussion).
  Reviews and synopses are not the same domain, so trust this set over the movie_id test
  split when they disagree.
