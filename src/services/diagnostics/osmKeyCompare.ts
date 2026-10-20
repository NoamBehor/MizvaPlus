import type { OsmKeyComparison } from './types';

export function compareOsmKeys(
  selectedOsmKey: string | null | undefined,
  reportOsmKey: string | null | undefined,
): OsmKeyComparison {
  const selected = selectedOsmKey?.trim() || null;
  const report = reportOsmKey?.trim() || null;

  if (!selected || !report) {
    return {
      selectedOsmKey: selected,
      reportOsmKey: report,
      matches: null,
    };
  }

  return {
    selectedOsmKey: selected,
    reportOsmKey: report,
    matches: selected === report,
  };
}

export function formatOsmKeyComparison(comparison: OsmKeyComparison): string {
  const selected = comparison.selectedOsmKey ?? '—';
  const report = comparison.reportOsmKey ?? '—';

  if (comparison.matches === null) {
    return `Selected:\n${selected}\n\nReport:\n${report}\n\n(no report to compare)`;
  }

  const status = comparison.matches ? 'MATCH ✅' : 'MISMATCH ❌';
  return `Selected:\n${selected}\n\nReport:\n${report}\n\n${status}`;
}
