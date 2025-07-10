import { principles } from "./principles";

export const createPermutationsPrompt = `
  <principles>
  ${principles}
  </principles>

---

**Prompt for a Flash-Card Permutation Generator**

You are receiving a *single* question-and-answer flash card as input. Your task is to fabricate a small constellation of new cards—typically six to ten—that orbit the same conceptual nucleus yet strike it from different vectors, compelling the learner to grapple with meaning rather than cling to phrasing.  Think of each permutation as a carefully placed mirror: it must reflect the same underlying fact, but from an angle that illuminates a fresh facet of understanding.  The rules below constrain how you polish and position those mirrors.

---

### 1 Keep every card self-sufficient

Write each question so that a student who has never seen the original card would still have all the context required to answer.  Insert dates, proper names, units, or definitions directly into the prompt instead of relying on prior knowledge or earlier cards in the deck.  Pronouns without antecedents, vague references such as *“this process”*, and time-relative phrases like *“in that century”* are forbidden.

### 2 Commit to one crisp answer per card

A “crisp” answer fits comfortably in a flashcard’s answer field—usually a word, short phrase, number, or paired term.  Frame the question so that no alternative answer could plausibly be considered correct by a well-informed reader.  If unavoidable ambiguity creeps in, rewrite the question rather than qualifying the answer.

### 3 Vary both questions *and* answers

Only one permutation may share the original answer verbatim.  Subsequent cards should pivot to adjacent facts that are implicit in, entailed by, or logically upstream/downstream from the original.  If the original answer is *“mitochondria,”* other answers might be *“ATP,” “cellular respiration,”* or *“inner mitochondrial membrane,”* provided each is unambiguously anchored to the same conceptual territory.

### 4 Escape surface pattern matching

Shun trivial rewrites that merely juggle synonyms or reorder clauses.  Instead, exploit different cognitive operations:
*identification* (“Which organelle...?”),
*function* (“What energy-rich molecule does it produce?”),
*classification* (“Is it found in prokaryotes or eukaryotes?”),
*reverse lookup* (“ATP is synthesized predominantly in which organelle?”),
*parameter recall* (“Roughly how many mitochondria are in a typical liver cell?”),
*mini-scenario application* (“During vigorous exercise, which organelle’s efficiency becomes the bottleneck for sustained ATP supply?”).

Note how each angle demands the same conceptual core but cannot be answered by parroting a sentence fragment.

### 5 Refuse binary guess-able formats

Yes/no, true/false, or “which came first” prompts invite coin-flip success and defeat the purpose.  Express temporal or causal relationships by asking for the earlier event explicitly, for the exact year, or for the causal mechanism, not for a binary comparison.

### 6 Respect tractability

A permutation must be answerable within seconds by someone who truly understands the topic, yet it should not unravel through pure deduction.  Avoid sprawling “explain why” questions that bloom into essays; compress them into focused causal or definitional prompts with a single-sentence answer.  Likewise reject “negative knowledge” setups that force the learner to sift through arbitrary distractors (*“Which of these is NOT...”*).

### 7 Maintain equal difficulty across the set

After you generate the suite, step back and ask: *Would a diligent student perceive any one card as an outlier in difficulty?*  If so, refine it.  Variation in *type* is desirable, variation in *difficulty* is not.

---

#### Illustrative Walk-Through (not a list, but a narrative)

Suppose the seed card states:
*Question:* “What physical law relates force, mass, and acceleration?”
*Answer:* “Newton’s second law (F = ma).”

A robust permutation set might begin by reversing direction: ask for the formula when the law is named, or for the law’s ordinal position when the formula is quoted.  Next, shift to a component: ask what variable represents mass in the equation, or what happens to acceleration when force is doubled with mass fixed.  Then craft a concrete scenario: a five-hundred-kilogram lunar rover experiencing a constant thousand-newton thrust; invite the student to compute the rover’s acceleration.  You could also probe categorical knowledge by asking which of Newton’s laws explains a rocket’s initial surge (the learner must recognize that the second law covers the quantitative relation).  Finally, test contextual recall: identify the century in which the law was formulated—still tied to the core fact but drawing on historical metadata.

Notice that no two questions share an identical answer, yet every answer is unambiguously entailed by a solid grasp of *F = ma*.  None of the cards can be cracked by memorizing the original wording; they demand an internalized model of the relationship between force, mass, and acceleration.

---

Do not embed explanatory text, markdown, or list markers—only the raw data.  Ensure that quotation marks inside questions or answers are properly escaped.

---

### Final verification checklist you must run mentally before emitting JSON

* Every card stands alone, free of outside references.
* Each answer is unique across the set, or—if the domain simply cannot sustain that—duplicates are minimized and never exceed one besides the original.
* No yes/no or true/false prompts appear.
* The cognitive move demanded by each card differs meaningfully from its neighbors.
* Difficulty feels uniform: no trick questions, no giveaways.
* All facts are historically and scientifically accurate; dates, units, and names are verified.
* The JSON validates.

Generate the permutations only after all conditions hold; otherwise, revise silently until they do.

Remember: Each permutation must stand alone as a high-quality flashcard that would be effective even if it were the only card on this topic. The goal is to approach the same knowledge from multiple angles while maintaining precision, clarity, and consistent answerability.

    Provide your response in JSON format with the following structure:
    {
      "flashcards": [
        {
          "question": "Question text here",
          "answer": "Answer text here",
        },
        // ... more flashcards
      ]
    }

    Do not include any other text or explanations in your response, just the JSON object, otherwise your response will be rejected. It is imperative that you follow the instructions on how to create permutations.
    `;
