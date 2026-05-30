import { useState, useEffect, useMemo, Fragment, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilter,
  faSort,
  faSortUp,
  faSortDown,
} from "@fortawesome/free-solid-svg-icons";

import type { WikidataWarning, WikidataWarningCategory } from '../lib/types';

const WARNINGS_URL =
  "https://cdn.jsdelivr.net/npm/name-suggestion-index@latest/dist/wikidata/warnings.min.json";

// Warning categories. Keys here must match the `category` field emitted by
// scripts/wikidata.ts (see `WikidataWarningCategory` in lib/types.ts).
const CATEGORIES: Record<WikidataWarningCategory, { label: string }> = {
  "deleted":             { label: "Deleted entry" },
  "unresolved-redirect": { label: "Unresolved redirect" },
  "replacement":         { label: "Possible replacement" },
  "missing-label":       { label: "Missing English label" },
  "facebook-api":        { label: "Facebook API error" },
  "facebook-access":     { label: "Facebook access qualifier" },
  "edit-error":          { label: "Wikidata edit error" },
  "other":               { label: "Other" },
};

const CATEGORY_ENTRIES = Object.entries(CATEGORIES) as Array<[WikidataWarningCategory, { label: string }]>;

type SortKey = 'category' | 'qid' | 'msg';
type SortDir = 'asc' | 'desc';
type WarningFilterCategory = WikidataWarningCategory | 'all';

type WarningFromJson = Omit<WikidataWarning, 'category'> & {
  category?: string;
};

type NormalizedWarning = Omit<WikidataWarning, 'category'> & {
  category: WikidataWarningCategory;
};

interface WarningsData {
  warnings?: WarningFromJson[];
  _meta?: {
    generated?: string;
  };
}

function isWarningCategory(category: unknown): category is WikidataWarningCategory {
  return typeof category === 'string' && category in CATEGORIES;
}

