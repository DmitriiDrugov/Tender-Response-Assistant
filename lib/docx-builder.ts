import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  type IParagraphOptions,
  type IRunOptions,
  PageNumber,
  Paragraph,
  TextRun,
} from "docx";
import type { TenderFull, Requirement } from "@/lib/types";

const FONT = "Cambria"; // Common procurement font; falls back to Times New Roman on machines without it.

function p(text: string, opts: Partial<IParagraphOptions> = {}, runOpts: Partial<IRunOptions> = {}) {
  return new Paragraph({
    spacing: { line: 276, after: 120 },
    ...opts,
    children: [new TextRun({ text, font: FONT, size: 22, ...runOpts })],
  });
}

function bold(text: string, size = 22): Paragraph {
  return p(text, {}, { bold: true, size });
}

function italic(text: string): Paragraph {
  return p(text, {}, { italics: true });
}

function rule(): Paragraph {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    border: {
      top: { style: BorderStyle.SINGLE, size: 6, color: "888888" },
    },
    children: [],
  });
}

export function buildExportDocx(opts: { tender: TenderFull; includedRequirementIds: string[] }): Document {
  const { tender, includedRequirementIds } = opts;
  const includedSet = new Set(includedRequirementIds);
  const requirements = tender.requirements.filter((r) => includedSet.has(r.id));

  const today = new Date().toISOString().slice(0, 10);

  const headerParas: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 80 },
      children: [
        new TextRun({ text: "TENDER RESPONSE", font: FONT, size: 28, bold: true }),
      ],
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "333333" } },
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: tender.title || "Untitled tender", font: FONT, size: 26, bold: true }),
      ],
    }),
    p(
      [
        tender.issuing_authority ? `Issuing authority: ${tender.issuing_authority}` : null,
        tender.tender_id_external ? `Tender ID: ${tender.tender_id_external}` : null,
        tender.submission_deadline ? `Submission deadline: ${tender.submission_deadline}` : null,
        `Response prepared: ${today}`,
      ]
        .filter(Boolean)
        .join("    ·    "),
      {},
      { italics: true, color: "555555", size: 20 },
    ),
  ];

  if (tender.scope_summary) {
    headerParas.push(bold("Scope summary", 24));
    headerParas.push(p(tender.scope_summary));
  }

  // Group requirements by category
  const grouped = new Map<string, Requirement[]>();
  for (const r of requirements) {
    const key = r.category || "Uncategorized";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }

  const bodyParas: Paragraph[] = [bold("Requirements and responses", 26)];

  let counter = 0;
  for (const [category, rows] of grouped) {
    bodyParas.push(bold(category, 24));
    for (const r of rows) {
      counter++;
      bodyParas.push(rule());
      bodyParas.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: `${counter}.  `, font: FONT, size: 22, bold: true }),
            new TextRun({ text: r.text, font: FONT, size: 22, italics: true }),
            ...(r.is_mandatory
              ? [new TextRun({ text: "  [MANDATORY]", font: FONT, size: 18, bold: true, color: "8B0000" })]
              : []),
          ],
        }),
      );
      if (r.source_excerpt) {
        bodyParas.push(
          new Paragraph({
            spacing: { after: 80 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: `Source: “${r.source_excerpt}”`,
                font: FONT,
                size: 18,
                color: "666666",
              }),
            ],
          }),
        );
      }
      bodyParas.push(bold("Response", 20));
      bodyParas.push(p(r.draft_response?.trim() || "[Pending bid manager input]"));
      if (r.reviewer_notes) {
        bodyParas.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: "Reviewer note: ", font: FONT, size: 18, bold: true, color: "555555" }),
              new TextRun({ text: r.reviewer_notes, font: FONT, size: 18, color: "555555" }),
            ],
          }),
        );
      }
    }
  }

  // Risks appendix
  const riskParas: Paragraph[] = [];
  if (tender.risks.length > 0) {
    riskParas.push(bold("Identified risks", 24));
    const ordered = [...tender.risks].sort((a, b) => sevRank(a.severity) - sevRank(b.severity));
    for (const risk of ordered) {
      riskParas.push(
        new Paragraph({
          spacing: { before: 80, after: 60 },
          children: [
            new TextRun({ text: `[${risk.severity.toUpperCase()}] `, font: FONT, size: 20, bold: true }),
            new TextRun({ text: risk.category, font: FONT, size: 20, bold: true }),
          ],
        }),
      );
      riskParas.push(p(risk.description));
      if (risk.source_location) {
        riskParas.push(p(`Source: ${risk.source_location}`, {}, { italics: true, color: "555555", size: 18 }));
      }
      if (risk.recommended_action) {
        riskParas.push(p(`Recommended action: ${risk.recommended_action}`, {}, { size: 20 }));
      }
    }
  }

  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text: `${tender.tender_id_external || "Tender response"} · `,
            font: FONT,
            size: 16,
            color: "888888",
          }),
          new TextRun({ children: ["Page ", PageNumber.CURRENT], font: FONT, size: 16, color: "888888" }),
          new TextRun({ text: " of ", font: FONT, size: 16, color: "888888" }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: "888888" }),
          new TextRun({ text: `    ·    ${today}`, font: FONT, size: 16, color: "888888" }),
        ],
      }),
    ],
  });

  return new Document({
    creator: "Tender Response Assistant",
    title: tender.title,
    description: "Tender response draft",
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1400, right: 1400, bottom: 1400, left: 1400 },
          },
        },
        footers: { default: footer },
        children: [...headerParas, ...bodyParas, ...riskParas],
      },
    ],
  });
}

function sevRank(s: TenderFull["risks"][number]["severity"]): number {
  return s === "critical" ? 0 : s === "high" ? 1 : s === "medium" ? 2 : 3;
}
