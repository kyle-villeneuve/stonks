// @ts-ignore
import { html2json as parseHTML } from "html2json";
import fetch from "node-fetch";
import { xml2js } from "xml-js";
import { fsMemo } from "./fsMemo";

interface ParsedQuery {
  id?: string;
  className?: string;
  tag?: string;
}

interface HtmlNode {
  tag: string;
  element: string;
  attr?: {
    [key: string]: string;
  };
  child?: HtmlNode[];
}

const parseQuerySelector = (query = ""): ParsedQuery[] => {
  const selectors = query.trim().split(/\s+/);

  return selectors.map((selector) => {
    const trimmed = selector.trim();

    switch (trimmed[0]) {
      case "#": {
        return { id: selector.slice(1) };
      }
      case ".": {
        return { className: selector.slice(1) };
      }
      default:
        return { tag: selector };
    }
  });
};

const searchNode = (node: HtmlNode, { id, tag, className }: ParsedQuery) => {
  if (tag && tag === node.tag) {
    return node;
  }

  // search node attributes
  if (node.attr) {
    if (id && node.attr.id === id) {
      return node;
    }

    if (className && node.attr.class === className) {
      return node;
    }
  }

  return null;
};

const recursiveQuery = (
  node: HtmlNode,
  selector: ParsedQuery
): HtmlNode | null => {
  if (!node) return null;

  // check current node
  const foundNode = searchNode(node, selector);
  if (foundNode) return foundNode;

  // if no children
  if (!node.child) return null;

  // search children
  for (let i = 0; i < node.child.length; i++) {
    const foundChild = recursiveQuery(node.child[i], selector);
    if (foundChild) return foundChild;
  }

  return null;
};

export const querySelector = (node: HtmlNode | null) => (selector: string) => {
  if (!node) return null;

  const selectors = parseQuerySelector(selector);

  let currentNode = null;
  let i = 0;

  while (i < selectors.length) {
    const s = selectors[i];

    currentNode = recursiveQuery(node, s);
    i++;
  }

  return currentNode;
};

const recursiveQueryAll = (
  node: HtmlNode,
  selector: ParsedQuery
): HtmlNode[] | null => {
  if (!node) return null;

  const all = [];

  // check current node
  const foundNode = searchNode(node, selector);
  if (foundNode) {
    all.push(foundNode);
  }

  // if no children
  if (!node.child) return all;

  // search children
  for (let i = 0; i < node.child.length; i++) {
    const foundChildren = recursiveQueryAll(node.child[i], selector);
    if (foundChildren?.length) {
      all.push(...foundChildren);
    }
  }

  return all;
};

export const querySelectorAll = (node: HtmlNode | null) => (
  selector: string
) => {
  if (!node) return null;

  const selectors = parseQuerySelector(selector);

  let currentNodeList: HtmlNode[] | null = [];
  let i = 0;

  while (i < selectors.length) {
    const s = selectors[i];

    currentNodeList = recursiveQueryAll(node, s);
    i++;
  }

  return currentNodeList;
};

export const getDocument = fsMemo(
  async (url: string): Promise<HtmlNode> => {
    const response = await fetch(url);

    //  get html response
    const html = await response.text();

    const removeExtraneous = html
      .replace(/<!DOCTYPE.*>\n?/gim, "")
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "");

    return parseHTML(removeExtraneous);
  }
);

export const getXML = fsMemo(
  async (url: string): Promise<any> => {
    const response = await fetch(url);

    const xml = await response.text();

    return xml2js(xml, { compact: true });
  }
);
