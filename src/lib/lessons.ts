import type { CellMap, Scalar } from "./formula";

export type Step = {
  id: string;
  type: "formula";
  title: string;
  scenario: string;
  prompt: string;
  cols: number;
  rows: number;
  workbook: CellMap;
  targetCells: string[];
  validation: { mode: "value" | "formula_pattern"; acceptedValues: Scalar[]; requiredFunctions?: string[]; forbidHardcoded?: boolean; requireAbsolute?: boolean };
  hints: [string, string, string];
  solution: string;
  explanation: string;
  commonMistakes?: { pattern: string; message: string }[];
};
export type Lesson = { id: string; track: string; title: string; summary: string; objectives: string[]; estimatedMinutes: number; steps: Step[] };

// Shared datasets
const sales: CellMap = {
  A1: "Store", B1: "Region", C1: "Units", D1: "Price", E1: "Revenue",
  A2: "Harbor St", B2: "North", C2: "120", D2: "4.5",
  A3: "Elm Ave", B3: "South", C3: "85", D3: "4.5",
  A4: "Pier 9", B4: "North", C4: "142", D4: "5",
  A5: "Oak Plaza", B5: "East", C5: "64", D5: "4",
  A6: "Mill Rd", B6: "South", C6: "98", D6: "5",
};
const staff: CellMap = {
  A1: "ID", B1: "Name", C1: "Dept", D1: "Salary",
  A2: "E101", B2: "Amara Diallo", C2: "Finance", D2: "64000",
  A3: "E102", B3: "Jonas Weber", C3: "Ops", D3: "52000",
  A4: "E103", B4: "Priya Nair", C4: "Marketing", D4: "58000",
  A5: "E104", B5: "Leo Martins", C5: "Finance", D5: "71000",
  A6: "E105", B6: "Sofia Rossi", C6: "HR", D6: "49000",
};
const s = (overrides: CellMap, base: CellMap = {}) => ({ ...base, ...overrides });

let n = 0;
const step = (p: Omit<Step, "id" | "type" | "cols" | "rows"> & { cols?: number; rows?: number }): Step => ({ id: `s${++n}`, type: "formula", cols: 6, rows: 9, ...p });

