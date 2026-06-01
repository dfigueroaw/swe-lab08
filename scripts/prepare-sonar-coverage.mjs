import { readFileSync, writeFileSync } from 'node:fs';

for (const service of ['ms-restaurant', 'ms-rewards']) {
  const reportPath = `${service}/coverage/lcov.info`;
  const report = readFileSync(reportPath, 'utf8');
  const normalized = report.replace(/^SF:src\//gm, `SF:${service}/src/`);

  writeFileSync(reportPath, normalized);
}
