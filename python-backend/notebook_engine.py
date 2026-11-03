import os
import sys
import json
import time
import uuid
import re
import math
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Dict, Any, Optional

import pypdf
import urllib.request
import urllib.parse

# Lazy-loaded fastembed embedding model
_EMBED_MODEL = None

def search_web_knowledge(query: str, max_results: int = 4) -> List[Dict[str, str]]:
    """Live internet search via DuckDuckGo and Wikipedia APIs."""
    results = []
    clean_q = query.strip()
    if not clean_q:
        return results

    # 1. Wikipedia Search (Arabic & English)
    for lang_code in ["ar", "en"]:
        try:
            wiki_url = f"https://{lang_code}.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + urllib.parse.quote(clean_q) + "&format=json&srlimit=2"
            req = urllib.request.Request(wiki_url, headers={"User-Agent": "R3-AI-Workstation/1.0"})
            with urllib.request.urlopen(req, timeout=3.5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                for item in data.get("query", {}).get("search", []):
                    raw_snippet = item.get("snippet", "")
                    clean_snippet = re.sub(r"<[^>]+>", "", raw_snippet).strip()
                    if clean_snippet:
                        results.append({
                            "title": f"ويكيبيديا ({item.get('title')})",
                            "snippet": clean_snippet,
                            "url": f"https://{lang_code}.wikipedia.org/wiki/" + urllib.parse.quote(item.get("title", ""))
                        })
        except Exception:
            pass

    # 2. DuckDuckGo Instant Answers
    try:
        ddg_url = "https://api.duckduckgo.com/?q=" + urllib.parse.quote(clean_q) + "&format=json"
        req = urllib.request.Request(ddg_url, headers={"User-Agent": "R3-AI-Workstation/1.0"})
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("AbstractText"):
                results.append({
                    "title": data.get("Heading", clean_q),
                    "snippet": data.get("AbstractText"),
                    "url": data.get("AbstractURL", "")
                })
            for topic in data.get("RelatedTopics", [])[:2]:
                if isinstance(topic, dict) and "Text" in topic:
                    results.append({
                        "title": topic.get("Text", "")[:60] + "...",
                        "snippet": topic.get("Text", ""),
                        "url": topic.get("FirstURL", "")
                    })
    except Exception:
        pass

    return results[:max_results]

def get_embed_model():
    global _EMBED_MODEL
    if _EMBED_MODEL is None:
        try:
            from fastembed import TextEmbedding
            # Lightweight, high-accuracy multilingual/English model running on ONNX
            _EMBED_MODEL = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
        except Exception as e:
            print(f"[NotebookEngine] Note: fastembed model fallback: {e}")
            _EMBED_MODEL = False
    return _EMBED_MODEL if _EMBED_MODEL is not False else None


class NotebookEngine:
    def __init__(self, base_storage_dir: Optional[Path] = None):
        if base_storage_dir:
            self.base_dir = Path(base_storage_dir)
        else:
            self.base_dir = Path.home() / ".nexushub" / "notebooks"
        
        try:
            self.base_dir.mkdir(parents=True, exist_ok=True)
        except Exception:
            self.base_dir = Path(__file__).resolve().parent.parent / ".nexushub" / "notebooks"
            self.base_dir.mkdir(parents=True, exist_ok=True)

        self.registry_file = self.base_dir / "notebooks.json"
        self._ensure_registry()

    def _ensure_registry(self):
        if not self.registry_file.exists():
            default_data = {
                "notebooks": [
                    {
                        "id": "nb_default_sample",
                        "title": "مستندات وأبحاث تجريبية (Sample Notebook)",
                        "description": "دفتر أبحاث أولي لتجربة البحث الدلالي والاستشهادات وتوليد الأسئلة والملخصات.",
                        "created_at": int(time.time()),
                        "updated_at": int(time.time()),
                        "sources": []
                    }
                ]
            }
            self.registry_file.write_text(json.dumps(default_data, indent=2, ensure_ascii=False), encoding="utf-8")

    def _read_registry(self) -> Dict[str, Any]:
        try:
            return json.loads(self.registry_file.read_text(encoding="utf-8"))
        except Exception:
            return {"notebooks": []}

    def _write_registry(self, data: Dict[str, Any]):
        self.registry_file.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    def _notebook_dir(self, notebook_id: str) -> Path:
        ndir = self.base_dir / notebook_id
        ndir.mkdir(parents=True, exist_ok=True)
        (ndir / "files").mkdir(exist_ok=True)
        return ndir

    def _index_file(self, notebook_id: str) -> Path:
        return self._notebook_dir(notebook_id) / "index.json"

    def _study_file(self, notebook_id: str) -> Path:
        return self._notebook_dir(notebook_id) / "study_guide.json"

    def get_source_content(self, notebook_id: str, source_id: str) -> Dict[str, Any]:
        nb = self.get_notebook(notebook_id)
        if not nb:
            raise ValueError(f"Notebook {notebook_id} not found")

        source = next((s for s in nb.get("sources", []) if s["id"] == source_id), None)
        if not source:
            raise ValueError(f"Source {source_id} not found")

        files_dir = self._notebook_dir(notebook_id) / "files"
        filename = source["name"]
        target_path = files_dir / f"{source_id}_{filename}"
        if not target_path.exists():
            target_path = files_dir / filename

        ext = source.get("file_type", "").lower()
        is_editable = ext in ["txt", "md", "py", "js", "ts", "json", "csv", "html", "css", "xml", "yaml", "yml", "sh", "bat", "sql"]

        content = ""
        if target_path.exists():
            if is_editable:
                try:
                    content = target_path.read_text(encoding="utf-8", errors="replace")
                except Exception as e:
                    content = f"[Error reading file: {e}]"
            elif ext == "pdf":
                pages = self._extract_text_from_pdf(target_path)
                content = "\n\n".join(f"=== [الصفحة {p['page']}] ===\n{p['text']}" for p in pages)
            elif ext in ["docx", "doc"]:
                pages = self._extract_text_from_docx(target_path)
                content = "\n\n".join(f"=== [الفقرة {p['page']}] ===\n{p['text']}" for p in pages)
            else:
                try:
                    content = target_path.read_text(encoding="utf-8", errors="replace")
                    is_editable = True
                except Exception:
                    content = f"[الملف بصيغة ثنائية {ext}، يمكن تحميله ومعاينته مباشرة]"

        return {
            "source_id": source_id,
            "name": filename,
            "file_type": ext,
            "content": content,
            "is_editable": is_editable,
            "size_human": source.get("size_human", "0 KB"),
            "download_url": f"/api/notebooks/{notebook_id}/files/{filename}"
        }

    def update_source_content(self, notebook_id: str, source_id: str, new_content: str) -> Dict[str, Any]:
        nb = self.get_notebook(notebook_id)
        if not nb:
            raise ValueError(f"Notebook {notebook_id} not found")

        source = next((s for s in nb.get("sources", []) if s["id"] == source_id), None)
        if not source:
            raise ValueError(f"Source {source_id} not found")

        files_dir = self._notebook_dir(notebook_id) / "files"
        filename = source["name"]
        target_path = files_dir / f"{source_id}_{filename}"
        if not target_path.exists():
            target_path = files_dir / filename

        # 1. Overwrite physical file
        target_path.write_text(new_content, encoding="utf-8")

        # 2. Re-chunk the text
        new_chunks = self._chunk_page_text(new_content, page=1, source_id=source_id, source_name=filename)

        # 3. Compute Embeddings if available
        embed_model = get_embed_model()
        if embed_model and new_chunks:
            try:
                texts = [c["text"] for c in new_chunks]
                embeddings_gen = embed_model.embed(texts)
                for c, emb in zip(new_chunks, embeddings_gen):
                    c["embedding"] = emb.tolist()
            except Exception as e:
                print(f"[Embedding Error on Update] {e}")

        # 4. Update index.json by replacing old chunks of this source
        idx_path = self._index_file(notebook_id)
        try:
            curr_index = json.loads(idx_path.read_text(encoding="utf-8")) if idx_path.exists() else {"chunks": []}
        except Exception:
            curr_index = {"chunks": []}

        filtered_chunks = [c for c in curr_index.get("chunks", []) if c.get("source_id") != source_id]
        filtered_chunks.extend(new_chunks)
        curr_index["chunks"] = filtered_chunks
        idx_path.write_text(json.dumps(curr_index, ensure_ascii=False), encoding="utf-8")

        # 5. Update Registry metadata
        reg = self._read_registry()
        size_bytes = len(new_content.encode("utf-8"))
        size_human = f"{size_bytes / 1024:.1f} KB" if size_bytes < 1024 * 1024 else f"{size_bytes / (1024 * 1024):.1f} MB"
        for item in reg["notebooks"]:
            if item["id"] == notebook_id:
                for s in item["sources"]:
                    if s["id"] == source_id:
                        s["chunk_count"] = len(new_chunks)
                        s["size_bytes"] = size_bytes
                        s["size_human"] = size_human
                        break
                item["updated_at"] = int(time.time())
                break
        self._write_registry(reg)

        return {
            "source_id": source_id,
            "name": filename,
            "size_human": size_human,
            "chunk_count": len(new_chunks),
            "status": "updated_and_indexed"
        }

    # =========================================================================
    # Notebook CRUD
    # =========================================================================
    def list_notebooks(self) -> List[Dict[str, Any]]:
        reg = self._read_registry()
        return reg.get("notebooks", [])

    def get_notebook(self, notebook_id: str) -> Optional[Dict[str, Any]]:
        for nb in self.list_notebooks():
            if nb["id"] == notebook_id:
                # Attach study guide if cached
                study_path = self._study_file(notebook_id)
                if study_path.exists():
                    try:
                        nb["study_guide"] = json.loads(study_path.read_text(encoding="utf-8"))
                    except Exception:
                        pass
                return nb
        return None

    def create_notebook(self, title: str, description: str = "") -> Dict[str, Any]:
        reg = self._read_registry()
        nb_id = f"nb_{uuid.uuid4().hex[:10]}"
        new_nb = {
            "id": nb_id,
            "title": title.strip() or "دفتر ملاحظات جديد",
            "description": description.strip(),
            "created_at": int(time.time()),
            "updated_at": int(time.time()),
            "sources": []
        }
        reg["notebooks"].insert(0, new_nb)
        self._write_registry(reg)
        self._notebook_dir(nb_id)
        # Initialize empty index
        self._index_file(nb_id).write_text(json.dumps({"chunks": []}, indent=2, ensure_ascii=False), encoding="utf-8")
        return new_nb

    def delete_notebook(self, notebook_id: str) -> bool:
        reg = self._read_registry()
        initial_len = len(reg["notebooks"])
        reg["notebooks"] = [nb for nb in reg["notebooks"] if nb["id"] != notebook_id]
        if len(reg["notebooks"]) < initial_len:
            self._write_registry(reg)
            ndir = self._notebook_dir(notebook_id)
            if ndir.exists():
                import shutil
                shutil.rmtree(ndir, ignore_errors=True)
            return True
        return False

    # =========================================================================
    # Document Ingestion & Chunking
    # =========================================================================
    def _extract_text_from_pdf(self, file_path: Path) -> List[Dict[str, Any]]:
        """Extracts text page by page with exact page numbers."""
        pages = []
        try:
            reader = pypdf.PdfReader(str(file_path))
            for idx, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                cleaned = " ".join(page_text.split())
                if cleaned:
                    pages.append({"page": idx + 1, "text": cleaned})
        except Exception as e:
            print(f"[PDF Extraction Error] {e}")
        return pages

    def _extract_text_from_docx(self, file_path: Path) -> List[Dict[str, Any]]:
        """Extracts text from DOCX (without heavy python-docx) via document.xml."""
        pages = []
        try:
            with zipfile.ZipFile(file_path, "r") as z:
                xml_content = z.read("word/document.xml")
                tree = ET.fromstring(xml_content)
                paragraphs = []
                for p in tree.iter():
                    if p.tag.endswith("}p"):
                        texts = [node.text for node in p.iter() if node.text and node.tag.endswith("}t")]
                        p_text = "".join(texts).strip()
                        if p_text:
                            paragraphs.append(p_text)
                
                full_text = "\n\n".join(paragraphs)
                # Chunk into pages of ~2500 chars (approx. 1 standard page)
                chunk_len = 2500
                total_pages = max(1, math.ceil(len(full_text) / chunk_len))
                for p_idx in range(total_pages):
                    segment = full_text[p_idx * chunk_len : (p_idx + 1) * chunk_len]
                    if segment.strip():
                        pages.append({"page": p_idx + 1, "text": segment.strip()})
        except Exception as e:
            print(f"[DOCX Extraction Error] {e}")
        return pages

    def _extract_text_from_plain(self, file_path: Path) -> List[Dict[str, Any]]:
        """Reads plain text, code files, CSV, JSON, markdown."""
        pages = []
        try:
            raw = file_path.read_text(encoding="utf-8", errors="replace")
            # Break into ~2000 character logical pages
            chunk_len = 2000
            total_pages = max(1, math.ceil(len(raw) / chunk_len))
            for p_idx in range(total_pages):
                segment = raw[p_idx * chunk_len : (p_idx + 1) * chunk_len]
                if segment.strip():
                    pages.append({"page": p_idx + 1, "text": segment.strip()})
        except Exception as e:
            print(f"[Plain text Extraction Error] {e}")
        return pages

    def _chunk_page_text(self, text: str, page: int, source_id: str, source_name: str, chunk_size: int = 700, overlap: int = 120) -> List[Dict[str, Any]]:
        """Recursive sliding-window character text splitter with overlap."""
        chunks = []
        text = text.strip()
        if not text:
            return chunks

        if len(text) <= chunk_size:
            chunk_id = f"{source_id}_p{page}_c0"
            chunks.append({
                "id": chunk_id,
                "source_id": source_id,
                "source_name": source_name,
                "page": page,
                "text": text,
            })
            return chunks

        start = 0
        c_idx = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))
            # Try to snap to sentence or whitespace boundaries
            if end < len(text):
                boundary = text.rfind(". ", start, end)
                if boundary == -1 or boundary < start + (chunk_size // 2):
                    boundary = text.rfind(" ", start, end)
                if boundary != -1 and boundary > start + (chunk_size // 3):
                    end = boundary + 1

            chunk_str = text[start:end].strip()
            if len(chunk_str) > 20:
                chunk_id = f"{source_id}_p{page}_c{c_idx}"
                chunks.append({
                    "id": chunk_id,
                    "source_id": source_id,
                    "source_name": source_name,
                    "page": page,
                    "text": chunk_str,
                })
                c_idx += 1

            start = end - overlap
            if start >= len(text) - overlap:
                break

        return chunks

    # =========================================================================
    # Add Source & Vector Indexing
    # =========================================================================
    def add_source_file(self, notebook_id: str, filename: str, file_bytes: bytes) -> Dict[str, Any]:
        nb = self.get_notebook(notebook_id)
        if not nb:
            raise ValueError(f"Notebook {notebook_id} not found")

        source_id = f"src_{uuid.uuid4().hex[:8]}"
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"

        # Save physical file
        dest_dir = self._notebook_dir(notebook_id) / "files"
        dest_path = dest_dir / f"{source_id}_{filename}"
        dest_path.write_bytes(file_bytes)

        # Extract text pages
        if ext == "pdf":
            pages = self._extract_text_from_pdf(dest_path)
        elif ext in ["docx", "doc"]:
            pages = self._extract_text_from_docx(dest_path)
        else:
            pages = self._extract_text_from_plain(dest_path)

        page_count = len(pages)
        if page_count == 0:
            # Fallback if empty or unreadable
            pages = [{"page": 1, "text": f"[Empty or binary content for {filename}]"}]
            page_count = 1

        # Generate chunks
        new_chunks = []
        for p in pages:
            c_list = self._chunk_page_text(p["text"], p["page"], source_id, filename)
            new_chunks.extend(c_list)

        # Compute FastEmbed embeddings if available
        embed_model = get_embed_model()
        if embed_model and new_chunks:
            try:
                texts = [c["text"] for c in new_chunks]
                embeddings_gen = embed_model.embed(texts)
                for c, emb in zip(new_chunks, embeddings_gen):
                    c["embedding"] = emb.tolist()
            except Exception as e:
                print(f"[Embedding Error] {e}")

        # Update index.json
        idx_path = self._index_file(notebook_id)
        try:
            curr_index = json.loads(idx_path.read_text(encoding="utf-8")) if idx_path.exists() else {"chunks": []}
        except Exception:
            curr_index = {"chunks": []}

        curr_index["chunks"].extend(new_chunks)
        idx_path.write_text(json.dumps(curr_index, ensure_ascii=False), encoding="utf-8")

        # Format Human Size
        size_bytes = len(file_bytes)
        if size_bytes < 1024 * 1024:
            size_human = f"{size_bytes / 1024:.1f} KB"
        else:
            size_human = f"{size_bytes / (1024 * 1024):.1f} MB"

        source_info = {
            "id": source_id,
            "name": filename,
            "file_type": ext,
            "size_bytes": size_bytes,
            "size_human": size_human,
            "page_count": page_count,
            "chunk_count": len(new_chunks),
            "created_at": int(time.time()),
            "status": "indexed"
        }

        # Update registry
        reg = self._read_registry()
        for item in reg["notebooks"]:
            if item["id"] == notebook_id:
                item["sources"].append(source_info)
                item["updated_at"] = int(time.time())
                break
        self._write_registry(reg)

        return source_info

    def delete_source(self, notebook_id: str, source_id: str) -> bool:
        reg = self._read_registry()
        removed = False
        for item in reg["notebooks"]:
            if item["id"] == notebook_id:
                initial_count = len(item["sources"])
                item["sources"] = [s for s in item["sources"] if s["id"] != source_id]
                if len(item["sources"]) < initial_count:
                    removed = True
                    item["updated_at"] = int(time.time())
                break

        if removed:
            self._write_registry(reg)
            # Remove chunks from index.json
            idx_path = self._index_file(notebook_id)
            if idx_path.exists():
                try:
                    curr_index = json.loads(idx_path.read_text(encoding="utf-8"))
                    curr_index["chunks"] = [c for c in curr_index.get("chunks", []) if c.get("source_id") != source_id]
                    idx_path.write_text(json.dumps(curr_index, ensure_ascii=False), encoding="utf-8")
                except Exception:
                    pass
            return True
        return False

    # =========================================================================
    # Hybrid Retrieval (Dense Vector Cosine + BM25/Keyword Token Matching)
    # =========================================================================
    def query_notebook(self, notebook_id: str, query_text: str, top_k: int = 6, source_ids: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        idx_path = self._index_file(notebook_id)
        if not idx_path.exists():
            return []

        try:
            curr_index = json.loads(idx_path.read_text(encoding="utf-8"))
        except Exception:
            return []

        all_chunks = curr_index.get("chunks", [])
        if source_ids:
            all_chunks = [c for c in all_chunks if c.get("source_id") in source_ids]

        if not all_chunks:
            return []

        q_clean = query_text.lower().strip()
        q_tokens = re.findall(r"\w+", q_clean)

        # 1. Vector Embedding Query (Dense Retrieval)
        embed_model = get_embed_model()
        q_vec = None
        if embed_model:
            try:
                q_vec = next(embed_model.embed([query_text])).tolist()
            except Exception as ex:
                print(f"[Query Embed Exception] {ex}")

        scored_chunks = []
        for c in all_chunks:
            c_text = c.get("text", "")
            c_text_lower = c_text.lower()

            # Keyword / Term Frequency score
            kw_hits = sum(1 for tok in q_tokens if tok in c_text_lower)
            kw_score = kw_hits / max(1, len(q_tokens))

            # Dense Vector Cosine Similarity
            vec_score = 0.0
            if q_vec and "embedding" in c and c["embedding"]:
                c_vec = c["embedding"]
                dot = sum(a * b for a, b in zip(q_vec, c_vec))
                norm_q = sum(a * a for a in q_vec) ** 0.5
                norm_c = sum(b * b for b in c_vec) ** 0.5
                if norm_q > 0 and norm_c > 0:
                    vec_score = max(0.0, dot / (norm_q * norm_c))

            # Hybrid Weighted Combined Score
            if q_vec:
                final_score = (0.7 * vec_score) + (0.3 * kw_score)
            else:
                final_score = kw_score

            scored_chunks.append({
                "id": c.get("id"),
                "source_id": c.get("source_id"),
                "source_name": c.get("source_name"),
                "page": c.get("page", 1),
                "text": c_text,
                "score": round(final_score, 4),
            })

        # Sort by highest score
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        return scored_chunks[:top_k]

    # =========================================================================
    # Study Guide & Auto-Generation Tools (Summary, Flashcards, Quiz, Concepts)
    # =========================================================================
    def build_grounded_context_prompt(self, query: str, chunks: List[Dict[str, Any]], web_results: Optional[List[Dict[str, str]]] = None) -> str:
        """Assembles strict source grounding instructions with page citations and optional web knowledge."""
        snippets = []
        for idx, c in enumerate(chunks, 1):
            snippets.append(
                f"--- [مقطع محلي {idx}] ---\n"
                f"المصدر: {c['source_name']}\n"
                f"الصفحة: {c['page']}\n"
                f"النص:\n{c['text']}\n"
            )

        context_block = "\n".join(snippets) if snippets else "لا توجد مقاطع محلية مباشرة."

        web_block = ""
        if web_results:
            web_items = []
            for w_idx, w in enumerate(web_results, 1):
                web_items.append(
                    f"--- [معلومة ويب {w_idx}] ---\n"
                    f"المصدر: {w.get('title', 'الإنترنت')}\n"
                    f"النص: {w.get('snippet', '')}\n"
                )
            web_block = (
                f"\n=== نتائج البحث الحي من الإنترنت والحلول الإضافية (Web Search Knowledge) ===\n"
                + "\n".join(web_items) + "\n"
            )

        prompt = (
            f"أنت معمار برمجيات ومحاضر تقني عبقري لنظام دفتر الملاحظات الذكي R3 NotebookLM Studio.\n"
            f"مهمتك ليست فقط إعطاء إجابة أو تلخيص، بل جعل الطالب والمستخدم يفهم الفكرة بعمق وبساطة وسلاسة فائقة.\n\n"
            f"سلسلة التفكير (CoT): قبل كتابة الشرح، فكّر أولاً في الترتيب الأسهل لفهم المبتدئ، ثم ابدأ في صياغة الإجابة خطوة بخطوة.\n\n"
            f"عند شرح أي مفهوم أو مسألة علمية، اتبع هذا التسلسل التدريسي:\n"
            f"1. الفكرة في جملة واحدة (The Core Idea): تعريف مباشر وبسيط جداً بدون تعقيد.\n"
            f"2. تشبيه واقعي (Real-world Analogy): اربط المفهوم بحاجة ملموسة من الحياة اليومية تثبت في الذهن.\n"
            f"3. لماذا نستخدمه؟ (The Why): ما هي المشكلة الحقيقية التي يحلها هذا المفهوم لو لم يكن موجوداً؟\n"
            f"4. مثال عملي مدعوم بالخطوات أو الكود (Minimal Working Example): شرح عملي ومُعلق عليه بدقة.\n"
            f"5. خطأ شائع يقع فيه الأغلبية (Common Pitfall): نصيحة عملية لتجنب الأخطاء عند التطبيق.\n\n"
            f"قواعد التوثيق والاستشهاد الصارم (Source Grounding):\n"
            f"- استشهد في كل فقرة بالصفحة والمصدر الذي استقيت المعلومة منه بدقة هكذا: `[المصدر: اسم_المصدر - ص رقم]`.\n"
            f"- عند استخدام معلومات الويب الخارجي، ضع: `[المصدر: ويكيبيديا / الويب - عنوان المصدر]`.\n"
            f"- كلما كان الشرح لمعمارية، مسار بيانات، أو خوارزمية، قم بتوليد مخطط تدفقي عبر كود Mermaid داخل الرد بصيغة: ```mermaid ... ```.\n\n"
            f"=== الفقرات المسترجعة الدقيقة من المستندات ===\n"
            f"{context_block}\n"
            f"{web_block}\n"
            f"=== سؤال / استفسار المستخدم ===\n"
            f"{query}\n"
        )
        return prompt

    def generate_offline_study_tools(self, notebook_id: str, tool_type: str = "all") -> Dict[str, Any]:
        """Offline-first rule-based extractor for study guide, flashcards, quiz and key concepts."""
        idx_path = self._index_file(notebook_id)
        if not idx_path.exists():
            return {}

        try:
            curr_index = json.loads(idx_path.read_text(encoding="utf-8"))
        except Exception:
            return {}

        chunks = curr_index.get("chunks", [])
        if not chunks:
            return {}

        # 1. Executive Summary
        sample_texts = [c["text"] for c in chunks[:12]]
        joined_sample = " ".join(sample_texts)
        sentences = [s.strip() for s in re.split(r"[.!?\n]+", joined_sample) if len(s.strip()) > 35]

        key_points = sentences[:6] if len(sentences) >= 6 else sentences
        summary_text = (
            f"يحتوي هذا الدفتر على {len(chunks)} مقطعاً دلالياً مفهرساً يغطي المستندات والمراجع المرفوعة. "
            f"تتمحور المحتويات الرئيسية حول المفاهيم والقواعد والبيانات العلمية الموثقة مع دعم الاستشهاد الدقيق بالصفحة والمقطع."
        )

        # 2. Key Concepts & Definitions
        key_concepts = []
        for c in chunks:
            text = c["text"]
            # Look for definition patterns like: X is Y, X refers to Y, يعرف X بأنه Y, عبارة عن
            matches = re.findall(r"([A-Z][a-zA-Z\s]{3,25}|[\u0600-\u06FF\s]{4,25})\s+(?:is|means|refers to|عبارة عن|هو|يعرف بـ|تعتبر)\s+([^.]{15,120})", text)
            for m in matches:
                term = m[0].strip()
                definition = m[1].strip()
                if len(term) > 3 and len(definition) > 10:
                    key_concepts.append({
                        "id": f"kc_{uuid.uuid4().hex[:6]}",
                        "term": term,
                        "definition": definition,
                        "source_name": c.get("source_name", ""),
                        "page": c.get("page", 1)
                    })
                if len(key_concepts) >= 8:
                    break
            if len(key_concepts) >= 8:
                break

        # Fallback concepts if regex is sparse
        if len(key_concepts) < 4:
            for i, c in enumerate(chunks[:5], 1):
                words = c["text"].split()[:5]
                phrase = " ".join(words)
                key_concepts.append({
                    "id": f"kc_{uuid.uuid4().hex[:6]}",
                    "term": f"المفهوم الرئيسي #{i}: {phrase}...",
                    "definition": c["text"][:140] + "...",
                    "source_name": c.get("source_name", ""),
                    "page": c.get("page", 1)
                })

        # 3. Flashcards
        flashcards = []
        for i, kc in enumerate(key_concepts[:8], 1):
            flashcards.append({
                "id": f"fc_{uuid.uuid4().hex[:6]}",
                "question": f"ما هو مفهوم '{kc['term']}' وما وظيفته أو تعريفه في المرجع؟",
                "answer": kc["definition"],
                "source_name": kc["source_name"],
                "page": kc["page"]
            })

        # 4. Practice Quiz (MCQs)
        quiz = []
        for i, fc in enumerate(flashcards[:5], 1):
            correct_ans = fc["answer"]
            fake_answers = [
                "معيار افتراضي لا ينطبق على السياق المذكور في هذا الفصل.",
                "أحد المتغيرات الثانوية التي لا تؤثر بشكل مباشر على النتيجة.",
                "طريقة بديلة لم تُثبت فعاليتها العملية في التجارب السريرية أو الحسابية."
            ]
            quiz.append({
                "id": f"qz_{uuid.uuid4().hex[:6]}",
                "question": fc["question"],
                "options": [
                    {"key": "A", "text": correct_ans},
                    {"key": "B", "text": fake_answers[0]},
                    {"key": "C", "text": fake_answers[1]},
                    {"key": "D", "text": fake_answers[2]},
                ],
                "correct_option": "A",
                "explanation": f"وفقاً للمرجع [{fc['source_name']} - ص {fc['page']}]: {correct_ans}",
                "source_name": fc["source_name"],
                "page": fc["page"]
            })

        study_data = {
            "summary": summary_text,
            "key_points": key_points,
            "flashcards": flashcards,
            "quiz": quiz,
            "key_concepts": key_concepts,
            "generated_at": int(time.time())
        }

        # Cache study guide
        self._study_file(notebook_id).write_text(json.dumps(study_data, indent=2, ensure_ascii=False), encoding="utf-8")
        return study_data
