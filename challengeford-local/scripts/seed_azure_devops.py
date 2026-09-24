#!/usr/bin/env python3
"""Seed Azure DevOps project AutoSight from backlog-import.csv (REST API, no az CLI)."""
from __future__ import annotations

import base64
import csv
import json
import os
import sys
import time
import urllib.error
import urllib.request
from urllib.parse import quote
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env.local"
CSV_PATH = ROOT / "pitch-entrega" / "azure-devops" / "backlog-import.csv"
MANUAL_MD = ROOT / "pitch-entrega" / "12_acoes_manuais_azure_apk.md"


def load_env() -> None:
    if not ENV_FILE.exists():
        sys.exit(f"Missing {ENV_FILE}")
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


def auth_header(pat: str) -> str:
    token = base64.b64encode(f":{pat}".encode()).decode()
    return f"Basic {token}"


class Ado:
    def __init__(self, org: str, pat: str, project: str):
        self.org = org
        self.project = project
        self.pat = pat
        self.base = f"https://dev.azure.com/{org}"
        self.vssps = f"https://vssps.dev.azure.com/{org}"
        self.vsaex = f"https://vsaex.dev.azure.com/{org}"

    def _req(self, method: str, url: str, body: dict | list | None = None, api: str = "7.1"):
        sep = "&" if "?" in url else "?"
        full = f"{url}{sep}api-version={api}" if "api-version=" not in url else url
        data = None
        headers = {
            "Authorization": auth_header(self.pat),
            "Content-Type": "application/json",
        }
        if body is not None:
            data = json.dumps(body).encode()
        req = urllib.request.Request(full, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                raw = resp.read().decode()
                return resp.status, json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            err = e.read().decode()
            print(f"HTTP {e.code} {method} {full}\n{err[:800]}", file=sys.stderr)
            raise

    def list_projects(self):
        _, data = self._req("GET", f"{self.base}/_apis/projects")
        return {p["name"]: p for p in data.get("value", [])}

    def create_project(self):
        projects = self.list_projects()
        if self.project in projects:
            print(f"Project exists: {self.project}")
            return projects[self.project]
        body = {
            "name": self.project,
            "description": "AutoSight Ford Challenge — Sprint 3 backlog",
            "visibility": 0,
            "capabilities": {
                "versioncontrol": {"sourceControlType": "Git"},
                "processTemplate": {
                    # Scrum process template id (well-known)
                    "templateTypeId": "6b724908-ef14-45cf-84f8-768b5384da45"
                },
            },
        }
        status, data = self._req("POST", f"{self.base}/_apis/projects", body)
        print(f"Create project queued: {status} {data}")
        # wait until available
        for _ in range(30):
            time.sleep(3)
            projects = self.list_projects()
            if self.project in projects:
                print("Project ready")
                return projects[self.project]
        sys.exit("Timeout waiting for project creation")

    def ensure_iterations(self):
        _, root = self._req(
            "GET",
            f"{self.base}/{self.project}/_apis/wit/classificationnodes/Iterations?$depth=2",
        )
        existing = {c["name"] for c in root.get("children", [])}
        for name in ["Sprint 1", "Sprint 2", "Sprint 3", "Sprint 4"]:
            if name in existing:
                print(f"Iteration exists: {name}")
                continue
            body = {"name": name, "structureType": "iteration"}
            try:
                self._req(
                    "POST",
                    f"{self.base}/{self.project}/_apis/wit/classificationnodes/Iterations",
                    body,
                )
                print(f"Created iteration: {name}")
            except urllib.error.HTTPError as e:
                if e.code == 409:
                    print(f"Iteration already present (409): {name}")
                else:
                    raise

    def create_work_item(self, wit: str, fields: dict) -> int:
        ops = [{"op": "add", "path": f"/fields/{k}", "value": v} for k, v in fields.items() if v not in (None, "")]
        headers_patch = {
            "Authorization": auth_header(self.pat),
            "Content-Type": "application/json-patch+json",
        }
        url = f"{self.base}/{self.project}/_apis/wit/workitems/${quote(wit)}?api-version=7.1"
        data = json.dumps(ops).encode()
        req = urllib.request.Request(url, data=data, headers=headers_patch, method="POST")
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read().decode())
        return int(payload["id"])

    def link_parent(self, child_id: int, parent_id: int):
        ops = [
            {
                "op": "add",
                "path": "/relations/-",
                "value": {
                    "rel": "System.LinkTypes.Hierarchy-Reverse",
                    "url": f"{self.base}/_apis/wit/workItems/{parent_id}",
                },
            }
        ]
        headers_patch = {
            "Authorization": auth_header(self.pat),
            "Content-Type": "application/json-patch+json",
        }
        url = f"{self.base}/{self.project}/_apis/wit/workitems/{child_id}?api-version=7.1"
        data = json.dumps(ops).encode()
        req = urllib.request.Request(url, data=data, headers=headers_patch, method="PATCH")
        with urllib.request.urlopen(req, timeout=60) as resp:
            resp.read()

    def invite_user(self, email: str):
        # Member entitlement — best effort
        body = {
            "accessLevel": {"accountLicenseType": "express", "licensingSource": "account"},
            "user": {"principalName": email, "subjectKind": "user"},
            "projectEntitlements": [
                {
                    "group": {"groupType": "projectAdministrator"},
                    "projectRef": {"id": self.list_projects()[self.project]["id"]},
                }
            ],
        }
        try:
            status, data = self._req(
                "POST",
                f"{self.vsaex}/_apis/userentitlements",
                body,
                api="7.1-preview.3",
            )
            print(f"Invite status={status} result={json.dumps(data)[:400]}")
        except Exception as e:
            print(f"WARN invite failed (may need UI): {e}", file=sys.stderr)


