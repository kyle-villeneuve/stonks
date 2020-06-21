import { IQueryResolvers } from "../../schema";
import { getDocument, getXML, querySelector } from "../../utils/dom";
import { parseFilingReport } from "./utils";

interface IResolverMap {
  //   Mutation: {};
  Query: {
    latest10Q: IQueryResolvers["latest10Q"];
  };
}

const baseURL = "https://www.sec.gov";

const resolverMap: IResolverMap = {
  Query: {
    latest10Q: async (_p, { ticker }) => {
      // get list of all 10-Q filings (limit 1 for latest)
      const all10Qs = await getDocument(
        `${baseURL}/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=10-q&dateb=&owner=exclude&count=1`
      );

      // get link to filing overview
      const latest10QLink = querySelector(all10Qs)("#documentsbutton");

      if (!latest10QLink || !latest10QLink.attr) return null;

      // get filing overview
      const filingOverview = await getDocument(
        `${baseURL}${latest10QLink.attr.href}`
      );

      // get link to actual filing from overview
      const filingTable = querySelector(filingOverview)(".tableFile");

      const filingLink = querySelector(filingTable)("tr a");

      // link to the 10-Q
      const filingURL = `${baseURL}${filingLink?.attr?.href}`;

      // directory of filing with all tables
      const filingIndex = filingURL
        .replace("ix?doc=/", "")
        .split("/")
        .slice(0, -1)
        .join("/");

      const filingSummaryURL = `${filingIndex}/FilingSummary.xml`;

      //   const document = await getDocument(filing);

      const filingSummary = await getXML(filingSummaryURL);

      const documents = parseFilingReport(
        filingSummary?.FilingSummary?.MyReports?.Report,
        filingIndex
      );

      return documents;
    },
  },
};

export default resolverMap;
