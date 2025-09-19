#!/usr/bin/env node

// Test the improved import logic
const fs = require('fs');

// Updated conversion logic based on the fixes
function improvedImportLogic(parsedData) {
  console.log('=== Testing Improved Import Logic ===');
  
  // First validation (same as before)
  const isValid = parsedData.every(
    (q) =>
      q.title &&
      typeof q.title === 'string' &&
      q.title.trim() !== '' &&
      ((Array.isArray(q.answers) && q.answers.length > 0 && q.answers.every((a) => a.text && typeof a.text === 'string' && a.text.trim() !== '')) ||
       (typeof q.answers === 'object' && Object.values(q.answers).length > 0 && Object.values(q.answers).every((a) => a.text && typeof a.text === 'string' && a.text.trim() !== '')))
  );
  
  console.log('Initial validation:', isValid ? 'PASS' : 'FAIL');
  
  if (!isValid) {
    console.log('❌ Would be rejected at validation stage');
    return null;
  }
  
  // Improved conversion logic
  const questionsWithNewIds = parsedData.map((q, questionIndex) => {
    let answersObj = {};
    
    if (Array.isArray(q.answers)) {
      // Convert array to object structure, filtering out invalid answers
      let validAnswerIndex = 0;
      q.answers.forEach((answer, originalIndex) => {
        // Only process answers with valid text content
        if (answer.text && typeof answer.text === 'string' && answer.text.trim() !== '') {
          // Generate more predictable and sequential IDs
          const id = answer.id && answer.id.trim() !== '' ? answer.id : `answer-${questionIndex}-${validAnswerIndex}`;
          answersObj[id] = {
            ...answer,
            id,
            text: answer.text.trim(), // Ensure text is trimmed
          };
          validAnswerIndex++;
        }
      });
    } else {
      // Already object structure, just ensure IDs and filter invalid answers
      let validAnswerIndex = 0;
      Object.entries(q.answers).forEach(([key, answer]) => {
        // Only process answers with valid text content
        if (answer.text && typeof answer.text === 'string' && answer.text.trim() !== '') {
          const id = answer.id && answer.id.trim() !== '' ? answer.id : (key && key.trim() !== '' ? key : `answer-${questionIndex}-${validAnswerIndex}`);
          answersObj[id] = {
            ...answer,
            id,
            text: answer.text.trim(), // Ensure text is trimmed
          };
          validAnswerIndex++;
        }
      });
    }

    return {
      ...q,
      id: `question-${questionIndex}`,
      type: q.type || 'single-choice',
      answers: answersObj,
    };
  });

  // Final validation: ensure each question has at least one valid answer after filtering
  const hasValidAnswers = questionsWithNewIds.every(q => Object.keys(q.answers).length > 0);
  
  if (!hasValidAnswers) {
    console.log('❌ Would be rejected - some questions have no valid answers after filtering');
    return null;
  }
  
  console.log('✅ All validations passed');
  return questionsWithNewIds;
}

// Test cases
const testCases = [
  {
    name: 'Valid template (education-learning style)',
    data: [
      {
        "title": "Why do you want to learn?",
        "answers": [
          {"text": "A. Career growth"},
          {"text": "B. Personal interest"},
          {"text": "C. Academic success"}
        ]
      }
    ]
  },
  {
    name: 'Legacy format with existing IDs',
    data: [
      {
        "title": "Test question",
        "answers": [
          {"text": "Answer 1", "id": "legacy-1"},
          {"text": "Answer 2", "id": "legacy-2"}
        ]
      }
    ]
  },
  {
    name: 'Mixed valid/invalid answers (should filter)',
    data: [
      {
        "title": "Question with some invalid answers",
        "answers": [
          {"text": "  "}, // whitespace - should be filtered
          {"text": "Valid answer 1"},
          {"text": ""}, // empty - should be filtered
          {"text": "Valid answer 2"}
        ]
      }
    ]
  },
  {
    name: 'All invalid answers (should be rejected)',
    data: [
      {
        "title": "Question with all invalid answers",
        "answers": [
          {"text": "  "},
          {"text": ""},
          {"id": "no-text"}
        ]
      }
    ]
  },
  {
    name: 'Object format (new style)',
    data: [
      {
        "title": "Modern object format",
        "answers": {
          "id1": {"id": "id1", "text": "Answer A"},
          "id2": {"id": "id2", "text": "Answer B"}
        }
      }
    ]
  }
];

// Run all test cases
testCases.forEach(testCase => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${testCase.name}`);
  console.log(`${'='.repeat(60)}`);
  
  const result = improvedImportLogic(testCase.data);
  
  if (result) {
    console.log('\n✅ Import successful! Results:');
    result.forEach((q, i) => {
      console.log(`\nQuestion ${i+1}: "${q.title}" (ID: ${q.id})`);
      Object.entries(q.answers).forEach(([key, answer], j) => {
        console.log(`  Answer ${j+1}: "${answer.text}" (ID: ${answer.id})`);
      });
    });
  } else {
    console.log('\n❌ Import failed (correctly rejected invalid data)');
  }
});

console.log(`\n${'='.repeat(60)}`);
console.log('Test Summary Complete');
console.log(`${'='.repeat(60)}`);