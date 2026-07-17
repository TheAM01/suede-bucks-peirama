/**
 * Data-driven Guide content. The whole Guide page is rendered from one ordered
 * list of sections; each topic is authored twice (everyday + technical). Content
 * is plain data (no JSX) — inline strings support a tiny markdown subset:
 *   **bold**   and   `code`
 */

export type Inline = string;

export type Block =
  | { t: "p"; text: Inline }
  | { t: "h"; text: string }
  | { t: "ul"; items: Inline[] }
  | { t: "ol"; items: Inline[] }
  | { t: "dl"; items: { term: string; def: Inline }[] }
  | { t: "callout"; tone?: "info" | "warning" | "success"; title?: string; text: Inline }
  | { t: "code"; text: string };

export interface DeepDive {
  title: string;
  everyday: Block[];
  technical: Block[];
}

export interface GuideSection {
  /** permanent slug — DOM anchor + TOC target + "how to use this page" target */
  id: string;
  title: string;
  /** TOC grouping label */
  category: string;
  everyday: Block[];
  technical: Block[];
  deep?: DeepDive[];
}
