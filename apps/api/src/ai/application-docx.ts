import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
} from 'docx';
import {
  ApplicationProfile,
  GOST,
  buildAddresseeLines,
  extractStatementBody,
  formatGostDate,
  shortName,
} from './application-layout';

export type ApplicationDocInput = ApplicationProfile & {
  requestType: string;
  body: string;
};

const noBorder = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

function run(text: string, opts?: { bold?: boolean }) {
  return new TextRun({
    text,
    font: GOST.font,
    size: GOST.fontSize,
    bold: opts?.bold,
  });
}

function rightLine(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { line: GOST.line, lineRule: 'auto', after: 0 },
    children: [run(text)],
  });
}

function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.BOTH,
    indent: { firstLine: GOST.firstLineIndent },
    spacing: { line: GOST.line, lineRule: 'auto', after: 0 },
    children: [run(text)],
  });
}

function emptyLine(): Paragraph {
  return new Paragraph({
    spacing: { line: GOST.line, lineRule: 'auto' },
    children: [run('')],
  });
}

/** Formal A4 заявление per GOST R 7.0.97-2016 university practice. */
export async function buildApplicationDocx(
  input: ApplicationDocInput,
): Promise<Buffer> {
  const profile: ApplicationProfile = {
    fullName: input.fullName,
    faculty: input.faculty,
    program: input.program,
    course: input.course,
    groupLabel: input.groupLabel,
  };

  const header = buildAddresseeLines(profile).map((line) =>
    line ? rightLine(line) : emptyLine(),
  );

  const title = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 120, line: GOST.line, lineRule: 'auto' },
    children: [run('ЗАЯВЛЕНИЕ', { bold: true })],
  });

  const typeLine = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 300, line: GOST.line, lineRule: 'auto' },
    children: [run(input.requestType)],
  });

  const essence = extractStatementBody(input.body) || input.body.trim();
  const bodyParas = essence
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => bodyParagraph(p));

  const contentWidth = GOST.pageWidth - GOST.marginLeft - GOST.marginRight;
  const half = Math.floor(contentWidth / 2);

  const signTable = new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths: [half, half],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorder,
            width: { size: half, type: WidthType.DXA },
            children: [
              new Paragraph({
                spacing: { line: GOST.line, lineRule: 'auto' },
                children: [run(formatGostDate())],
              }),
            ],
          }),
          new TableCell({
            borders: noBorder,
            width: { size: half, type: WidthType.DXA },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { line: GOST.line, lineRule: 'auto' },
                children: [
                  run(`___________ / ${shortName(profile.fullName)} /`),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: GOST.pageWidth,
              height: GOST.pageHeight,
            },
            margin: {
              top: GOST.marginTop,
              right: GOST.marginRight,
              bottom: GOST.marginBottom,
              left: GOST.marginLeft,
            },
          },
        },
        children: [
          ...header,
          emptyLine(),
          title,
          typeLine,
          ...bodyParas,
          emptyLine(),
          emptyLine(),
          signTable,
        ],
      },
    ],
  });

  const out = await Packer.toBuffer(doc);
  return Buffer.isBuffer(out) ? out : Buffer.from(out);
}
