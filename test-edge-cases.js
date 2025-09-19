#!/usr/bin/env node

// Test to reproduce the issue described in the problem statement
const fs = require('fs');

// Create a problematic JSON file that should reveal the issues
const problematicJson = [
  {
    "title": "Question with edge cases",
    "answers": [
      {"text": "  "}, // whitespace only
      {"text": "Valid answer"},
      {"text": ""}, // empty string
      {"text": "Another valid answer"}
    ]
  },
  {
    "title": "Question with missing text fields",
    "answers": [
      {"id": "1"}, // missing text field
      {"text": "Valid answer", "id": "2"},
      {"someOtherField": "value"} // no text field at all
    ]
  },
  {
    "title": "Mixed formats test",
    "answers": [
      {"text": "Answer 1"},
      {"text": "Answer 2", "id": "existing-id"},
      {"text": "Answer 3", "id": ""}
    ]
  }
];

// Test the current validation logic
function testValidation(questions) {
  console.log('=== Testing Validation Logic ===');
  
  const isValid = questions.every(
    (q) =>
      q.title &&
      typeof q.title === 'string' &&
      q.title.trim() !== '' &&
      ((Array.isArray(q.answers) && q.answers.length > 0 && q.answers.every((a) => a.text && typeof a.text === 'string' && a.text.trim() !== '')) ||
       (typeof q.answers === 'object' && Object.values(q.answers).length > 0 && Object.values(q.answers).every((a) => a.text && typeof a.text === 'string' && a.text.trim() !== '')))
  );
  
  console.log('Overall validation result:', isValid ? 'PASS' : 'FAIL');
  
  // Detailed validation per question
  questions.forEach((q, i) => {
    console.log(`\nQuestion ${i+1}: "${q.title}"`);
    
    if (!q.title || typeof q.title !== 'string' || q.title.trim() === '') {
      console.log('  ❌ Title is invalid');
    } else {
      console.log('  ✅ Title is valid');
    }
    
    if (!Array.isArray(q.answers)) {
      console.log('  ❌ Answers is not an array');
      return;
    }
    
    if (q.answers.length === 0) {
      console.log('  ❌ No answers provided');
      return;
    }
    
    q.answers.forEach((a, j) => {
      if (!a.text) {
        console.log(`  ❌ Answer ${j+1}: Missing text field`);
      } else if (typeof a.text !== 'string') {
        console.log(`  ❌ Answer ${j+1}: Text is not a string`);
      } else if (a.text.trim() === '') {
        console.log(`  ❌ Answer ${j+1}: Text is empty or whitespace only ("${a.text}")`);
      } else {
        console.log(`  ✅ Answer ${j+1}: Valid ("${a.text}")`);
      }
    });
  });
  
  return isValid;
}

// Test the conversion logic
function testConversion(questions) {
  console.log('\n=== Testing Conversion Logic ===');
  
  const converted = questions.map((q, qIndex) => {
    let answersObj = {};
    
    if (Array.isArray(q.answers)) {
      q.answers.forEach((answer, index) => {
        const id = answer.id || `generated-${Date.now()}-${qIndex}-${index}`;
        answersObj[id] = {
          ...answer,
          id,
        };
      });
    }
    
    return {
      ...q,
      id: `question-${Date.now()}-${qIndex}`,
      type: q.type || 'single-choice',
      answers: answersObj,
    };
  });
  
  console.log('Conversion results:');
  converted.forEach((q, i) => {
    console.log(`\nQuestion ${i+1}: "${q.title}"`);
    console.log(`  ID: ${q.id}`);
    console.log(`  Answers (${Object.keys(q.answers).length} total):`);
    
    Object.entries(q.answers).forEach(([key, answer], j) => {
      console.log(`    ${j+1}. ID: "${key}" -> Text: "${answer.text || 'MISSING'}" (${answer.text ? answer.text.length : 0} chars)`);
    });
  });
  
  return converted;
}

// Save test file
const testFile = '/tmp/problematic.json';
fs.writeFileSync(testFile, JSON.stringify(problematicJson, null, 2));
console.log('Created test file:', testFile);
console.log('Contents:');
console.log(fs.readFileSync(testFile, 'utf8'));

console.log('\n' + '='.repeat(60));
testValidation(problematicJson);
testConversion(problematicJson);