export const LESSONS: Lesson[] = [
  {
    id: "basics", track: "Basics", title: "Formulas & arithmetic", summary: "Write your first formulas and let the sheet do the math.",
    objectives: ["Start formulas with =", "Use cell references", "Multiply across columns"], estimatedMinutes: 4,
    steps: [
      step({ title: "Your first formula", scenario: "You run a small coffee chain. Each store reports units sold and price per bag.", prompt: "In E2, calculate revenue for Harbor St (Units × Price).", workbook: sales, targetCells: ["E2"], validation: { mode: "value", acceptedValues: [540] }, hints: ["Revenue is units multiplied by price.", "Reference C2 and D2 and multiply them with *.", "Type =C2*D2 and press Enter."], solution: "=C2*D2", explanation: "References like C2 update automatically when the data changes." , commonMistakes: [{ pattern: "\\+", message: "You added the values. Revenue needs multiplication (*)." }] }),
      step({ title: "Subtraction", scenario: "Elm Ave had a target of 100 units.", prompt: "In F3, show how far Elm Ave is below target: 100 minus Units (C3). Put 100 in F1 first? No. Just use =F1-C3. F1 already holds the target.", workbook: s({ F1: "100" }, sales), targetCells: ["F3"], validation: { mode: "value", acceptedValues: [15] }, hints: ["The target sits in F1.", "Subtract units from the target.", "=F1-C3"], solution: "=F1-C3", explanation: "Referencing the target cell makes the gap update when the target changes.", commonMistakes: [{ pattern: "C3-F1", message: "The order is reversed, so you got a negative number." }] }),
      step({ title: "Order of operations", scenario: "Pier 9 gives a flat 2 discount on the price per bag.", prompt: "In E4, calculate revenue after the discount: Units × (Price − 2).", workbook: sales, targetCells: ["E4"], validation: { mode: "value", acceptedValues: [426] }, hints: ["Excel multiplies before it subtracts.", "Wrap the subtraction in parentheses.", "=C4*(D4-2)"], solution: "=C4*(D4-2)", explanation: "Parentheses force Excel to subtract before multiplying.", commonMistakes: [{ pattern: "^=C4\\*D4-2$", message: "Without parentheses, Excel multiplies first and then subtracts only 2." }] }),
      step({ title: "Percentages", scenario: "Oak Plaza expects 25% more units next month.", prompt: "In F5, calculate next month's units: C5 increased by 25%.", workbook: sales, targetCells: ["F5"], validation: { mode: "value", acceptedValues: [80] }, hints: ["Growth means the original plus 25% of it.", "Multiply by 1.25 or by (1+25%).", "=C5*(1+25%)"], solution: "=C5*(1+25%)", explanation: "Multiplying by (1+rate) applies growth in one step.", commonMistakes: [{ pattern: "\\*25%$|\\*0\\.25$", message: "That's only the increase. Add it to the original, or multiply by 1.25." }] }),
      step({ title: "Absolute references", scenario: "Every store pays the same tax rate, stored in H1.", prompt: "In E2, calculate tax on Harbor St units: C2 × the tax rate in H1. Lock H1 so the formula can be copied down.", workbook: s({ G1: "Tax rate", H1: "0.1" }, sales), cols: 8, targetCells: ["E2"], validation: { mode: "value", acceptedValues: [12], requireAbsolute: true }, hints: ["When copied down, H1 would shift to H2, H3…", "Add $ signs: $H$1 (press F4 in Excel).", "=C2*$H$1"], solution: "=C2*$H$1", explanation: "$H$1 stays fixed no matter where the formula is copied." }),
    ],
  },
  {
    id: "math", track: "Math & Stats", title: "Summaries that matter", summary: "SUM, AVERAGE, MIN, MAX, COUNT and ROUND for quick reporting.",
    objectives: ["Aggregate ranges", "Round results", "Count entries"], estimatedMinutes: 5,
    steps: [
      step({ title: "SUM a range", scenario: "Your manager wants total units across all stores.", prompt: "In C7, total all units (C2:C6).", workbook: sales, targetCells: ["C7"], validation: { mode: "value", acceptedValues: [509], requiredFunctions: ["SUM"] }, hints: ["Use a function, not five + signs.", "SUM takes a range like C2:C6.", "=SUM(C2:C6)"], solution: "=SUM(C2:C6)", explanation: "A range like C2:C6 includes every cell between the two corners.", commonMistakes: [{ pattern: "C2:C5\\)|C3:C6\\)", message: "Your range misses one store. It should run from C2 to C6." }, { pattern: "C1:C6", message: "Your range includes the header row. Start at C2." }] }),
      step({ title: "AVERAGE", scenario: "How many units does a typical store sell?", prompt: "In C7, calculate average units per store.", workbook: sales, targetCells: ["C7"], validation: { mode: "value", acceptedValues: [101.8], requiredFunctions: ["AVERAGE"] }, hints: ["Average = sum ÷ count, but there's a function for it.", "AVERAGE(C2:C6)", "=AVERAGE(C2:C6)"], solution: "=AVERAGE(C2:C6)", explanation: "AVERAGE ignores blank cells and text automatically." }),
      step({ title: "MAX", scenario: "Which store volume should we celebrate?", prompt: "In C7, find the highest unit count.", workbook: sales, targetCells: ["C7"], validation: { mode: "value", acceptedValues: [142], requiredFunctions: ["MAX"] }, hints: ["There's a function that returns the largest number.", "MAX works like SUM.", "=MAX(C2:C6)"], solution: "=MAX(C2:C6)", explanation: "MIN works the same way and returns the smallest value." }),
      step({ title: "ROUND", scenario: "Finance wants the average price rounded to 1 decimal.", prompt: "In D7, show the average price rounded to 1 decimal place.", workbook: sales, targetCells: ["D7"], validation: { mode: "value", acceptedValues: [4.6], requiredFunctions: ["ROUND", "AVERAGE"] }, hints: ["Nest one function inside another.", "ROUND(value, digits) with AVERAGE inside.", "=ROUND(AVERAGE(D2:D6),1)"], solution: "=ROUND(AVERAGE(D2:D6),1)", explanation: "Nesting lets one function's output be another's input." }),
      step({ title: "COUNTA", scenario: "How many stores are on the report?", prompt: "In A7, count the store names in A2:A6.", workbook: sales, targetCells: ["A7"], validation: { mode: "value", acceptedValues: [5], requiredFunctions: ["COUNTA"] }, hints: ["COUNT only counts numbers. Names are text.", "COUNTA counts any non-empty cell.", "=COUNTA(A2:A6)"], solution: "=COUNTA(A2:A6)", explanation: "COUNT counts only numbers. COUNTA counts anything that isn't blank.", commonMistakes: [{ pattern: "^=COUNT\\(", message: "COUNT ignores text, so it returns 0 here. Try COUNTA." }] }),
    ],
  },
  {
    id: "logical", track: "Logical", title: "Decisions with IF", summary: "Make the sheet decide: flags, tiers and multi-condition rules.",
    objectives: ["Write IF tests", "Combine AND/OR", "Conditional sums"], estimatedMinutes: 6,
    steps: [
      step({ title: "Simple IF", scenario: "Stores with 100+ units hit target.", prompt: 'In E2, return "Hit" if C2 is at least 100, otherwise "Miss".', workbook: sales, targetCells: ["E2"], validation: { mode: "value", acceptedValues: ["Hit"], requiredFunctions: ["IF"] }, hints: ["IF(test, value_if_true, value_if_false)", 'The test is C2>=100. Text goes in "quotes".', '=IF(C2>=100,"Hit","Miss")'], solution: '=IF(C2>=100,"Hit","Miss")', explanation: "IF evaluates the test and returns one of two results.", commonMistakes: [{ pattern: "C2>100", message: "Use >= for 'at least'. > excludes exactly 100." }] }),
      step({ title: "IF with math", scenario: "North stores get a 50 bonus.", prompt: 'In E2, return 50 if B2 is "North", otherwise 0.', workbook: sales, targetCells: ["E2"], validation: { mode: "value", acceptedValues: [50], requiredFunctions: ["IF"] }, hints: ["Compare text with =.", 'B2="North"', '=IF(B2="North",50,0)'], solution: '=IF(B2="North",50,0)', explanation: "Text comparisons in Excel ignore case." }),
      step({ title: "AND", scenario: "A store is 'star' if North AND over 130 units.", prompt: 'In E4, return "Star" if B4 is "North" and C4 > 130, otherwise "".', workbook: sales, targetCells: ["E4"], validation: { mode: "value", acceptedValues: ["Star"], requiredFunctions: ["IF", "AND"] }, hints: ["Both conditions must be true.", "AND(cond1, cond2) inside IF.", '=IF(AND(B4="North",C4>130),"Star","")'], solution: '=IF(AND(B4="North",C4>130),"Star","")', explanation: "AND is TRUE only when every condition is TRUE." }),
      step({ title: "SUMIF", scenario: "Regional managers want their totals.", prompt: 'In C8, total units for the "South" region.', workbook: s({ B8: "South" }, sales), targetCells: ["C8"], validation: { mode: "value", acceptedValues: [183], requiredFunctions: ["SUMIF"] }, hints: ["Sum only rows matching a condition.", "SUMIF(range, criteria, sum_range)", "=SUMIF(B2:B6,B8,C2:C6)"], solution: "=SUMIF(B2:B6,B8,C2:C6)", explanation: "Referencing B8 as the criteria lets you change the region without editing the formula." }),
      step({ title: "COUNTIF", scenario: "How many stores fell short?", prompt: "In C8, count stores with fewer than 100 units.", workbook: sales, targetCells: ["C8"], validation: { mode: "value", acceptedValues: [3], requiredFunctions: ["COUNTIF"] }, hints: ["Count cells meeting a condition.", 'Criteria with an operator go in quotes: "<100".', '=COUNTIF(C2:C6,"<100")'], solution: '=COUNTIF(C2:C6,"<100")', explanation: 'Operators inside criteria are written as text, like "<100".' }),
    ],
  },
  {
    id: "lookups", track: "Lookups", title: "VLOOKUP, XLOOKUP & INDEX/MATCH", summary: "Pull the right value from a table, every time.",
    objectives: ["Exact-match lookups", "Two-way INDEX/MATCH", "Handle #N/A"], estimatedMinutes: 7,
    steps: [
      step({ title: "VLOOKUP exact", scenario: "HR asks for an employee's salary by ID.", prompt: "In G2, look up the salary for the ID in F2 using VLOOKUP.", workbook: s({ F1: "Find ID", F2: "E103", G1: "Salary" }, staff), cols: 7, targetCells: ["G2"], validation: { mode: "value", acceptedValues: [58000], requiredFunctions: ["VLOOKUP"] }, hints: ["VLOOKUP(key, table, column#, exact?)", "Salary is the 4th column of A2:D6. Use FALSE for exact match.", "=VLOOKUP(F2,A2:D6,4,FALSE)"], solution: "=VLOOKUP(F2,A2:D6,4,FALSE)", explanation: "FALSE means exact match. Leave it off and VLOOKUP can return the wrong row silently.", commonMistakes: [{ pattern: ",3,", message: "Column 3 is Dept. Salary is column 4 of the table." }] }),
      step({ title: "XLOOKUP", scenario: "Same request, with the modern function.", prompt: "In G2, return the name for the ID in F2 using XLOOKUP.", workbook: s({ F1: "Find ID", F2: "E105", G1: "Name" }, staff), cols: 7, targetCells: ["G2"], validation: { mode: "value", acceptedValues: ["Sofia Rossi"], requiredFunctions: ["XLOOKUP"] }, hints: ["XLOOKUP(key, lookup_range, return_range)", "Look in A2:A6, return from B2:B6.", "=XLOOKUP(F2,A2:A6,B2:B6)"], solution: "=XLOOKUP(F2,A2:A6,B2:B6)", explanation: "XLOOKUP defaults to exact match and can look left." }),
      step({ title: "Look left", scenario: "You have a name and need the ID, which sits to the left.", prompt: "In G2, return the ID for the name in F2.", workbook: s({ F1: "Name", F2: "Leo Martins", G1: "ID" }, staff), cols: 7, targetCells: ["G2"], validation: { mode: "value", acceptedValues: ["E104"] }, hints: ["VLOOKUP can't look left.", "Use XLOOKUP or INDEX/MATCH.", "=XLOOKUP(F2,B2:B6,A2:A6)"], solution: "=XLOOKUP(F2,B2:B6,A2:A6)", explanation: "Separating the lookup and return ranges removes VLOOKUP's left-to-right limit." }),
      step({ title: "INDEX + MATCH", scenario: "The classic combo, still on every assessment.", prompt: "In G2, return the department for the ID in F2 using INDEX and MATCH.", workbook: s({ F1: "Find ID", F2: "E102", G1: "Dept" }, staff), cols: 7, targetCells: ["G2"], validation: { mode: "value", acceptedValues: ["Ops"], requiredFunctions: ["INDEX", "MATCH"] }, hints: ["MATCH finds the position, INDEX returns the value at it.", "MATCH(F2,A2:A6,0) gives the row number.", "=INDEX(C2:C6,MATCH(F2,A2:A6,0))"], solution: "=INDEX(C2:C6,MATCH(F2,A2:A6,0))", explanation: "MATCH with 0 means exact. INDEX uses that position in the return column.", commonMistakes: [{ pattern: "MATCH\\([^)]*,1\\)|MATCH\\([^,]*,[^,]*\\)\\)", message: "MATCH defaults to approximate match. Add 0 as the third argument." }] }),
      step({ title: "Handle missing IDs", scenario: "Someone typed an ID that doesn't exist.", prompt: 'In G2, look up the name for F2, but show "Not found" instead of #N/A.', workbook: s({ F1: "Find ID", F2: "E999", G1: "Name" }, staff), cols: 7, targetCells: ["G2"], validation: { mode: "value", acceptedValues: ["Not found"] }, hints: ["Catch the error, or use XLOOKUP's 4th argument.", 'IFERROR(lookup, "Not found")', '=XLOOKUP(F2,A2:A6,B2:B6,"Not found")'], solution: '=XLOOKUP(F2,A2:A6,B2:B6,"Not found")', explanation: "Handling #N/A on purpose makes reports readable." }),
    ],
  },
  {
    id: "text", track: "Text", title: "Clean & reshape text", summary: "Fix messy names and codes that come in from exports.",
    objectives: ["Join text", "Extract parts", "Normalize case & spaces"], estimatedMinutes: 5,
    steps: [
      step({ title: "Join with &", scenario: "Build a label like 'Harbor St – North'.", prompt: 'In E2, join A2, " - ", and B2.', workbook: sales, targetCells: ["E2"], validation: { mode: "value", acceptedValues: ["Harbor St - North"] }, hints: ["& joins text.", 'Put the separator in quotes: " - "', '=A2&" - "&B2'], solution: '=A2&" - "&B2', explanation: "& is the fastest way to join text. CONCAT and TEXTJOIN work too." }),
      step({ title: "LEFT", scenario: "Region codes are the first 3 letters.", prompt: "In E2, return the first 3 characters of B2.", workbook: sales, targetCells: ["E2"], validation: { mode: "value", acceptedValues: ["Nor"], requiredFunctions: ["LEFT"] }, hints: ["Extract from the start of the text.", "LEFT(text, count)", "=LEFT(B2,3)"], solution: "=LEFT(B2,3)", explanation: "RIGHT and MID extract from the end and the middle." }),
      step({ title: "TRIM", scenario: "An export left stray spaces in a name.", prompt: "In B2, clean the extra spaces from A2.", workbook: { A1: "Raw", B1: "Clean", A2: "   Amara    Diallo  " }, targetCells: ["B2"], validation: { mode: "value", acceptedValues: ["Amara Diallo"], requiredFunctions: ["TRIM"] }, hints: ["One function removes leading, trailing and double spaces.", "TRIM(text)", "=TRIM(A2)"], solution: "=TRIM(A2)", explanation: "TRIM is usually the first step when cleaning imported data." }),
      step({ title: "PROPER", scenario: "Names arrived in all caps.", prompt: "In B2, convert A2 to Proper Case.", workbook: { A1: "Raw", B1: "Clean", A2: "JONAS WEBER" }, targetCells: ["B2"], validation: { mode: "value", acceptedValues: ["Jonas Weber"], requiredFunctions: ["PROPER"] }, hints: ["There's a function for each case: UPPER, LOWER, ...", "PROPER capitalizes each word.", "=PROPER(A2)"], solution: "=PROPER(A2)", explanation: "UPPER, LOWER and PROPER change case without retyping." }),
      step({ title: "LEN", scenario: "IDs must be exactly 4 characters.", prompt: "In B2, count the characters in A2.", workbook: { A1: "ID", B1: "Length", A2: "E1012" }, targetCells: ["B2"], validation: { mode: "value", acceptedValues: [5], requiredFunctions: ["LEN"] }, hints: ["Count characters, including spaces.", "LEN(text)", "=LEN(A2)"], solution: "=LEN(A2)", explanation: "Combine LEN with IF to flag invalid IDs automatically." }),
    ],
  },
  {
    id: "cleaning", track: "Data Cleaning", title: "Debug & clean", summary: "Fix numbers stored as text, errors and messy codes.",
    objectives: ["Convert text to numbers", "Replace characters", "Guard divisions"], estimatedMinutes: 6,
    steps: [
      step({ title: "Numbers stored as text", scenario: "An export put quotes around amounts, so SUM ignores them.", prompt: "In B2, convert A2 to a real number.", workbook: { A1: "Amount (text)", B1: "Number", A2: "'250" }, targetCells: ["B2"], validation: { mode: "value", acceptedValues: [250] }, hints: ["The value starts with a stray apostrophe.", "SUBSTITUTE removes it, VALUE converts the result.", "=VALUE(SUBSTITUTE(A2,\"'\",\"\"))"], solution: "=VALUE(SUBSTITUTE(A2,\"'\",\"\"))", explanation: "Text that looks like a number breaks SUM and lookups. Convert it once, early." }),
      step({ title: "SUBSTITUTE", scenario: "Product codes use dashes, but the system needs underscores.", prompt: 'In B2, replace every "-" in A2 with "_".', workbook: { A1: "Code", B1: "Fixed", A2: "CF-NOR-0042" }, targetCells: ["B2"], validation: { mode: "value", acceptedValues: ["CF_NOR_0042"], requiredFunctions: ["SUBSTITUTE"] }, hints: ["Replace text by content, not position.", "SUBSTITUTE(text, old, new)", '=SUBSTITUTE(A2,"-","_")'], solution: '=SUBSTITUTE(A2,"-","_")', explanation: "SUBSTITUTE replaces by content. REPLACE replaces by position." }),
      step({ title: "Guard #DIV/0!", scenario: "Some stores had zero visits this week.", prompt: "In C2, calculate conversion (B2/A2) but show 0 if there is an error.", workbook: { A1: "Visits", B1: "Sales", C1: "Conversion", A2: "0", B2: "0" }, targetCells: ["C2"], validation: { mode: "value", acceptedValues: [0], requiredFunctions: ["IFERROR"] }, hints: ["Dividing by 0 gives #DIV/0!.", "Wrap the division in IFERROR.", "=IFERROR(B2/A2,0)"], solution: "=IFERROR(B2/A2,0)", explanation: "IFERROR keeps dashboards clean, but don't let it hide real bugs." }),
      step({ title: "Fix the range", scenario: "A colleague's total ignores the last row.", prompt: "In B7, write a correct total for B2:B6. The old formula was =SUM(B2:B5).", workbook: { A1: "Month", B1: "Cost", A2: "Jan", B2: "1200", A3: "Feb", B3: "980", A4: "Mar", B4: "1430", A5: "Apr", B5: "1105", A6: "May", B6: "1210", B7: "=SUM(B2:B5)" }, targetCells: ["B7"], validation: { mode: "value", acceptedValues: [5925], requiredFunctions: ["SUM"] }, hints: ["The range stops at row 5.", "Extend it to B6.", "=SUM(B2:B6)"], solution: "=SUM(B2:B6)", explanation: "Off-by-one ranges are the most common bug in real spreadsheets.", commonMistakes: [{ pattern: "B5\\)", message: "Still stops at B5. May isn't included." }] }),
      step({ title: "Flag duplicates", scenario: "The CRM export has repeated customer IDs.", prompt: 'In B2, return "Dup" if A2 appears more than once in A2:A6, otherwise "".', workbook: { A1: "Customer", B1: "Flag", A2: "C-11", A3: "C-12", A4: "C-11", A5: "C-14", A6: "C-15" }, targetCells: ["B2"], validation: { mode: "value", acceptedValues: ["Dup"], requiredFunctions: ["IF", "COUNTIF"] }, hints: ["Count how many times A2 appears.", "COUNTIF(A2:A6, A2) > 1", '=IF(COUNTIF($A$2:$A$6,A2)>1,"Dup","")'], solution: '=IF(COUNTIF($A$2:$A$6,A2)>1,"Dup","")', explanation: "Locking the range with $ lets you copy this flag down the whole column." }),
    ],
  },
];

// Fix the awkward wording in basics step 2 prompt
LESSONS[0].steps[1].prompt = "In F3, show how far Elm Ave is below the target in F1 (target minus units).";

export const ALL_STEPS = LESSONS.flatMap((l) => l.steps.map((s) => ({ ...s, lessonId: l.id })));
export const getLesson = (id: string) => LESSONS.find((l) => l.id === id);
