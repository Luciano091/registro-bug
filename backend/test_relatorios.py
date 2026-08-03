import sys
import os
import datetime

import main

# Mock SQLAlchemy so we don't connect to DB
class MockItem:
    def __init__(self):
        self.quantidade = 1
        self.valor_unitario = 10.0
        
    @property
    def produto(self):
        class P:
            nome = "Burger"
        return P()

class MockPedido:
    def __init__(self, dt):
        self.total = 100.0
        self.data = dt
        self.forma_pagamento = "Pix"
        self.itens = [MockItem()]

class MockQuery:
    def filter(self, *args): return self
    def all(self):
        hoje = (datetime.datetime.utcnow() - datetime.timedelta(hours=3))
        return [MockPedido(hoje)]

class MockDB:
    def query(self, *args): return MockQuery()

# Do not run create_all
main.models.Base.metadata.create_all = lambda bind: None

try:
    res = main.get_dashboard_relatorios(periodo="mes", db=MockDB())
    print("SUCCESS: no error")
    import json
    print(res)
except Exception as e:
    import traceback
    traceback.print_exc()
