import asyncio
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import WebSocket


class OperationHub:
    def __init__(self):
        self._connections: dict[int, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, estabelecimento_id: int, websocket: WebSocket):
        async with self._lock:
            self._connections[estabelecimento_id].add(websocket)

    async def disconnect(self, estabelecimento_id: int, websocket: WebSocket):
        async with self._lock:
            connections = self._connections.get(estabelecimento_id)
            if not connections:
                return
            connections.discard(websocket)
            if not connections:
                self._connections.pop(estabelecimento_id, None)

    async def publish(self, estabelecimento_id: int, event: str, pedido_id: int | None = None):
        payload = {
            "tipo": event,
            "pedido_id": pedido_id,
            "enviado_em": datetime.now(timezone.utc).isoformat(),
        }
        async with self._lock:
            targets = list(self._connections.get(estabelecimento_id, ()))
        stale = []
        for websocket in targets:
            try:
                await websocket.send_json(payload)
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            await self.disconnect(estabelecimento_id, websocket)


operation_hub = OperationHub()
