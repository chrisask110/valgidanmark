"use client";

import { useMemo } from "react";
import { PARTIES, PARTY_KEYS, type Poll } from "@/app/lib/data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "./LanguageContext";

interface LatestPollsTableProps {
  polls: Poll[];
  limit?: number;
}

const DA_MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()}. ${DA_MONTHS[dt.getMonth()]} '${String(dt.getFullYear()).slice(2)}`;
}

export function LatestPollsTable({ polls, limit = 15 }: LatestPollsTableProps) {
  const { t } = useLanguage();

  const sorted = useMemo(
    () => [...polls].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit),
    [polls, limit]
  );

  return (
    <div className="overflow-x-auto rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-card z-10 min-w-[90px]">{t("table.date")}</TableHead>
            <TableHead className="min-w-[80px]">{t("table.pollster")}</TableHead>
            <TableHead className="text-right min-w-[55px]">{t("table.n")}</TableHead>
            {PARTY_KEYS.map(pk => (
              <TableHead key={pk} className="text-right min-w-[36px] px-2">
                <span className="font-bold" style={{ color: PARTIES[pk].color }}>
                  {PARTIES[pk].short}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((poll, i) => (
            <TableRow key={i}>
              <TableCell className="sticky left-0 bg-card z-10 font-mono text-xs text-muted-foreground whitespace-nowrap">
                {fmtDate(poll.date)}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                {poll.pollster}
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                {poll.n.toLocaleString("da-DK")}
              </TableCell>
              {PARTY_KEYS.map(pk => {
                const val = poll[pk];
                const num = val !== undefined ? Number(val) : null;
                return (
                  <TableCell key={pk} className="text-right font-mono text-xs px-2">
                    {num !== null && num > 0 ? (
                      <span
                        className="font-semibold"
                        style={{
                          color: num >= 2 ? PARTIES[pk].color : "hsl(var(--muted-foreground))",
                          opacity: num < 2 ? 0.5 : 1,
                        }}
                      >
                        {num.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground opacity-30">—</span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
