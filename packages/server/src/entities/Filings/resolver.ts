import { IQueryResolvers } from "../../schema";
import { getDocument, querySelector } from "../../utils/dom";

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

      const filing = `${baseURL}${filingLink?.attr?.href}`;

      return getDocument(filing);
    },
  },
};

export default resolverMap;
