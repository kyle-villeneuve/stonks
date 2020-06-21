const extraneous = ["consolidated", "condensed", "(unaudited)"];

export function getFilingType(name: string): string | null {
  if (!name.includes("statement") || name.includes("parenthetical")) {
    return null;
  }

  const _name = name.split(" - ").pop();

  if (_name?.includes("statements of cash flows")) {
    return "cash flow";
  }

  if (_name?.includes("statements of operations")) {
    return "profit and loss";
  }

  if (_name?.includes("balance sheets")) {
    return "balance sheet";
  }

  if (_name?.includes("income")) {
    return "income statement";
  }

  if (_name?.includes("property, plant and equipment")) {
    return "profit, plant and equipment";
  }

  return null;
}

export function parseFilingReport(report: any, baseURL: string) {
  return report.reduce((total: any, report: any) => {
    const name = report.LongName?._text.toLowerCase();
    const document = `${baseURL}/${report.HtmlFileName?._text}`;
    const filingType = getFilingType(name);

    if (filingType) {
      total[filingType] = document;
    }

    return total;
  }, {});
}
