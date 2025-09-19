#!/usr/bin/env node

// Test JSON import scenarios to reproduce the issue
const fs = require('fs');
const path = require('path');

// Create test JSON files with different formats to reproduce the issue

// Legacy format: answers as array with text field
const legacyFormat = [
  {
    "title": "Test Question 1",
    "answers": [
      {"text": "Answer A", "id": "1"},
      {"text": "Answer B", "id": "2"},
      {"text": "Answer C", "id": "3"}
    ]
  },
  {
    "title": "Test Question 2", 
    "answers": [
      {"text": "Option 1"},
      {"text": "Option 2"},
      {"text": "Option 3"}
    ]
  }
];

// Object format: answers as object with IDs as keys
const objectFormat = [
  {
    "title": "Test Question 1",
    "answers": {
      "id1": {"id": "id1", "text": "Answer A"},
      "id2": {"id": "id2", "text": "Answer B"},
      "id3": {"id": "id3", "text": "Answer C"}
    }
  }
];

// Mixed edge cases
const edgeCases = [
  {
    "title": "Question with missing IDs",
    "answers": [
      {"text": "Answer without ID"},
      {"text": "Another answer without ID"}
    ]
  },
  {
    "title": "Question with empty text",
    "answers": [
      {"text": "", "id": "empty"},
      {"text": "Valid answer", "id": "valid"}
    ]
  }
];

const testDir = '/tmp/json-import-tests';
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Write test files
fs.writeFileSync(path.join(testDir, 'legacy-format.json'), JSON.stringify(legacyFormat, null, 2));
fs.writeFileSync(path.join(testDir, 'object-format.json'), JSON.stringify(objectFormat, null, 2));
fs.writeFileSync(path.join(testDir, 'edge-cases.json'), JSON.stringify(edgeCases, null, 2));

console.log('Test JSON files created in:', testDir);
console.log('Files:', fs.readdirSync(testDir));

// Test the conversion logic from App.tsx
function convertAnswersArrayToObject(answersArray) {
  const answersObj = {};
  answersArray.forEach(answer => {
    answersObj[answer.id] = answer;
  });
  return answersObj;
}

// Test import logic simulation
function testImportLogic(questions) {
  console.log('\n=== Testing Import Logic ===');
  console.log('Input:', JSON.stringify(questions, null, 2));
  
  const questionsWithNewIds = questions.map((q) => {
    let answersObj;
    
    if (Array.isArray(q.answers)) {
      // Convert array to object structure
      answersObj = {};
      q.answers.forEach((answer) => {
        const id = answer.id || Date.now().toString() + Math.random().toString();
        answersObj[id] = {
          ...answer,
          id,
        };
      });
    } else {
      // Already object structure, just ensure IDs
      answersObj = {};
      Object.entries(q.answers).forEach(([key, answer]) => {
        const id = answer.id || key || Date.now().toString() + Math.random().toString();
        answersObj[id] = {
          ...answer,
          id,
        };
      });
    }

    return {
      ...q,
      id: Date.now().toString() + Math.random().toString(),
      type: q.type || 'single-choice',
      answers: answersObj,
    };
  });
  
  console.log('Output:', JSON.stringify(questionsWithNewIds, null, 2));
  return questionsWithNewIds;
}

// Test all scenarios
console.log('\n### Testing Legacy Format ###');
testImportLogic(legacyFormat);

console.log('\n### Testing Object Format ###');
testImportLogic(objectFormat);

console.log('\n### Testing Edge Cases ###');
testImportLogic(edgeCases);