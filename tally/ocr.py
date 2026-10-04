"""OCR for scanned PDFs.

Companies House file copies are often fax images with no embedded text.
Pages that already contain text are left alone. Image pages are rendered
and read with the macOS Vision recognizer. Results are cached by file hash.
"""
import hashlib
import shutil
import subprocess
import tempfile
from pathlib import Path

import pymupdf

from tally.config import DATA

SOURCE = Path(__file__).with_name("ocr_vision.swift")
BINARY = DATA / "ocr_cache" / "ocr_vision"
MIN_TEXT = 40


def _file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _recognizer() -> Path | None:
    if BINARY.exists() and BINARY.stat().st_mtime >= SOURCE.stat().st_mtime:
        return BINARY
    if not shutil.which("swiftc"):
        return None
    BINARY.parent.mkdir(parents=True, exist_ok=True)
    compiled = subprocess.run(
        ["swiftc", "-O", str(SOURCE), "-o", str(BINARY)],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if compiled.returncode != 0 or not BINARY.exists():
        return None
    return BINARY


def _recognize(png: Path, recognizer: Path) -> str:
    result = subprocess.run(
        [str(recognizer), str(png)],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if result.returncode != 0:
        return ""
    return result.stdout.strip()


def ocr_pdf(path: Path, page_indexes: list[int]) -> dict[int, str]:
    """Read the given zero-based pages. Missing recognizer returns blanks."""
    recognizer = _recognizer()
    if recognizer is None or not page_indexes:
        return {index: "" for index in page_indexes}
    found: dict[int, str] = {}
    document = pymupdf.open(path)
    try:
        with tempfile.TemporaryDirectory() as folder:
            for index in page_indexes:
                if index < 0 or index >= document.page_count:
                    found[index] = ""
                    continue
                image = Path(folder) / f"page-{index}.png"
                page = document[index]
                scale = 2.0
                for image_info in page.get_images():
                    width = image_info[2] or 0
                    height = image_info[3] or 0
                    if width and height and page.rect.width and page.rect.height:
                        scale = max(scale, width / page.rect.width, height / page.rect.height)
                scale = min(scale, 4.0)
                pixmap = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
                pixmap.save(image)
                found[index] = _recognize(image, recognizer)
    finally:
        document.close()
    return found


def read_pages(path: Path, embedded: list[str]) -> str:
    """Use embedded text where it exists, and OCR the pages that have none."""
    path = Path(path)
    cache_dir = DATA / "ocr_cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache = cache_dir / f"{_file_hash(path)}.txt"
    if cache.exists() and cache.stat().st_size > 0:
        return cache.read_text(encoding="utf-8")

    thin = [index for index, text in enumerate(embedded) if len((text or "").strip()) < MIN_TEXT]
    recognized = ocr_pdf(path, thin) if thin else {}
    pages = []
    for index, text in enumerate(embedded):
        if index in recognized and len(recognized[index].strip()) >= len((text or "").strip()):
            pages.append(recognized[index])
        else:
            pages.append(text or "")
    combined = "\n\n".join(page.strip() for page in pages if page and page.strip()).strip()
    if combined:
        cache.write_text(combined, encoding="utf-8")
    return combined
