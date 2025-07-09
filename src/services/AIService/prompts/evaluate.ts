export const evaluate: string = `## Flashcard Quality Classification Task

### Qualities of Good Flashcards (Question + Answer)

A good flashcard embodies the minimum information principle in both its question and answer - the question asks for exactly one piece of information, and the answer provides exactly that information, no more and no less. The question should be so precisely formulated that there is only one correct answer, eliminating ambiguity or the possibility of multiple valid responses. The answer should be concise, typically just a few words or a single sentence, avoiding unnecessary elaboration or tangential information. Good flashcards are atomic, meaning they test a single concept or fact rather than bundling multiple ideas together. The question-answer pair should be tractable, allowing the learner to reliably retrieve the answer from memory without excessive difficulty, while the answer format should be consistent enough to verify correctness easily.

Context and clarity are essential features throughout the flashcard. The question should be immediately comprehensible without requiring the learner to remember what the card is supposed to be testing, often through subject prefixes or sufficient contextual framing. The answer should match the specificity implied by the question - if the question asks for a year, the answer should be just the year, not a full date or historical narrative. Good flashcards maintain parallel structure between question and answer; a "What" question should have a noun or noun phrase answer, a "When" question should have a time-based answer, and a "How" question should have a process or method as its answer. The answer should never contain information that wasn't asked for, as this creates confusion about what needs to be memorized.

Effective flashcards also consider the retrieval and verification process. The answer should be formulated so that the learner can definitively know whether they got it right or wrong - avoiding subjective descriptions or answers that could be paraphrased many different ways. For factual information, answers should be precise and unambiguous. For conceptual knowledge, answers should capture the essential idea in a memorable, concise form rather than textbook definitions. Good flashcards often include memory hooks, mnemonics, or contextual cues in parentheses after the main answer, clearly separated from the information being tested. The complete flashcard should form a coherent learning unit where success is clearly measurable and the knowledge gained is practically useful.

### Examples of Good Flashcards

1. **Q:** What Git command creates a new branch called "feature-login"?
   **A:** git branch feature-login

2. **Q:** In Python, what does \`range(5, 15, 3)\` return?
   **A:** [5, 8, 11, 14]

3. **Q:** Cellular respiration: Where in the cell does the Krebs cycle occur?
   **A:** In the mitochondrial matrix

4. **Q:** What is the capital of Estonia?
   **A:** Tallinn

5. **Q:** The Battle of Hastings was fought in what year?
   **A:** 1066

6. **Q:** What property of water explains why ice floats?
   **A:** Water expands when it freezes (becomes less dense)

7. **Q:** JavaScript: What method removes and returns the last element from an array?
   **A:** pop()

### Examples of Mediocre and Bad Flashcards

1. **Q:** Describe the process of photosynthesis.
   **A:** Photosynthesis is the process by which plants convert light energy into chemical energy. It occurs in two stages: the light reactions in the thylakoid membranes where ATP and NADPH are produced, and the Calvin cycle in the stroma where CO2 is fixed into glucose...
   **Why it's bad:** Both question and answer violate minimum information principle. The question asks for too much, and the answer provides a lengthy explanation instead of a focused fact.

2. **Q:** Is TCP/IP important for networking?
   **A:** Yes, it's the fundamental protocol suite that enables internet communication
   **Why it's bad:** Yes/no question provides minimal learning value, and the answer includes unrequested elaboration. Better to ask what specific role TCP/IP plays.

3. **Q:** What are some examples of renewable energy sources?
   **A:** Solar, wind, hydro (there are others too like geothermal and biomass)
   **Why it's bad:** "Some examples" allows inconsistent answers, and the parenthetical addition makes it unclear what needs to be memorized. The answer is incomplete by design.

4. **Q:** Who discovered America?
   **A:** Christopher Columbus in 1492, though Vikings reached North America earlier and indigenous peoples were already there
   **Why it's mediocre:** Ambiguous question gets an over-qualified answer trying to compensate for the poor question. The core answer is buried in caveats.

5. **Q:** RAM vs ROM?
   **A:** RAM = Random Access Memory (volatile), ROM = Read Only Memory (non-volatile)
   **Why it's bad:** Question is not even a complete sentence. Answer tries to cover multiple concepts (abbreviations, volatility) in a compressed format that's hard to verify.

6. **Q:** The three branches of US government
   **A:** Legislative, Executive, Judicial
   **Why it's bad:** Not phrased as a question, and tests a set enumeration. While the answer is concise, the format makes it difficult to know if you've recalled all three.

7. **Q:** What happened in 1789?
   **A:** Many things, but most notably the French Revolution began with the storming of the Bastille on July 14
   **Why it's mediocre:** Vague question gets an answer that acknowledges the vagueness ("many things") then provides too much detail for what should be a simple fact.

### Classification Instructions

Evaluate each flashcard using this schema:

**GOOD** - Assign this rating if the flashcard:
- Tests exactly one piece of information via a clear question
- Provides exactly the requested information in the answer
- Has one unambiguous correct answer that's easy to verify
- Uses clear, concise wording in both question and answer
- Maintains parallel structure between what's asked and what's answered
- Tests useful, actively recallable knowledge
- Answer length is appropriate to the question's scope

**MEDIOCRE** - Assign this rating if the flashcard:
- Is mostly clear but question or answer could be more precise
- Answer provides slightly too much or too little information
- Has minor ambiguity that rarely causes problems
- Answer format makes verification somewhat subjective
- Is workable but could be better optimized for learning
- Contains unnecessary elaboration that doesn't interfere with the core learning

**BAD** - Assign this rating if the flashcard:
- Violates the minimum information principle significantly in question or answer
- Question allows multiple answers but answer assumes one interpretation
- Answer includes significant unrequested information
- Lacks necessary context for comprehension
- Uses vague language in question or answer
- Answer format makes it difficult to know if you got it right
- Tests sets/enumerations or lengthy procedures
- Question and answer are mismatched in scope or type

### Alternative Suggestion Instructions

**Only for flashcards rated MEDIOCRE or BAD**, provide exactly three alternative formulations that address the identified issues. Each alternative should:
1. Create a focused question-answer pair targeting one atomic piece of information
2. Ensure the answer directly and concisely addresses only what the question asks
3. Eliminate ambiguity in both question and answer through precise wording
4. Make the answer easy to verify as correct or incorrect
5. Maintain the essential learning objective while improving the flashcard structure

Format your response as JSON, and only JSON, like so:
{
  "classification": "[GOOD/MEDIOCRE/BAD]",
  "reasoning": "[Brief explanation of classification]",
  "alternatives": "[{
    "question": "[Improved question, if in need of improvement]",
    "answer": "[Improved answer, if in need of improvement]"
  }, {
    "question": "[Improved question, if in need of improvement]",
    "answer": "[Improved answer, if in need of improvement]"
  }, {
    "question": "[Improved question, if in need of improvement]",
    "answer": "[Improved answer, if in need of improvement]"
  }]"
}

It is imperative that you only return JSON, and nothing else. DO not include any other text or comments, nor should you include any other formatting, like markdown indicating that it's JSON. Stick to the JSON object format exactly.`;
