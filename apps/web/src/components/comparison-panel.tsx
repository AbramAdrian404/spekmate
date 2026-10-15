"use client";

import { useEffect, useState } from "react";
import { formatRupiahCompact, formatRupiahRange } from "@/lib/format";
import { CONDITION_LABEL } from "@/lib/labels";
import type { Recommendation } from "@/lib/types";
import { StatusBadge, VerdictBadge } from "./verdict-badge";

/**
 * The side-by-side table for whichever recommendation cards have their "Bandingkan" box checked.
 * Reads the checkboxes through a plain `change` listener instead of lifting state into every card
 * (the same pattern as ConsultProgress), so RecommendationCard stays a server-rendered component
 * with one plain, uncontrolled checkbox in it. `results` is the same data the cards already
 * received, passed down once so this never has to re-fetch anything of its own.
 *
 * Renders nothing below two selections -- comparing is a two-or-more-laptop question, and a lone
 * checked box is just "shortlisted", not yet a comparison.
 */
export function ComparisonPanel({ results }: { results: Recommendation[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const recompute = () => {
      const boxes = document.querySelectorAll<HTMLInputElement>("input[data-compare]:checked");
      setSelectedIds(Array.from(boxes).map((box) => box.value));
    };
    recompute();
    document.addEventListener("change", recompute);
    return () => document.removeEventListener("change", recompute);
  }, []);

  const items = results.filter((item) => selectedIds.includes(item.variant_id));
  if (items.length < 2) return null;

  // Every item here was assessed against the same picked need(s), so they share the same set of
  // assessed criteria -- the first item's list is a safe, honest row order for all of them.
  const criteriaRows = items[0].criteria.filter((criterion) => criterion.status !== "tidak_dinilai");

  const clearAll = () => {
    document.querySelectorAll<HTMLInputElement>("input[data-compare]:checked").forEach((box) => {
      box.checked = false;
    });
    setSelectedIds([]);
  };

  return (
    <section aria-labelledby="perbandingan-judul" className="reveal card space-y-4 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="perbandingan-judul" className="text-xl font-semibold sm:text-2xl">
          Membandingkan {items.length} laptop
        </h2>
        <button type="button" onClick={clearAll} className="btn btn-secondary">
          Kosongkan
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <caption className="sr-only">Perbandingan spesifikasi dan harga untuk laptop yang dipilih untuk dibandingkan</caption>
          <thead>
            <tr>
              <th scope="col">Kriteria</th>
              {items.map((item) => (
                <th scope="col" key={item.variant_id}>
                  {item.model_name}
                  <span className="mt-0.5 block font-normal normal-case tracking-normal text-ink-3">
                    {item.variant_title} · {CONDITION_LABEL[item.condition]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="font-semibold">
                Kecocokan
              </th>
              {items.map((item) => (
                <td key={item.variant_id}>
                  <VerdictBadge verdict={item.verdict} label={item.verdict_label} size="sm" />
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="font-semibold">
                Harga acuan
              </th>
              {items.map((item) => (
                <td key={item.variant_id} className="tabular">
                  {formatRupiahCompact(item.price.reference)}
                  <span className="block text-xs text-ink-3">{formatRupiahRange(item.price.low, item.price.high)}</span>
                </td>
              ))}
            </tr>
            {criteriaRows.map((row) => (
              <tr key={row.key}>
                <th scope="row" className="font-semibold">
                  {row.label}
                </th>
                {items.map((item) => {
                  const criterion = item.criteria.find((candidate) => candidate.key === row.key);
                  return (
                    <td key={item.variant_id} className="tabular">
                      <span className="block">{criterion?.value_text ?? <span className="italic text-ink-3">belum diketahui</span>}</span>
                      {criterion ? <StatusBadge status={criterion.status} label={criterion.status_label} size="sm" className="mt-1" /> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
