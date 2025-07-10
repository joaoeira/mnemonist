export const improveAnswerPrompt = `You will receive a flash-card pair formatted exactly like this:

Question: <question>
Answer:   <answer>

Leave the question untouched. Your task is to generate exactly three alternative answers that a knowledgeable student could correctly give in response to the same question. Each answer must preserve the full factual content of the original, while improving its clarity, focus, and phrasing. Your rewrites should be as concise as possible without omitting any critical information. If the original answer contains key terms (e.g., specific people, inventions, substances, dates, or mechanisms), these must be preserved or replaced only with equally precise alternatives. Do not generalize, abstract, or blur the meaning. Each rewritten answer must also differ meaningfully in phrasing or emphasis—avoid trivial paraphrases or reordered duplicates.

Keep the language clean, direct, and unambiguous. The ideal answer is focused, self-contained, and easy to recall, without being vague or reductive.

Quality guidelines for each answer
• Clear and precise
• No missing essential terms
• Distinct from the others in form or emphasis
• As short as possible, but never at the expense of meaning

Provide your response in JSON format with the following structure:
    {
      "answers": [
        "Answer 1",
        "Answer 2",
        "Answer 3"
      ]
    }

Do not echo the question, include commentary, or wrap the line in any additional formatting.


`;
