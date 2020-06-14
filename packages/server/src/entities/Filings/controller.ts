import { getDocument, querySelector, querySelectorAll } from "../../utils/dom";

const baseURL = "https://www.sec.gov";

const tickers = ["aapl", "tsla", "amzn", "iqv", "gild"];
const ticker = tickers[Math.floor(tickers.length * Math.random())];

const documentLimit = 2;

(async () => {
  const ast = await getDocument(
    `${baseURL}/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=10-q&dateb=&owner=exclude&count=100`
  );

  const rows = querySelectorAll(ast)("#documentsbutton");

  if (!rows) throw new Error("Unable to find links to filings");

  const filings = rows
    .slice(0, documentLimit)
    .map((n) => `${baseURL}${n.attr?.href}`);

  const documentPromises = filings.map(async (url) => {
    const ast = await getDocument(url);

    const rows = querySelectorAll(ast)(".tableFile tr");

    const row = rows ? rows[1] : null;

    if (!row) throw new Error("Unable to find filings list");

    const anchor = querySelector(row)("a");

    const href = anchor?.attr?.href;

    const documentURL = `${baseURL}${href}`;
    // const document = await getDocument(documentURL);

    console.log(documentURL);

    // return document;
  });

  const documents = await Promise.all(documentPromises);

  console.log(documents[0]);
})();
