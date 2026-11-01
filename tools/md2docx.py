"""Chuyển một file Markdown (đề cương) sang Word .docx.
Hỗ trợ: heading #/##/###, đoạn văn, bullet '- ', danh sách số 'N.', in đậm **..**,
mã `..` (bỏ backtick), bảng Markdown (| ... |) với <br> xuống dòng trong ô, và '>' ghi chú.
Dùng: python tools/md2docx.py <input.md> <output.docx>
"""
import re
import sys

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt

BOLD_RE = re.compile(r"\*\*(.+?)\*\*")
NUM_RE = re.compile(r"(\d+)\.\s+(.*)")
SEP_CELL_RE = re.compile(r":?-{2,}:?")


def clean_inline(text):
    return text.replace("`", "")


def add_inline(paragraph, text):
    pos = 0
    for match in BOLD_RE.finditer(text):
        if match.start() > pos:
            paragraph.add_run(clean_inline(text[pos:match.start()]))
        run = paragraph.add_run(clean_inline(match.group(1)))
        run.bold = True
        pos = match.end()
    if pos < len(text):
        paragraph.add_run(clean_inline(text[pos:]))


def add_cell_content(cell, text):
    cell.paragraphs[0].text = ""
    segments = text.split("<br>")
    para = cell.paragraphs[0]
    for index, segment in enumerate(segments):
        if index > 0:
            para = cell.add_paragraph()
        add_inline(para, segment.strip())


def is_separator_row(cells):
    non_empty = [c.strip() for c in cells if c.strip()]
    return bool(non_empty) and all(SEP_CELL_RE.fullmatch(c) for c in non_empty)


def parse_table(block):
    rows = []
    for line in block:
        inner = line.strip()
        if inner.startswith("|"):
            inner = inner[1:]
        if inner.endswith("|"):
            inner = inner[:-1]
        rows.append([c.strip() for c in inner.split("|")])
    return [r for r in rows if not is_separator_row(r)]


def build(src, dst):
    with open(src, encoding="utf-8") as handle:
        lines = handle.read().replace("\r\n", "\n").split("\n")

    doc = Document()
    normal = doc.styles["Normal"]
    normal.font.name = "Times New Roman"
    normal.font.size = Pt(12)

    seen_heading = False
    index = 0
    total = len(lines)

    while index < total:
        stripped = lines[index].strip()
        if stripped == "":
            index += 1
            continue

        if stripped.startswith("|"):
            block = []
            while index < total and lines[index].strip().startswith("|"):
                block.append(lines[index])
                index += 1
            data = parse_table(block)
            if data:
                cols = max(len(r) for r in data)
                table = doc.add_table(rows=0, cols=cols)
                table.style = "Table Grid"
                for row_index, row in enumerate(data):
                    cells = table.add_row().cells
                    for col_index in range(cols):
                        value = row[col_index] if col_index < len(row) else ""
                        add_cell_content(cells[col_index], value)
                        if row_index == 0:
                            for para in cells[col_index].paragraphs:
                                for run in para.runs:
                                    run.bold = True
            continue

        if stripped.startswith("### "):
            doc.add_heading(clean_inline(stripped[4:]), level=2)
            seen_heading = True
        elif stripped.startswith("## "):
            doc.add_heading(clean_inline(stripped[3:]), level=1)
            seen_heading = True
        elif stripped.startswith("# "):
            heading = doc.add_heading(clean_inline(stripped[2:]), level=0)
            heading.alignment = WD_ALIGN_PARAGRAPH.CENTER
            seen_heading = True
        elif stripped == "---":
            pass
        elif stripped.startswith("> "):
            para = doc.add_paragraph()
            run = para.add_run(clean_inline(stripped[2:].replace("*", "")))
            run.italic = True
        elif stripped.startswith("- "):
            add_inline(doc.add_paragraph(style="List Bullet"), stripped[2:])
        elif NUM_RE.match(stripped):
            add_inline(doc.add_paragraph(style="List Number"), NUM_RE.match(stripped).group(2))
        else:
            para = doc.add_paragraph()
            if not seen_heading:
                para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            add_inline(para, stripped)
        index += 1

    doc.save(dst)
    print("Saved:", dst)


if __name__ == "__main__":
    build(sys.argv[1], sys.argv[2])
