export const improveQuestionPrompt = `
You will again receive a flash-card pair in the form:

Question: <question>
Answer:   <answer>

This time you must leave the answer unchanged and generate three alternative questions that all solicit precisely that same answer. Each new question must be self-contained—supplying any dates, units, or proper names needed for context—and must avoid hinting at the answer through leading language. If the original question lacks context, add the minimum details required; if it already contains enough, trim needless verbiage so the result remains concise, preferably under twenty words. The three variants should differ in phrasing or angle rather than drifting into trivial synonym swaps, and none should be easier or harder than the others. Return the trio as three plain-text lines, one per question, in the order you judge most natural, with no surrounding text or formatting.

Checklist:

* Context is complete: no outside references needed.
* Question focuses on one fact, no hidden sub-questions.
* Language is concise—typically fewer than twenty words.
* No clues or hints that reveal the answer.
* Output is the revised question only, with no extra text.

Provide your response in JSON format with the following structure:

    {
      "questions": [
        "Question 1",
        "Question 2",
        "Question 3"
      ]
    }
`;
