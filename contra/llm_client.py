"""
CONTRA LLM client — minimal OpenAI-compatible chat over the OpenCode Zen gateway.

Reads the OpenCode key from ~/.local/share/opencode/auth.json by default (no secret
in the repo). The gateway is Cloudflare-protected and rejects unknown clients, so the
opencode User-Agent is mandatory.

Env overrides (so this works with any OpenAI-compatible provider, not just OpenCode):
  CONTRA_LLM_BASE_URL   default https://opencode.ai/zen/v1
  CONTRA_LLM_MODEL      default deepseek-v4-flash-free
  CONTRA_LLM_KEY        overrides the key from auth.json
  CONTRA_LLM_UA         default opencode/1.15.12
"""

from __future__ import annotations

import json
import os
import re
import urllib.request
import urllib.error
from pathlib import Path

_AUTH = Path.home() / ".local/share/opencode/auth.json"
_THINK = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)


def _load_key() -> str:
    if os.environ.get("CONTRA_LLM_KEY"):
        return os.environ["CONTRA_LLM_KEY"]
    try:
        data = json.loads(_AUTH.read_text(encoding="utf-8"))
        for prov in ("opencode-go", "opencode"):
            if prov in data and data[prov].get("key"):
                return data[prov]["key"]
    except (OSError, json.JSONDecodeError, KeyError):
        pass
    raise RuntimeError("no LLM key — set CONTRA_LLM_KEY or log in with `opencode auth`")


class LLMClient:
    def __init__(self, model: str | None = None, base_url: str | None = None):
        self.base_url = (base_url or os.environ.get("CONTRA_LLM_BASE_URL")
                         or "https://opencode.ai/zen/v1").rstrip("/")
        self.model = model or os.environ.get("CONTRA_LLM_MODEL") or "deepseek-v4-flash-free"
        self.ua = os.environ.get("CONTRA_LLM_UA") or "opencode/1.15.12"
        self.key = _load_key()
        self.calls = 0
        self.tokens = 0

    def chat(self, system: str, user: str, max_tokens: int = 800,
             temperature: float = 0.2) -> str:
        body = json.dumps({
            "model": self.model,
            "messages": [{"role": "system", "content": system},
                         {"role": "user", "content": user}],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }).encode()
        req = urllib.request.Request(
            f"{self.base_url}/chat/completions", data=body,
            headers={"Authorization": f"Bearer {self.key}",
                     "Content-Type": "application/json", "User-Agent": self.ua})
        with urllib.request.urlopen(req, timeout=90) as r:
            d = json.load(r)
        self.calls += 1
        usage = d.get("usage") or {}
        self.tokens += int(usage.get("total_tokens", 0))
        return d["choices"][0]["message"]["content"] or ""

    @staticmethod
    def extract_json(text: str) -> dict:
        """Pull the first JSON object from a model reply, ignoring <think> and prose."""
        text = _THINK.sub("", text)
        # fenced ```json blocks first
        fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if fenced:
            try:
                return json.loads(fenced.group(1))
            except json.JSONDecodeError:
                pass
        # otherwise first balanced {...}
        start = text.find("{")
        while start != -1:
            depth = 0
            for i in range(start, len(text)):
                if text[i] == "{":
                    depth += 1
                elif text[i] == "}":
                    depth -= 1
                    if depth == 0:
                        try:
                            return json.loads(text[start:i + 1])
                        except json.JSONDecodeError:
                            break
            start = text.find("{", start + 1)
        return {}
