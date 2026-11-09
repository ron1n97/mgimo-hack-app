import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';

export type ApplicationDocInput = {
  studentName: string;
  faculty?: string;
  program?: string;
  course?: number;
  groupLabel?: string;
  requestType: string;
  body: string;
};

function parasFromText(text: string): Paragraph[] {
  const blocks = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return [
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: '', font: 'Times New Roman', size: 28 })],
      }),
    ];
  }

  return blocks.flatMap((block) => {
    const lines = block.split('\n');
    return lines.map(
      (line, idx) =>
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: idx === lines.length - 1 ? 240 : 60 },
          indent: { firstLine: 720 },
          children: [
            new TextRun({
              text: line.trim(),
              font: 'Times New Roman',
              size: 28, // 14pt
            }),
          ],
        }),
    );
  });
}

function rightMeta(lines: string[]): Paragraph[] {
  return lines
    .filter(Boolean)
    .map(
      (line) =>
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: line,
              font: 'Times New Roman',
              size: 28,
            }),
          ],
        }),
    );
}

/** Formal A4 заявление as .docx (Times New Roman). */
export async function buildApplicationDocx(
  input: ApplicationDocInput,
): Promise<Buffer> {
  // Packer typings vary by docx major; normalize to Buffer below.
  const who: string[] = [];
  who.push(`от ${input.studentName}`);
  if (input.course) who.push(`студента(ки) ${input.course} курса`);
  if (input.faculty) who.push(`факультет: ${input.faculty}`);
  if (input.program) who.push(`направление: ${input.program}`);
  if (input.groupLabel) who.push(`группа: ${input.groupLabel}`);

  const header = rightMeta([
    'Декану',
    input.faculty ? `факультета «${input.faculty}»` : 'факультета',
    ...who,
  ]);

  const title = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 400 },
    children: [
      new TextRun({
        text: 'ЗАЯВЛЕНИЕ',
        bold: true,
        font: 'Times New Roman',
        size: 28,
      }),
    ],
  });

  const typeLine = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
    children: [
      new TextRun({
        text: `(${input.requestType})`,
        font: 'Times New Roman',
        size: 24,
        italics: true,
      }),
    ],
  });

  const body = parasFromText(input.body);

  const sign = [
    new Paragraph({
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: 'Дата: ______________',
          font: 'Times New Roman',
          size: 28,
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: `Подпись: ______________ / ${input.studentName} /`,
          font: 'Times New Roman',
          size: 28,
        }),
      ],
    }),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // ~2cm
              right: 850,
              bottom: 1134,
              left: 1701, // ~3cm left for filing
            },
          },
        },
        children: [...header, title, typeLine, ...body, ...sign],
      },
    ],
  });

  const out = await Packer.toBuffer(doc);
  return Buffer.isBuffer(out) ? out : Buffer.from(out);
}
