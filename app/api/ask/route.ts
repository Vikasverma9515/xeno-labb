import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { generateSqlFromQuestion, guardReadOnlySql } from "@/lib/ai";
import { matchCannedQuestion } from "@/lib/canned-questions";

export async function POST(req: Request) {
  const { question } = await req.json();
  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  let rawSql: string;
  let narrative: string;
  let provider: string;

  try {
    const ai = await generateSqlFromQuestion(question);
    rawSql = ai.sqlText;
    narrative = ai.narrative;
    provider = ai.provider;
  } catch (e) {
    console.error("[ask] LLM generation failed, falling back to template:", e);
    const canned = matchCannedQuestion(question);
    rawSql = canned.sql;
    narrative = canned.narrative;
    provider = "template-fallback (no LLM key configured)";
  }

  let safeSql: string;
  try {
    safeSql = guardReadOnlySql(rawSql);
  } catch (e) {
    return NextResponse.json(
      { error: `Generated query rejected: ${(e as Error).message}`, attemptedSql: rawSql },
      { status: 422 }
    );
  }

  try {
    const rows = await sql.begin(async (tx) => {
      await tx.unsafe("set transaction read only");
      return tx.unsafe(safeSql);
    });
    return NextResponse.json({ sql: safeSql, narrative, provider, rows });
  } catch (e) {
    return NextResponse.json(
      { error: `Query failed: ${(e as Error).message}`, sql: safeSql },
      { status: 500 }
    );
  }
}
