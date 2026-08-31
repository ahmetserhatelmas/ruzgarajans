import JSZip from "jszip";

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function colName(index: number) {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function sheetXml(
  headers: string[],
  rows: string[][],
  opts?: { imageCol?: number; imageRowHeight?: number; hasDrawing?: boolean },
) {
  const colCount = headers.length;
  const lastCol = colName(colCount - 1);
  const lastRow = rows.length + 1;
  const ref = `A1:${lastCol}${lastRow}`;
  const imageCol = opts?.imageCol;
  const imageRowHeight = opts?.imageRowHeight ?? 96;

  const cols = headers
    .map((_, i) => {
      const width = i === imageCol ? 18 : i === 0 || i === 3 || i === 4 ? 28 : 16;
      return `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`;
    })
    .join("");

  const headerCells = headers
    .map((h, i) => `<c r="${colName(i)}1" t="inlineStr" s="1"><is><t>${xmlEscape(h)}</t></is></c>`)
    .join("");

  const body = rows
    .map((row, r) => {
      const cells = headers
        .map((_, i) => {
          const value = row[i] ?? "";
          return `<c r="${colName(i)}${r + 2}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
        })
        .join("");
      const ht =
        imageCol != null ? ` ht="${imageRowHeight}" customHeight="1"` : "";
      return `<row r="${r + 2}"${ht}>${cells}</row>`;
    })
    .join("");

  const drawing = opts?.hasDrawing ? `<drawing r:id="rId1"/>` : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="${ref}"/>
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <cols>${cols}</cols>
  <sheetData>
    <row r="1">${headerCells}</row>
    ${body}
  </sheetData>
  <autoFilter ref="${ref}"/>
  ${drawing}
</worksheet>`;
}

export type SheetImage = {
  rowIndex: number;
  colIndex: number;
  bytes: Uint8Array;
  ext: "jpeg" | "png";
};

function imageExt(bytes: Uint8Array): "jpeg" | "png" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  return null;
}

function drawingXml(images: SheetImage[]) {
  const anchors = images
    .map((img, i) => {
      const excelRow = img.rowIndex + 1;
      return `<xdr:twoCellAnchor>
  <xdr:from><xdr:col>${img.colIndex}</xdr:col><xdr:colOff>95250</xdr:colOff><xdr:row>${excelRow}</xdr:row><xdr:rowOff>95250</xdr:rowOff></xdr:from>
  <xdr:to><xdr:col>${img.colIndex + 1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${excelRow + 1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
  <xdr:pic>
    <xdr:nvPicPr>
      <xdr:cNvPr id="${i + 1}" name="Picture ${i + 1}"/>
      <xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr>
    </xdr:nvPicPr>
    <xdr:blipFill>
      <a:blip r:embed="rId${i + 1}"/>
      <a:stretch><a:fillRect/></a:stretch>
    </xdr:blipFill>
    <xdr:spPr>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    </xdr:spPr>
  </xdr:pic>
  <xdr:clientData/>
</xdr:twoCellAnchor>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
${anchors}
</xdr:wsDr>`;
}

export async function buildXlsxBytes(
  headers: string[],
  rows: string[][],
  sheetName = "Sayfa1",
  images: SheetImage[] = [],
): Promise<Uint8Array> {
  const zip = new JSZip();
  const readyImages = images
    .map((img) => ({ ...img, ext: img.ext || imageExt(img.bytes) }))
    .filter((img): img is SheetImage => img.ext === "jpeg" || img.ext === "png");
  const hasDrawing = readyImages.length > 0;
  const imageCol = readyImages[0]?.colIndex;

  const extraTypes = hasDrawing
    ? `<Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`
    : "";

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${extraTypes}
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
  );
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${xmlEscape(sheetName)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
  );
  zip.file(
    "xl/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1"><border/></borders>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
  </cellXfs>
</styleSheet>`,
  );
  zip.file(
    "xl/worksheets/sheet1.xml",
    sheetXml(headers, rows, { imageCol, imageRowHeight: 96, hasDrawing }),
  );

  const sheetRels = hasDrawing
    ? `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>`
    : "";
  zip.file(
    "xl/worksheets/_rels/sheet1.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
</Relationships>`,
  );

  if (hasDrawing) {
    zip.file("xl/drawings/drawing1.xml", drawingXml(readyImages));
    zip.file(
      "xl/drawings/_rels/drawing1.xml.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${readyImages
    .map(
      (img, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${i + 1}.${img.ext === "png" ? "png" : "jpeg"}"/>`,
    )
    .join("")}
</Relationships>`,
    );
    readyImages.forEach((img, i) => {
      zip.file(`xl/media/image${i + 1}.${img.ext === "png" ? "png" : "jpeg"}`, img.bytes);
    });
  }

  return zip.generateAsync({ type: "uint8array" });
}

export async function buildXlsxBlob(headers: string[], rows: string[][], sheetName = "Sayfa1") {
  const bytes = await buildXlsxBytes(headers, rows, sheetName);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function downloadXlsx(
  filename: string,
  headers: string[],
  rows: string[][],
  sheetName = "Sayfa1",
) {
  const blob = await buildXlsxBlob(headers, rows, sheetName);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