// Render a warning message, turning QIDs (Q12345) and any developers.facebook.com URL into links
const renderMessage = (msg: string): ReactNode[] => {
  // Split on QIDs and the facebook docs URL
  const pattern =
    /(Q\d+|https:\/\/developers\.facebook\.com\/docs\/graph-api)/g;
  const parts = msg.split(pattern);
  return parts.map((part, i) => {
    if (/^Q\d+$/.test(part)) {
      return (
        <a
          key={i}
          href={`https://www.wikidata.org/wiki/${part}`}
          target="_blank"
          rel="noreferrer"
        >
          {part}
        </a>
      );
    }
    if (part === "https://developers.facebook.com/docs/graph-api") {
      return (
        <a key={i} href={part} target="_blank" rel="noreferrer">
          {part}
        </a>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
};

const useWarnings = (): [WarningsData | null, string | null] => {
  const [data, setData] = useState<WarningsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(WARNINGS_URL);
        const json = await response.json() as WarningsData;
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  return [data, error];
};

export const Warnings = () => {
  const [data, error] = useWarnings();
  const [category, setCategory] = useState<WarningFilterCategory>("all");
  const [qidFilter, setQidFilter] = useState("");
  const [msgFilter, setMsgFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("category");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Use the `category` field emitted by the build script; fall back to "other" if absent
  const warnings = useMemo<NormalizedWarning[]>(() => {
    if (!data?.warnings) return [];
    return data.warnings.map((w): NormalizedWarning => ({
      ...w,
      category: isWarningCategory(w.category) ? w.category : "other",
    }));
  }, [data]);

  // Counts per category (computed against the unfiltered set)
  const counts = useMemo(() => {
    const c = { all: warnings.length } as Record<WikidataWarningCategory | 'all', number>;
    for (const [key] of CATEGORY_ENTRIES) c[key] = 0;
    for (const w of warnings) c[w.category]++;
    return c;
  }, [warnings]);

  const filtered = useMemo(() => {
    const qNeedle = qidFilter.trim().toUpperCase();
    const mNeedle = msgFilter.trim().toLowerCase();
    let rows: NormalizedWarning[] = warnings.filter((w) => {
      if (category !== "all" && w.category !== category) return false;
      if (qNeedle && !w.qid.toUpperCase().includes(qNeedle)) return false;
      if (mNeedle && !w.msg.toLowerCase().includes(mNeedle)) return false;
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      if (sortKey === "qid") {
        // numeric compare on the QID number for natural ordering
        const an = parseInt(a.qid.slice(1), 10) || 0;
        const bn = parseInt(b.qid.slice(1), 10) || 0;
        return (an - bn) * dir;
      }
      if (sortKey === "category") {
        return (
          a.category.localeCompare(b.category) * dir ||
          a.msg.localeCompare(b.msg)
        );
      }
      // msg
      return a.msg.localeCompare(b.msg) * dir;
    });
    return rows;
  }, [warnings, category, qidFilter, msgFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <FontAwesomeIcon icon={faSort} className="sorticon dim" />;
    };
    return (
      <FontAwesomeIcon
        icon={sortDir === "asc" ? faSortUp : faSortDown}
        className="sorticon"
      />
    );
  };

  const clearFilters = () => {
    setCategory("all");
    setQidFilter("");
    setMsgFilter("");
  };

  const filtersActive = category !== "all" || qidFilter || msgFilter;
  const generated =
    data?._meta?.generated && new Date(Date.parse(data._meta.generated));

  return (
    <>
      <div className={"filters" + (filtersActive ? " active" : "")}>
        <span className="icon">
          <FontAwesomeIcon icon={faFilter} />
        </span>
        <span className="filterby">Filter by</span>

        <span className="field">
          <label htmlFor="wcat">Type:</label>
          <select
            id="wcat"
            value={category}
            onChange={(e) => setCategory(e.target.value as WarningFilterCategory)}
          >
            <option value="all">All ({counts.all})</option>
            {CATEGORY_ENTRIES.map(([key, def]) => (
              <option key={key} value={key} disabled={!counts[key]}>
                {def.label} ({counts[key] || 0})
              </option>
            ))}
          </select>
        </span>

        <span className="field">
          <label htmlFor="wqid">QID:</label>
          <input
            type="text"
            id="wqid"
            autoCorrect="off"
            size={14}
            placeholder="Q12345"
            value={qidFilter}
            onChange={(e) => setQidFilter(e.target.value)}
          />
        </span>

        <span className="field">
          <label htmlFor="wmsg">Message:</label>
          <input
            type="text"
            id="wmsg"
            autoCorrect="off"
            size={20}
            value={msgFilter}
            onChange={(e) => setMsgFilter(e.target.value)}
          />
        </span>

        <span className="field">
          <button className="clearFilters" onClick={clearFilters}>
            Clear
          </button>
        </span>
      </div>

      <div id="content">
        <div className="instructions">
          <p>
            When a maintainer runs <code>bun run wikidata</code>, the script
            connects to{" "}
            <a href="https://www.wikidata.org/wiki/Wikidata:Main_Page">
              Wikidata
            </a>{" "}
            and tries to fetch logos and descriptions for every entry in the
            Name Suggestion Index. Anything Wikidata can't provide ends up in
            the table below.
          </p>
          <p>
            See the{" "}
            <a href="https://github.com/osmlab/name-suggestion-index/wiki/Editing-Wikidata">
              Editing Wikidata
            </a>{" "}
            wiki page for full guidance. Quick summary by warning type:
          </p>
          <ul>
            <li>
              <strong>Deleted entries</strong>: the Wikidata page no longer
              exists. The QID link opens the deletion log so you can ask the
              admin who deleted it to{" "}
              <a href="https://github.com/osmlab/name-suggestion-index/wiki/Editing-Wikidata#undeletion-of-wikidata-pages">
                undelete it
              </a>
              .
            </li>
            <li>
              <strong>Facebook API errors</strong>: usually access
              restrictions or a profile incorrectly set up as personal. Add an{" "}
              <a href="https://www.wikidata.org/wiki/Property:P6954">
                online access status
              </a>{" "}
              qualifier (e.g.{" "}
              <a href="https://www.wikidata.org/wiki/Q58370623">
                private account
              </a>
              ,{" "}
              <a href="https://www.wikidata.org/wiki/Q107459441">
                registration required
              </a>
              ,{" "}
              <a href="https://www.wikidata.org/wiki/Q113165094">
                location restricted
              </a>
              ) to the{" "}
              <a href="https://www.wikidata.org/wiki/Property:P2013">
                Facebook username
              </a>{" "}
              statement, or mark personal profiles with{" "}
              <a href="https://www.wikidata.org/wiki/Property:P6477">
                does not have characteristic
              </a>{" "}
              ={" "}
              <a href="https://www.wikidata.org/wiki/Q134432781">
                professional account
              </a>
              .
            </li>
            <li>
              <strong>Possible replacements</strong>: the entry has a{" "}
              <a href="https://www.wikidata.org/wiki/Property:P156">
                followed by
              </a>
              ,{" "}
              <a href="https://www.wikidata.org/wiki/Property:P1366">
                replaced by
              </a>
              , or{" "}
              <a href="https://www.wikidata.org/wiki/Property:P7888">
                merged into
              </a>{" "}
              statement. Evaluate the suggestion and update NSI if the
              original entity is defunct.
            </li>
            <li>
              <strong>Unresolved redirects</strong>: the QID redirects to a
              newer entry. Update NSI to use the target QID directly.
            </li>
          </ul>
          <p>
            Fixes won't disappear from this list until <code>bun run wikidata</code>{" "}
            and <code>bun run dist</code> are run again to refresh the data{" "}
            <a href="https://nsi.guide/">nsi.guide</a> pulls from the{" "}
            <a href="https://github.com/osmlab/name-suggestion-index">
              NSI GitHub project
            </a>
            .
          </p>
        </div>

        {error && (
          <div className="warnings-status error">
            Failed to load warnings: {error}
          </div>
        )}
        {!error && !data && (
          <div className="warnings-status">Loading, please wait…</div>
        )}

        {data && (
          <>
            <div className="warnings-summary">
              Showing <strong>{filtered.length}</strong> of{" "}
              <strong>{warnings.length}</strong> warning
              {warnings.length === 1 ? "" : "s"}
              {generated && (
                <>
                  {" "}
                  (generated{" "}
                  {generated.toLocaleString("default", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  )
                </>
              )}
            </div>

            <table className="summary warnings">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => toggleSort("qid")}>
                    Wikidata QID {sortIcon("qid")}
                  </th>
                  <th
                    className="sortable"
                    onClick={() => toggleSort("category")}
                  >
                    Type {sortIcon("category")}
                  </th>
                  <th className="sortable" onClick={() => toggleSort("msg")}>
                    Message {sortIcon("msg")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w, i) => (
                  <tr key={`${w.qid}-${i}`} className={`warn ${w.category}`}>
                    <td className="qid">
                      <a
                        href={`https://www.wikidata.org/wiki/${w.qid}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {w.qid}
                      </a>
                    </td>
                    <td className="type">
                      {CATEGORIES[w.category]?.label || w.category}
                    </td>
                    <td className="msg">{renderMessage(w.msg)}</td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={3} className="nowarn">
                      No warnings match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  );
};
