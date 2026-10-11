"""Start owned portable tools on loopback only; never touch an installed PG service."""

import datetime
import ipaddress
import json
import os
import socket
import subprocess
import sys

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

from lab.settings import API_PORT, CONTROL_PORT, LANES, PG_PORT, PROXY_CONTROL_PORT, ROOT, RUNTIME

PG = ROOT / ".tools/postgresql/pgsql/bin"


def check_port(port):
    with socket.socket() as connection:
        try:
            connection.bind(("127.0.0.1", port))
        except OSError as error:
            raise RuntimeError(f"Port {port} is in use; do not stop unrelated processes") from error


def certificates():
    if (RUNTIME / "server.pem").exists():
        return
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "TC01 local synthetic lab")])
    now = datetime.datetime.now(datetime.UTC)
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
            .serial_number(x509.random_serial_number()).not_valid_before(now - datetime.timedelta(minutes=5))
            .not_valid_after(now + datetime.timedelta(days=30))
            .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
            .add_extension(x509.SubjectAlternativeName([
                x509.DNSName("localhost"), x509.IPAddress(ipaddress.ip_address("127.0.0.1")),
            ]), critical=False).sign(key, hashes.SHA256()))
    (RUNTIME / "server.pem").write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    (RUNTIME / "server.key").write_bytes(key.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption(),
    ))


def start():
    owned_pg = subprocess.run([str(PG / "pg_ctl.exe"), "-D", str(RUNTIME / "pgdata"), "status"],
                              capture_output=True, check=False).returncode == 0
    for port in ([PG_PORT] if not owned_pg else []) + [API_PORT, CONTROL_PORT, PROXY_CONTROL_PORT, *LANES.values()]:
        check_port(port)
    certificates()
    data = RUNTIME / "pgdata"
    if not (data / "PG_VERSION").exists():
        subprocess.run([str(PG / "initdb.exe"), "-D", str(data), "-U", "tc01", "-A", "trust",
                        "--encoding=UTF8", "--locale=C"], check=True, capture_output=True)
    if not owned_pg:
        # PG descendants may inherit stdout on Windows. Use a file, not a pipe
        # whose EOF would wait for the long-lived server to exit.
        with (RUNTIME / "pg-launch.log").open("a", encoding="utf-8") as pg_log:
            subprocess.run([str(PG / "pg_ctl.exe"), "-D", str(data), "-l", str(RUNTIME / "pg.log"),
                            "-o", f"-h 127.0.0.1 -p {PG_PORT}", "-w", "start"],
                           check=True, stdout=pg_log, stderr=pg_log, timeout=45)
    env = {**os.environ, "PYTHONPATH": str(ROOT / "src") + os.pathsep + str(ROOT), "PYTHONUTF8": "1"}
    processes = []
    commands = [
        [str(ROOT / ".tools/toxiproxy-server.exe"), "-host", "127.0.0.1", "-port", str(PROXY_CONTROL_PORT)],
        [sys.executable, "-m", "uvicorn", "lab.api:app", "--host", "127.0.0.1", "--port", str(API_PORT),
         "--ssl-certfile", str(RUNTIME / "server.pem"), "--ssl-keyfile", str(RUNTIME / "server.key")],
        [sys.executable, "-m", "uvicorn", "lab.controller:app", "--host", "127.0.0.1", "--port", str(CONTROL_PORT)],
    ]
    for name, command in zip(["proxy", "api", "controller"], commands, strict=True):
        log = (RUNTIME / f"{name}.log").open("a", encoding="utf-8")
        process = subprocess.Popen(command, cwd=ROOT, env=env, stdout=log, stderr=log,
                                   creationflags=subprocess.CREATE_NO_WINDOW)
        processes.append({"name": name, "pid": process.pid, "command": command})
    (RUNTIME / "processes.json").write_text(json.dumps(processes, indent=2), encoding="utf-8")
    print(f"TC01 controller: http://127.0.0.1:{CONTROL_PORT}")
    print("Private portable PostgreSQL; no existing service or database changed.")


def stop():
    subprocess.run(["powershell.exe", "-NoProfile", "-File", str(ROOT / "scripts/stop.ps1")], check=True)


if __name__ == "__main__":
    stop() if "--stop" in sys.argv else start()
