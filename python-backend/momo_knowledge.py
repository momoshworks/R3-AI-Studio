import os
import re
import json
import uuid
import time
import math
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Dict, Any, Optional

def extract_text_from_file(file_path: Path) -> str:
    """Extracts readable text from virtually any file type (PDF, DOCX, Code, Text, CSV, JSON, Markdown)."""
    ext = file_path.suffix.lower()
    
    # 1. PDF Documents
    if ext == ".pdf":
        try:
            import pypdf
            reader = pypdf.PdfReader(str(file_path))
            pages_text = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                if text.strip():
                    pages_text.append(f"--- [صفحة {i + 1}] ---\n{text.strip()}")
            if pages_text:
                return "\n\n".join(pages_text)
        except Exception as e:
            print(f"[MOMO Knowledge] PDF extract note: {e}")

    # 2. Word Documents (.docx)
    if ext in [".docx", ".docm"]:
        try:
            with zipfile.ZipFile(file_path, "r") as z:
                if "word/document.xml" in z.namelist():
                    xml_content = z.read("word/document.xml")
                    tree = ET.fromstring(xml_content)
                    paragraphs = []
                    for p in tree.iter():
                        if p.tag.endswith("}p"):
                            texts = [node.text for node in p.iter() if node.text and node.tag.endswith("}t")]
                            p_text = "".join(texts).strip()
                            if p_text:
                                paragraphs.append(p_text)
                    if paragraphs:
                        return "\n\n".join(paragraphs)
        except Exception as e:
            print(f"[MOMO Knowledge] DOCX extract note: {e}")

    # 3. CSV and Tabular files
    if ext in [".csv", ".tsv"]:
        try:
            raw = file_path.read_text(encoding="utf-8", errors="replace")
            lines = raw.strip().splitlines()
            if lines:
                return f"--- [بيانات جدولية CSV ({len(lines)} سطر)] ---\n" + "\n".join(lines[:500])
        except Exception:
            pass

    # 4. JSON / Data files
    if ext == ".json":
        try:
            raw = file_path.read_text(encoding="utf-8", errors="replace")
            parsed = json.loads(raw)
            return f"--- [بيانات JSON المهيكلة] ---\n" + json.dumps(parsed, indent=2, ensure_ascii=False)[:30000]
        except Exception:
            pass

    # 5. Image Information
    if ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"]:
        try:
            from PIL import Image
            with Image.open(file_path) as img:
                return f"--- [ملف صورة: {file_path.name}] ---\nالصيغة: {img.format}\nالأبعاد: {img.width}x{img.height} بكسل\nنمط الألوان: {img.mode}"
        except Exception:
            pass

    # 6. Plain Text / Code / Markdown / Scripts / Everything Else
    encodings = ["utf-8", "utf-8-sig", "cp1256", "latin-1"]
    for enc in encodings:
        try:
            raw = file_path.read_text(encoding=enc)
            if raw.strip():
                return raw.strip()
        except Exception:
            continue

    # Fallback binary string extract
    try:
        content = file_path.read_bytes()
        printable = "".join(chr(b) if 32 <= b <= 126 or b in [10, 13, 9] else " " for b in content[:20000])
        clean = " ".join(printable.split())
        if len(clean) > 50:
            return clean
    except Exception:
        pass

    return f"[ملف: {file_path.name} - تم حفظه وفهرسته بنجاح في قاعدة بيانات MOMO1]"


