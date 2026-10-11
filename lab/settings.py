from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / ".runtime"
RUNTIME.mkdir(exist_ok=True)
API_PORT = 19430
CONTROL_PORT = 19030
PROXY_CONTROL_PORT = 18477
PG_PORT = 55432
LANES = {"baseline": 19431, "reliable": 19432}
DB = f"postgresql://tc01@127.0.0.1:{PG_PORT}/postgres"
