import fs from 'fs';
import path from 'path';
import { FIXTURES, buildFixtureSession } from './src/data/fixtures';
import { vineland2Pack } from './src/data/vineland2.pack';
import { computeReport } from './src/engine/scoring';

// Load the norms directly from the JSON
const normsPath = path.resolve(__dirname, 'docs', 'norms.vineland2.local.json');
const normsRaw = fs.readFileSync(normsPath, 'utf8');
const norms = JSON.parse(normsRaw);

// Test function
function testProfile(name: string, birthDate: string, reach: any) {
  const fixture = {
    id: "test",
    labelVi: "Test", labelEn: "Test", descVi: "Test", descEn: "Test",
    examinee: { name, sex: "male" as const, birthDate },
    reach
  };
  
  const session = buildFixtureSession(fixture, vineland2Pack);
  const report = computeReport(session, vineland2Pack, norms);
  
  console.log(`\n=================================================`);
  console.log(`Testing Profile: ${name} (Age: ${report.ageLabel} / ${report.ageMonths} mo)`);
  console.log(`=================================================`);
  
  console.log("--- Subdomains ---");
  for (const sub of report.subdomains) {
    if (sub.vScale === null) {
      console.log(`❌ ${sub.subdomain.padEnd(15)}: Missing V-Scale (Raw: ${sub.rawScore})`);
    } else {
      console.log(`✅ ${sub.subdomain.padEnd(15)}: V-Scale = ${String(sub.vScale).padEnd(2)} | Raw = ${sub.rawScore}`);
    }
  }
  
  console.log("\n--- Domains ---");
  for (const dom of report.domains) {
    if (dom.standardScore === null) {
      console.log(`❌ ${dom.domain.padEnd(15)}: Missing Standard Score (SumV: ${dom.sumVScale})`);
    } else {
      console.log(`✅ ${dom.domain.padEnd(15)}: Standard = ${dom.standardScore} | SumV = ${dom.sumVScale}`);
    }
  }
  
  console.log("\n--- ABC (Composite) ---");
  if (report.composite.standardScore === null) {
    console.log(`❌ ABC: Missing Standard Score`);
  } else {
    console.log(`✅ ABC: Standard = ${report.composite.standardScore} | Percentile = ${report.composite.percentile}`);
  }
}

// 1. Test 84-95 mo band (Age 7:6, 90 months)
testProfile("Child 7:6 (Testing 84-95mo patch)", "2016-12-15", { _default: 0.7 });

// 2. Test 36-39 mo band (Age 3:1, 37 months)
testProfile("Child 3:1 (Testing 36-39mo patch)", "2021-05-15", { _default: 0.4 });

// 3. Test High functioning 6y (checking high composite range)
testProfile("Child 6:0 (High functioning)", "2018-06-15", { _default: 0.95 });

// 4. Test ASD 5y (checking floor values)
testProfile("Child 5:0 (ASD profile)", "2019-06-15", { _default: 0.5, socialization: 0.1, written: 0.9 });
