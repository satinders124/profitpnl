/**
 * Standalone test for dayOfWeekLabel() and sortByWeekday() additions to
 * lib/stats.ts. Not part of the Next app bundle. Run with:
 * npx tsx scripts/test_stats_extras.mjs
 */
import { dayOfWeekLabel, sortByWeekday, breakdownBy } from "../lib/stats.ts";

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) {
    pass++;
    console.log("✅", name);
  } else {
    fail++;
    console.log("❌", name);
  }
}

// dayOfWeekLabel
check(
  "2024-06-03 (a Monday) -> 'Monday'",
  dayOfWeekLabel("2024-06-03") === "Monday"
);
check(
  "2024-06-09 (a Sunday) -> 'Sunday'",
  dayOfWeekLabel("2024-06-09") === "Sunday"
);
check("empty string -> ''", dayOfWeekLabel("") === "");
check("undefined -> ''", dayOfWeekLabel(undefined) === "");
check("garbage date -> ''", dayOfWeekLabel("not-a-date") === "");

// sortByWeekday
const trades = [
  { date: "2024-06-07", result: 1 }, // Friday
  { date: "2024-06-03", result: 2 }, // Monday
  { date: "2024-06-05", result: -1 }, // Wednesday
];
const rows = breakdownBy(trades, (t) => dayOfWeekLabel(t.date), "Unknown");
const sorted = sortByWeekday(rows);
check(
  "sortByWeekday orders Mon -> Fri (not by totalR)",
  sorted.map((r) => r.name).join(",") === "Monday,Wednesday,Friday"
);

// Unknown/unparseable dates go to the end
const withUnknown = [
  { date: "2024-06-03", result: 1 }, // Monday
  { date: "", result: -1 }, // unknown
];
const rows2 = breakdownBy(withUnknown, (t) => dayOfWeekLabel(t.date), "Unknown");
const sorted2 = sortByWeekday(rows2);
check(
  "sortByWeekday puts 'Unknown' bucket last",
  sorted2[sorted2.length - 1].name === "Unknown"
);

console.log(`\n${pass}/${pass + fail} passed`);
if (fail > 0) process.exit(1);
