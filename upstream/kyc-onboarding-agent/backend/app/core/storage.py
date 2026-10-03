"""
JSON-based file storage utilities.
Simple file-based storage using JSON files.
"""
import json
import os
from typing import List, Dict, Any, Optional
from pathlib import Path
import asyncio
from datetime import datetime


class JSONStorage:
    """Simple JSON file storage manager."""

    def __init__(self, data_dir: str = "./data"):
        """Initialize storage with data directory."""
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self._lock = asyncio.Lock()

    def _get_file_path(self, collection: str) -> Path:
        """Get path to JSON file for a collection."""
        return self.data_dir / f"{collection}.json"

    async def _read_file(self, collection: str) -> List[Dict[str, Any]]:
        """Read data from JSON file."""
        file_path = self._get_file_path(collection)
        if not file_path.exists():
            return []

        async with self._lock:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return data if isinstance(data, list) else []
            except (json.JSONDecodeError, IOError):
                return []

    async def _write_file(self, collection: str, data: List[Dict[str, Any]]) -> None:
        """Write data to JSON file."""
        file_path = self._get_file_path(collection)

        async with self._lock:
            # Create backup
            if file_path.exists():
                backup_path = file_path.with_suffix('.json.bak')
                file_path.replace(backup_path)

            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, default=str, ensure_ascii=False)
            except IOError as e:
                # Restore backup if write failed
                backup_path = file_path.with_suffix('.json.bak')
                if backup_path.exists():
                    backup_path.replace(file_path)
                raise e

    async def get_all(self, collection: str) -> List[Dict[str, Any]]:
        """Get all items from a collection."""
        return await self._read_file(collection)

    async def get_by_id(self, collection: str, item_id: str) -> Optional[Dict[str, Any]]:
        """Get a single item by ID."""
        items = await self._read_file(collection)
        for item in items:
            if item.get('id') == item_id:
                return item
        return None

    async def create(self, collection: str, item: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new item in collection."""
        items = await self._read_file(collection)

        # Add timestamps
        now = datetime.utcnow().isoformat()
        item['created_at'] = item.get('created_at', now)
        item['updated_at'] = now

        items.append(item)
        await self._write_file(collection, items)
        return item

    async def update(
        self,
        collection: str,
        item_id: str,
        updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update an existing item."""
        items = await self._read_file(collection)

        for i, item in enumerate(items):
            if item.get('id') == item_id:
                # Update fields
                item.update(updates)
                item['updated_at'] = datetime.utcnow().isoformat()
                items[i] = item
                await self._write_file(collection, items)
                return item

        return None

    async def delete(self, collection: str, item_id: str) -> bool:
        """Delete an item from collection."""
        items = await self._read_file(collection)
        initial_count = len(items)

        items = [item for item in items if item.get('id') != item_id]

        if len(items) < initial_count:
            await self._write_file(collection, items)
            return True

        return False

    async def filter(
        self,
        collection: str,
        filters: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Filter items by criteria."""
        items = await self._read_file(collection)
        results = []

        for item in items:
            match = True
            for key, value in filters.items():
                if key not in item or item[key] != value:
                    match = False
                    break
            if match:
                results.append(item)

        return results

    async def count(self, collection: str, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count items in collection."""
        if filters:
            items = await self.filter(collection, filters)
            return len(items)
        else:
            items = await self._read_file(collection)
            return len(items)

    async def initialize_collection(
        self,
        collection: str,
        initial_data: Optional[List[Dict[str, Any]]] = None
    ) -> None:
        """Initialize a collection with optional initial data."""
        file_path = self._get_file_path(collection)
        if not file_path.exists() and initial_data:
            await self._write_file(collection, initial_data)


# Global storage instance
storage = JSONStorage()