def map_type(csv_type: str) -> str:
    t = csv_type.strip().lower()
    if t == "epic":
        return "Epic"
    if t == "feature":
        return "Feature"
    if t in ("product backlog item", "pbi"):
        return "Product Backlog Item"
    if t == "task":
        return "Task"
    return csv_type


def main() -> None:
    load_env()
    org = os.environ["ADO_ORG"]
    project = os.environ.get("ADO_PROJECT", "AutoSight")
    pat = os.environ["ADO_PAT"]
    professor = os.environ.get("PROFESSOR_EMAIL", "")

    ado = Ado(org, pat, project)
    ado.create_project()
    ado.ensure_iterations()

    title_to_id: dict[str, int] = {}
    rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8")))
    # Pass 1: create without parents
    for row in rows:
        wit = map_type(row["Work Item Type"])
        title = row["Title"].strip()
        if title in title_to_id:
            continue
        iteration = row.get("Iteration Path") or "Sprint 3"
        fields = {
            "System.Title": title,
            "System.Description": row.get("Description") or "",
            "Microsoft.VSTS.Common.AcceptanceCriteria": row.get("Acceptance Criteria") or "",
            "System.IterationPath": f"{project}\\{iteration}",
            "System.Tags": (row.get("Tags") or "").replace(";", ", "),
        }
        pri = (row.get("Priority") or "").strip()
        if pri.isdigit():
            fields["Microsoft.VSTS.Common.Priority"] = int(pri)
        pts = (row.get("Story Points") or "").strip()
        if pts:
            try:
                fields["Microsoft.VSTS.Scheduling.StoryPoints"] = float(pts)
            except ValueError:
                pass
        wid = ado.create_work_item(wit, fields)
        title_to_id[title] = wid
        print(f"Created {wit} #{wid}: {title}")
        time.sleep(0.15)

    # Pass 2: parent links via Parent Epic / Title of parent in Parent Epic column
    # CSV uses Parent Epic column for parent title of Features/PBIs/Tasks
    for row in rows:
        title = row["Title"].strip()
        parent_title = (row.get("Parent Epic") or "").strip()
        if not parent_title or parent_title not in title_to_id:
            continue
        child_id = title_to_id[title]
        parent_id = title_to_id[parent_title]
        try:
            ado.link_parent(child_id, parent_id)
            print(f"Linked #{child_id} -> parent #{parent_id} ({parent_title})")
        except Exception as e:
            print(f"WARN link {title}: {e}", file=sys.stderr)
        time.sleep(0.1)

    if professor:
        ado.invite_user(professor)

    boards = f"https://dev.azure.com/{org}/{project}/_backlogs"
    org_url = f"https://dev.azure.com/{org}"
    text = MANUAL_MD.read_text(encoding="utf-8") if MANUAL_MD.exists() else ""
    block = f"""# Ação manual restante — Azure DevOps + APK

## Azure DevOps (obrigatório para nota QA)

ORG: {org_url}
PROJETO: {project}
BOARDS: {boards}

Professor convidado (API): {professor or '(não definido)'}

Backlog seeded via `scripts/seed_azure_devops.py` from `backlog-import.csv`.

## APK EAS (obrigatório para nota Mobile)

1. `cd mobile && EXPO_TOKEN=... npm run build:apk`
2. Baixar APK do dashboard Expo → anexar no Teams
3. (Opcional) copiar para `mobile/dist/autosight-preview.apk`
"""
    MANUAL_MD.write_text(block, encoding="utf-8")
    print("Updated", MANUAL_MD)
    print("DONE", boards)


if __name__ == "__main__":
    main()
