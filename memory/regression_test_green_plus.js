// REGRESSION TEST: Green Plus Insertion Logic
// Testing the proposed fix to verify preservation of existing children

console.log("=".repeat(80));
console.log("GREEN PLUS INSERTION LOGIC - REGRESSION TESTS");
console.log("=".repeat(80));

// Current (WRONG) implementation
function currentLogic(segments, depth) {
  return segments.slice(0, depth + 1).concat([""]);
}

// Proposed (CORRECT) implementation
function proposedLogic(segments, depth) {
  return [...segments.slice(0, depth + 1), "", ...segments.slice(depth + 1)];
}

// Test runner
function runTest(testName, segments, depth, expectedResult) {
  console.log(`\n${"─".repeat(80)}`);
  console.log(`TEST: ${testName}`);
  console.log(`${"─".repeat(80)}`);
  console.log(`Input segments: ${JSON.stringify(segments)}`);
  console.log(`Green plus clicked at depth: ${depth} (${segments[depth] || 'N/A'})`);
  console.log(`Expected result: ${JSON.stringify(expectedResult)}`);
  
  const currentResult = currentLogic(segments, depth);
  const proposedResult = proposedLogic(segments, depth);
  
  console.log(`\nCurrent Logic Result:  ${JSON.stringify(currentResult)}`);
  console.log(`Proposed Logic Result: ${JSON.stringify(proposedResult)}`);
  
  const currentMatch = JSON.stringify(currentResult) === JSON.stringify(expectedResult);
  const proposedMatch = JSON.stringify(proposedResult) === JSON.stringify(expectedResult);
  
  console.log(`\nCurrent Logic:  ${currentMatch ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Proposed Logic: ${proposedMatch ? "✅ PASS" : "❌ FAIL"}`);
  
  // Check for data loss
  const originalCount = segments.length;
  const currentCount = currentResult.length;
  const proposedCount = proposedResult.length;
  const expectedCount = originalCount + 1; // Should add one element
  
  console.log(`\nData Preservation Check:`);
  console.log(`  Original length: ${originalCount}`);
  console.log(`  Expected length: ${expectedCount} (+1 for new child)`);
  console.log(`  Current result length:  ${currentCount} ${currentCount === expectedCount ? "✅" : "❌ WRONG"}`);
  console.log(`  Proposed result length: ${proposedCount} ${proposedCount === expectedCount ? "✅" : "❌ WRONG"}`);
  
  // Check if original elements are preserved
  const preservationNeeded = segments.slice(depth + 1);
  if (preservationNeeded.length > 0) {
    console.log(`\nPreservation Check (elements after depth ${depth}):`);
    console.log(`  Must preserve: ${JSON.stringify(preservationNeeded)}`);
    
    const currentPreserved = preservationNeeded.every(elem => currentResult.includes(elem));
    const proposedPreserved = preservationNeeded.every(elem => proposedResult.includes(elem));
    
    console.log(`  Current preserves:  ${currentPreserved ? "✅ YES" : "❌ NO - DATA LOST"}`);
    console.log(`  Proposed preserves: ${proposedPreserved ? "✅ YES" : "❌ NO - DATA LOST"}`);
  }
  
  return { currentMatch, proposedMatch };
}

// Test Suite
let tests = [];

// Test 1: Insert at root with no children (baseline)
tests.push(runTest(
  "Test 1: Insert at M (no existing children)",
  ["Work"],
  0,
  ["Work", ""]
));

// Test 2: Insert at root WITH existing children (CRITICAL)
tests.push(runTest(
  "Test 2: Insert at M (with existing L1)",
  ["Work", "Projects"],
  0,
  ["Work", "", "Projects"]
));

// Test 3: Insert at root with deep hierarchy (CRITICAL)
tests.push(runTest(
  "Test 3: Insert at M (with deep hierarchy)",
  ["Home", "Kitchen", "Recipes", "Desserts"],
  0,
  ["Home", "", "Kitchen", "Recipes", "Desserts"]
));

// Test 4: Insert at L1 with children (CRITICAL)
tests.push(runTest(
  "Test 4: Insert at L1 (with L2 and L3 children)",
  ["Home", "Kitchen", "Recipes", "Desserts"],
  1,
  ["Home", "Kitchen", "", "Recipes", "Desserts"]
));

// Test 5: Insert at L2 with children
tests.push(runTest(
  "Test 5: Insert at L2 (with L3 child)",
  ["Home", "Kitchen", "Recipes", "Desserts"],
  2,
  ["Home", "Kitchen", "Recipes", "", "Desserts"]
));

// Test 6: Insert at deepest level (no children to preserve)
tests.push(runTest(
  "Test 6: Insert at deepest level L3 (no children)",
  ["Home", "Kitchen", "Recipes", "Desserts"],
  3,
  ["Home", "Kitchen", "Recipes", "Desserts", ""]
));

// Test 7: Deep hierarchy (Level 6)
tests.push(runTest(
  "Test 7: Insert at L3 in 6-level hierarchy",
  ["A", "B", "C", "D", "E", "F"],
  3,
  ["A", "B", "C", "D", "", "E", "F"]
));

// Test 8: Insert at L1 in deep hierarchy
tests.push(runTest(
  "Test 8: Insert at L1 in 6-level hierarchy",
  ["A", "B", "C", "D", "E", "F"],
  1,
  ["A", "B", "", "C", "D", "E", "F"]
));

// Summary
console.log(`\n${"=".repeat(80)}`);
console.log("TEST SUMMARY");
console.log(`${"=".repeat(80)}`);

const currentPassed = tests.filter(t => t.currentMatch).length;
const proposedPassed = tests.filter(t => t.proposedMatch).length;
const total = tests.length;

console.log(`\nCurrent Logic:  ${currentPassed}/${total} tests passed ${currentPassed === total ? "✅" : "❌"}`);
console.log(`Proposed Logic: ${proposedPassed}/${total} tests passed ${proposedPassed === total ? "✅" : "❌"}`);

console.log(`\n${"=".repeat(80)}`);
console.log("CONCLUSION");
console.log(`${"=".repeat(80)}`);

if (currentPassed < total) {
  console.log(`❌ Current logic FAILS ${total - currentPassed} tests`);
  console.log(`   Reason: Deletes existing children beyond insertion point`);
}

if (proposedPassed === total) {
  console.log(`✅ Proposed logic PASSES all ${total} tests`);
  console.log(`   Result: Preserves all existing children while inserting new child`);
}

console.log(`\n${"=".repeat(80)}\n`);