class MomoKnowledgeVault:
    def __init__(self, storage_dir: Path):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.files_dir = self.storage_dir / "documents"
        self.files_dir.mkdir(parents=True, exist_ok=True)
        self.index_file = self.storage_dir / "knowledge_index.json"
        self._ensure_index()

    def _ensure_index(self):
        if not self.index_file.exists():
            self.index_file.write_text("[]", encoding="utf-8")

    def _load_index(self) -> List[Dict[str, Any]]:
        try:
            return json.loads(self.index_file.read_text(encoding="utf-8"))
        except Exception:
            return []

    def _save_index(self, docs: List[Dict[str, Any]]):
        self.index_file.write_text(json.dumps(docs, indent=2, ensure_ascii=False), encoding="utf-8")

    def add_document(self, filename: str, content: bytes) -> Dict[str, Any]:
        """Saves, parses, and chunks a document into MOMO1's offline knowledge vault."""
        doc_id = f"doc_{uuid.uuid4().hex[:8]}"
        safe_name = Path(filename).name
        target_path = self.files_dir / f"{doc_id}_{safe_name}"
        target_path.write_bytes(content)

        # Extract Text
        extracted_text = extract_text_from_file(target_path)
        char_count = len(extracted_text)

        # Chunk text (approx 1000 characters per chunk with 150 overlap)
        chunks = []
        chunk_size = 1000
        overlap = 150
        step = max(1, chunk_size - overlap)
        
        for i in range(0, max(1, len(extracted_text)), step):
            segment = extracted_text[i : i + chunk_size].strip()
            if segment:
                chunks.append({
                    "chunk_id": len(chunks),
                    "text": segment
                })

        # Generate quick summary / preview
        preview = extracted_text[:250].replace("\n", " ").strip()
        if len(extracted_text) > 250:
            preview += "..."

        doc_entry = {
            "id": doc_id,
            "filename": safe_name,
            "file_size": len(content),
            "file_type": Path(filename).suffix.replace(".", "").lower() or "txt",
            "upload_time": int(time.time()),
            "char_count": char_count,
            "chunks_count": len(chunks),
            "preview": preview,
            "chunks": chunks
        }

        docs = self._load_index()
        # Prepend new document
        docs.insert(0, doc_entry)
        self._save_index(docs)

        return {
            "id": doc_id,
            "filename": safe_name,
            "file_size": len(content),
            "file_type": doc_entry["file_type"],
            "upload_time": doc_entry["upload_time"],
            "char_count": char_count,
            "chunks_count": len(chunks),
            "preview": preview
        }

    def list_documents(self) -> List[Dict[str, Any]]:
        """Returns list of all documents without heavy chunks payload."""
        docs = self._load_index()
        results = []
        for d in docs:
            results.append({
                "id": d.get("id"),
                "filename": d.get("filename"),
                "file_size": d.get("file_size", 0),
                "file_type": d.get("file_type", "txt"),
                "upload_time": d.get("upload_time", 0),
                "char_count": d.get("char_count", 0),
                "chunks_count": d.get("chunks_count", 0),
                "preview": d.get("preview", "")
            })
        return results

    def get_document_content(self, doc_id: str) -> Optional[str]:
        """Returns full text of a specific document."""
        docs = self._load_index()
        for d in docs:
            if d.get("id") == doc_id:
                chunks = d.get("chunks", [])
                return "\n\n".join(c.get("text", "") for c in chunks)
        return None

    def delete_document(self, doc_id: str) -> bool:
        """Removes a document from disk and index."""
        docs = self._load_index()
        new_docs = []
        found = False
        for d in docs:
            if d.get("id") == doc_id:
                found = True
                safe_name = d.get("filename", "")
                target = self.files_dir / f"{doc_id}_{safe_name}"
                if target.exists():
                    try:
                        target.unlink()
                    except Exception:
                        pass
            else:
                new_docs.append(d)

        if found:
            self._save_index(new_docs)
        return found

    def search_relevant_context(self, query: str, top_k: int = 6) -> str:
        """Finds most relevant chunks across all trained documents matching the query."""
        docs = self._load_index()
        if not docs:
            return ""

        words = [w.lower() for w in re.findall(r"[\w\u0600-\u06FF]+", query) if len(w) > 1]
        scored_chunks = []

        for d in docs:
            fname = d.get("filename", "مستند")
            for c in d.get("chunks", []):
                text = c.get("text", "")
                text_lower = text.lower()
                # Keyword match score
                score = 0
                for w in words:
                    if w in text_lower:
                        score += 3
                    if w in fname.lower():
                        score += 5
                
                if score > 0 or len(docs) == 1:
                    scored_chunks.append((score, fname, text))

        # Sort by score descending
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        top_chunks = scored_chunks[:top_k]

        if not top_chunks and docs:
            # If no direct keyword match, grab top chunks from the latest document
            latest = docs[0]
            fname = latest.get("filename", "مستند")
            top_chunks = [(1, fname, c.get("text", "")) for c in latest.get("chunks", [])[:top_k]]

        if not top_chunks:
            return ""

        context_blocks = []
        for _, fname, text in top_chunks:
            context_blocks.append(f"📄 [مصدر المعرفة: {fname}]:\n{text}")

        return "\n\n---\n\n".join(context_blocks)
