#!/usr/bin/env node

// Test actual template imports to identify real issues
const fs = require('fs');
const path = require('path');

const templatesDir = '/home/runner/work/funnel-editor-2025/funnel-editor-2025/public/templates';

// Read all template files
const templateFiles = fs.readdirSync(templatesDir).filter(f => f.endsWith('.json'));

console.log('Testing template files:', templateFiles);

// Simulate the exact import logic from App.tsx
function simulateImport(templatePath) {
  console.log(`\n=== Testing ${path.basename(templatePath)} ===`);
  
  const content = fs.readFileSync(templatePath, 'utf8');
  const parsedData = JSON.parse(content);
  
  console.log('Original data structure:');
  console.log('- Number of questions:', parsedData.length);
  parsedData.forEach((q, i) => {
    console.log(`- Q${i+1}: "${q.title}" has ${Array.isArray(q.answers) ? q.answers.length : Object.keys(q.answers).length} answers`);
    if (Array.isArray(q.answers)) {
      q.answers.forEach((a, j) => {
        console.log(`  - A${j+1}: "${a.text}" (ID: ${a.id || 'MISSING'})`);
      });
    } else {
      Object.entries(q.answers).forEach(([key, a], j) => {
        console.log(`  - A${j+1}: "${a.text}" (ID: ${a.id || key})`);
      });
    }
  });
  
  // Apply the validation logic from App.tsx
  const isValid = parsedData.every(
    (q) =>
      q.title &&
      typeof q.title === 'string' &&
      q.title.trim() !== '' &&
      ((Array.isArray(q.answers) && q.answers.length > 0 && q.answers.every((a) => a.text && typeof a.text === 'string' && a.text.trim() !== '')) ||
       (typeof q.answers === 'object' && Object.values(q.answers).length > 0 && Object.values(q.answers).every((a) => a.text && typeof a.text === 'string' && a.text.trim() !== '')))
  );
  
  console.log('Validation result:', isValid ? 'PASS' : 'FAIL');
  
  if (!isValid) {
    console.log('Issues found:');
    parsedData.forEach((q, i) => {
      if (!q.title || typeof q.title !== 'string' || q.title.trim() === '') {
        console.log(`- Q${i+1}: Invalid title`);
      }
      if (Array.isArray(q.answers)) {
        q.answers.forEach((a, j) => {
          if (!a.text || typeof a.text !== 'string' || a.text.trim() === '') {
            console.log(`- Q${i+1} A${j+1}: Invalid text`);
          }
        });
      } else if (typeof q.answers === 'object') {
        Object.values(q.answers).forEach((a, j) => {
          if (!a.text || typeof a.text !== 'string' || a.text.trim() === '') {
            console.log(`- Q${i+1} A${j+1}: Invalid text`);
          }
        });
      } else {
        console.log(`- Q${i+1}: Answers is not array or object`);
      }
    });
  }
  
  // Apply conversion logic
  const questionsWithNewIds = parsedData.map((q) => {
    let answersObj;
    
    if (Array.isArray(q.answers)) {
      // Convert array to object structure
      answersObj = {};
      q.answers.forEach((answer, index) => {
        const id = answer.id || `generated-${Date.now()}-${index}`;
        answersObj[id] = {
          ...answer,
          id,
        };
      });
    } else {
      // Already object structure, just ensure IDs
      answersObj = {};
      Object.entries(q.answers).forEach(([key, answer]) => {
        const id = answer.id || key || `generated-${Date.now()}-${Math.random()}`;
        answersObj[id] = {
          ...answer,
          id,
        };
      });
    }

    return {
      ...q,
      id: `question-${Date.now()}-${Math.random()}`,
      type: q.type || 'single-choice',
      answers: answersObj,
    };
  });
  
  console.log('Converted structure:');
  questionsWithNewIds.forEach((q, i) => {
    console.log(`- Q${i+1}: "${q.title}" (ID: ${q.id})`);
    Object.entries(q.answers).forEach(([key, a], j) => {
      console.log(`  - A${j+1}: "${a.text}" (ID: ${a.id})`);
    });
  });
  
  return questionsWithNewIds;
}

// Test each template file
templateFiles.forEach(filename => {
  const fullPath = path.join(templatesDir, filename);
  try {
    simulateImport(fullPath);
  } catch (error) {
    console.log(`ERROR processing ${filename}:`, error.message);
  }
});