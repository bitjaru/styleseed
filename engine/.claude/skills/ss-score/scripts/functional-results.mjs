// Parse retained Node test-runner events, not caller-supplied pass labels.
// V1 deliberately accepts flat, uniquely named scenario tests only.
export function nodeTestChecks(text) {
  const checks = [];
  const names = new Set();
  let summary;
  for (const line of text.trim().split("\n")) {
    const event = JSON.parse(line);
    if (event.type === "test:summary") {
      if (!event.data.file) summary = event.data;
      continue;
    }
    if (!["test:pass", "test:fail"].includes(event.type)) throw new Error("Unexpected functional test event");
    const data = event.data;
    if (data.nesting !== 0 || data.details?.type !== "test") throw new Error("Functional scenarios must be flat Node tests");
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/u.test(data.name) || names.has(data.name)) throw new Error("Functional test names must be unique scenario IDs");
    names.add(data.name);
    checks.push({ id: data.name, status: data.skip || data.todo ? "skipped" : event.type === "test:pass" ? "pass" : "fail" });
  }
  if (!summary || !checks.length || summary.counts?.tests !== checks.length || summary.counts?.suites !== 0) throw new Error("Functional test output is incomplete or empty");
  const counts = summary.counts;
  if (counts.passed !== checks.filter((c) => c.status === "pass").length ||
      counts.failed + counts.cancelled !== checks.filter((c) => c.status === "fail").length ||
      counts.skipped + counts.todo !== checks.filter((c) => c.status === "skipped").length ||
      summary.success !== (counts.failed + counts.cancelled === 0)) throw new Error("Functional summary disagrees with test events");
  return checks.sort((a, b) => a.id.localeCompare(b.id));
}
