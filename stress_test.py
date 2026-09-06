import concurrent.futures
import time
import requests

URL = "https://registro-bug.onrender.com/produtos"

def fetch(url):
    try:
        start = time.time()
        res = requests.get(url, timeout=10)
        return (res.status_code, time.time() - start)
    except Exception as e:
        return (str(e), 0)

print("Starting stress test with 100 concurrent requests...")
start_time = time.time()
with concurrent.futures.ThreadPoolExecutor(max_workers=100) as executor:
    results = list(executor.map(fetch, [URL] * 100))

total_time = time.time() - start_time
successes = [r for r in results if r[0] == 200]
failures = [r for r in results if r[0] != 200]

print(f"\n--- Resultados ---")
print(f"Tempo total: {total_time:.2f}s")
print(f"Sucessos (HTTP 200): {len(successes)}")
print(f"Falhas: {len(failures)}")
if successes:
    avg_time = sum(r[1] for r in successes) / len(successes)
    max_time = max(r[1] for r in successes)
    min_time = min(r[1] for r in successes)
    print(f"Tempo médio de resposta: {avg_time:.2f}s")
    print(f"Resposta mais lenta: {max_time:.2f}s")
    print(f"Resposta mais rápida: {min_time:.2f}s")
if failures:
    print(f"Exemplo de erro: {failures[0][0]}")
