from __future__ import annotations

import copy
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def q(tag: str) -> str:
    return f"{W}{tag}"


def clone_paragraph_with_text(template: ET.Element, text: str) -> ET.Element:
    para = copy.deepcopy(template)
    for child in list(para):
        if child.tag != q("pPr"):
            para.remove(child)

    run = ET.SubElement(para, q("r"))
    t = ET.SubElement(run, q("t"))
    if text.startswith(" ") or text.endswith(" "):
        t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    t.text = text
    return para


def build_paragraph(text: str, style_val: str | None, template: ET.Element | None = None) -> ET.Element:
    if template is not None:
        para = copy.deepcopy(template)
        for child in list(para):
            if child.tag != q("pPr"):
                para.remove(child)
    else:
        para = ET.Element(q("p"))

    ppr = para.find(q("pPr"))
    if style_val is not None:
        if ppr is None:
            ppr = ET.SubElement(para, q("pPr"))
        pstyle = ppr.find(q("pStyle"))
        if pstyle is None:
            pstyle = ET.SubElement(ppr, q("pStyle"))
        pstyle.set(q("val"), style_val)

    run = ET.SubElement(para, q("r"))
    t = ET.SubElement(run, q("t"))
    if text.startswith(" ") or text.endswith(" "):
        t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    t.text = text
    return para


def paragraph_text(p: ET.Element) -> str:
    return "".join((t.text or "") for t in p.findall(".//w:t", NS)).strip()


def paragraph_style(p: ET.Element) -> str:
    pstyle = p.find("./w:pPr/w:pStyle", NS)
    return pstyle.get(q("val")) if pstyle is not None else ""


def main() -> None:
    src = Path(r"d:\app\appserv\www\work-main\tmp_sprint3.docx")
    out = Path(r"d:\app\appserv\www\work-main\tmp_sprint3_interview.docx")

    with zipfile.ZipFile(src, "r") as zin:
        files = {name: zin.read(name) for name in zin.namelist()}

    root = ET.fromstring(files["word/document.xml"])
    body = root.find("./w:body", NS)
    if body is None:
        raise RuntimeError("word body not found")

    paragraphs = [child for child in list(body) if child.tag == q("p") and paragraph_text(child)]

    heading21 = next((p for p in paragraphs if paragraph_style(p) == "21"), None)
    heading31 = next((p for p in paragraphs if paragraph_style(p) == "31"), None)
    body_template = next((p for p in paragraphs if paragraph_style(p) == ""), None)

    if heading21 is None or heading31 is None or body_template is None:
        raise RuntimeError("template paragraph not found")

    insert_at = None
    p_count = 0
    for idx, child in enumerate(list(body)):
        if child.tag != q("p"):
            continue
        p_count += 1
        if p_count == 190:
            insert_at = idx
            break

    if insert_at is None:
        raise RuntimeError("insertion point not found")

    new_nodes = []
    new_nodes.append(clone_paragraph_with_text(heading21, "一、課指組訪談結果"))
    new_nodes.append(clone_paragraph_with_text(body_template, "本次與課指組訪談後，確認系統核心需求應聚焦於社團資訊查詢、活動公告、報名審核、Q&A 互動與行政表單管理，並依學生、社團幹部與管理端區分操作權限。"))
    new_nodes.append(clone_paragraph_with_text(heading31, "登入與帳號管理"))
    new_nodes.append(clone_paragraph_with_text(body_template, "課指組提到，系統應維持簡單的登入流程，並可考慮 Gmail 或學校帳號等常用方式，以降低新生初次使用門檻。未登入者仍可瀏覽公開社團、活動與問答內容，但涉及報名、提問與管理的功能需登入後才可操作。"))
    new_nodes.append(clone_paragraph_with_text(heading31, "活動與報名流程"))
    new_nodes.append(clone_paragraph_with_text(body_template, "活動頁面需要清楚顯示時間、地點、主辦社團與報名狀態；若地點可直接連結 Google Map，將更有利於學生前往。對於額滿、審核或特殊限制的活動，系統也應保留報名與審核狀態的追蹤。"))
    new_nodes.append(clone_paragraph_with_text(heading31, "Q&A 與通知"))
    new_nodes.append(clone_paragraph_with_text(body_template, "課指組希望學生可透過 Q&A 提問，社團幹部或管理者能在系統內直接回覆，並透過通知機制讓提問者即時得知處理進度。若資料量增加，系統也應支援分類與篩選，方便快速查找。"))
    new_nodes.append(clone_paragraph_with_text(heading31, "表單與權限管理"))
    new_nodes.append(clone_paragraph_with_text(body_template, "針對場地借用、活動申請與會議記錄等行政作業，課指組希望能以表單下載與線上提交方式減少往返時間，並讓審核流程可追蹤。管理端需具備社團資料、公告、審核與權限控管功能，確保不同角色僅能操作授權範圍內的資料。"))

    for node in reversed(new_nodes):
        body.insert(insert_at, node)

    files["word/document.xml"] = ET.tostring(root, encoding="utf-8", xml_declaration=True)

    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as zout:
        for name, data in files.items():
            zout.writestr(name, data)


if __name__ == "__main__":
    main()
