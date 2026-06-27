#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sitemap.xml을 읽어 최근에 추가/수정된 페이지 URL을 구글 Indexing API에 제출합니다.
저장소 구조(빌드 방식)를 몰라도, 이미 만들어져 있는 sitemap.xml만 있으면 동작합니다.

환경변수:
  GCP_SA_KEY    : 구글 서비스 계정 JSON 키 전체 내용 (GitHub Secret으로 주입)
  SITEMAP_URL   : 사이트맵 주소 (기본값 아래 DEFAULT_SITEMAP)
  SUBMIT_MODE   : 'recent'(기본) = 최근 N일 내 변경분만 / 'all' = 사이트맵 전체
  RECENT_DAYS   : recent 모드에서 며칠 이내를 '최근'으로 볼지 (기본 3)
  MAX_URLS      : 한 번에 제출할 최대 URL 수 (기본 180, API 일일 한도 200 고려)
"""

import gzip
import io
import json
import os
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit, urlunsplit

import google.auth.transport.requests
from google.oauth2 import service_account

DEFAULT_SITEMAP = "https://www.kstoffice6885.com/sitemap.xml"
INDEXING_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish"
SCOPES = ["https://www.googleapis.com/auth/indexing"]
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

# 서치콘솔에 등록된 속성과 도메인을 일치시키기 위한 주소 정규화.
# 사이트맵이 www 없는 주소를 내보내지만, 인증된 속성/실제 서비스 도메인은 www 이므로
# 제출 전에 www 없는 호스트를 www 로 바꿔준다.
PREFERRED_HOST = "www.kstoffice6885.com"
ALT_HOSTS = {"kstoffice6885.com"}


def normalize_host(url: str) -> str:
    parts = urlsplit(url)
    if parts.netloc in ALT_HOSTS:
        parts = parts._replace(netloc=PREFERRED_HOST)
    return urlunsplit(parts)


def fetch_bytes(url: str) -> bytes:
    """URL 내용을 바이트로 가져온다. gzip 응답이면 자동 해제."""
    req = urllib.request.Request(url, headers={"User-Agent": "indexing-bot/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
    # gzip 매직 바이트(1f 8b)면 압축 해제
    if raw[:2] == b"\x1f\x8b":
        raw = gzip.decompress(raw)
    return raw


def parse_lastmod(text: str):
    """sitemap의 lastmod 문자열을 timezone-aware datetime으로 변환. 실패 시 None."""
    if not text:
        return None
    t = text.strip()
    # 날짜만 있는 경우(YYYY-MM-DD) 처리
    fmts = ["%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"]
    # 'Z'를 +00:00으로 정규화
    norm = t.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(norm)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        pass
    for f in fmts:
        try:
            dt = datetime.strptime(t, f)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None


def collect_urls(sitemap_url: str):
    """사이트맵(또는 사이트맵 인덱스)을 따라가며 (url, lastmod) 목록을 모은다."""
    results = []
    data = fetch_bytes(sitemap_url)
    root = ET.fromstring(data)
    tag = root.tag.split("}")[-1]

    if tag == "sitemapindex":
        for sm in root.findall("sm:sitemap", NS):
            loc = sm.findtext("sm:loc", default="", namespaces=NS).strip()
            if loc:
                results.extend(collect_urls(loc))
    else:  # urlset
        for u in root.findall("sm:url", NS):
            loc = u.findtext("sm:loc", default="", namespaces=NS).strip()
            lastmod = parse_lastmod(u.findtext("sm:lastmod", default="", namespaces=NS))
            if loc:
                results.append((normalize_host(loc), lastmod))
    return results


def get_credentials():
    key_json = os.environ.get("GCP_SA_KEY", "").strip()
    if not key_json:
        sys.exit("ERROR: GCP_SA_KEY 환경변수가 비어 있습니다. GitHub Secret을 확인하세요.")
    try:
        info = json.loads(key_json)
    except json.JSONDecodeError:
        sys.exit("ERROR: GCP_SA_KEY가 올바른 JSON이 아닙니다. 키 파일 전체 내용을 그대로 넣었는지 확인하세요.")
    creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    creds.refresh(google.auth.transport.requests.Request())
    return creds


def submit(url: str, token: str) -> tuple[bool, str]:
    body = json.dumps({"url": url, "type": "URL_UPDATED"}).encode("utf-8")
    req = urllib.request.Request(
        INDEXING_ENDPOINT,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return True, f"{resp.status}"
    except urllib.error.HTTPError as e:
        return False, f"{e.code} {e.read().decode('utf-8', 'ignore')[:300]}"
    except Exception as e:  # noqa: BLE001
        return False, str(e)


def main():
    sitemap_url = os.environ.get("SITEMAP_URL", DEFAULT_SITEMAP)
    mode = os.environ.get("SUBMIT_MODE", "recent").lower()
    recent_days = int(os.environ.get("RECENT_DAYS", "3"))
    max_urls = int(os.environ.get("MAX_URLS", "180"))

    print(f"[info] sitemap = {sitemap_url}")
    print(f"[info] mode = {mode}, recent_days = {recent_days}, max_urls = {max_urls}")

    all_urls = collect_urls(sitemap_url)
    print(f"[info] 사이트맵에서 {len(all_urls)}개 URL 발견")

    if mode == "all":
        targets = [u for u, _ in all_urls]
    else:
        cutoff = datetime.now(timezone.utc) - timedelta(days=recent_days)
        targets = [u for u, lm in all_urls if lm is not None and lm >= cutoff]
        # lastmod가 전혀 없는 사이트맵이면 recent 모드로는 아무것도 못 고르므로 경고
        if not targets and all(lm is None for _, lm in all_urls):
            print("[warn] 사이트맵에 lastmod가 없어 '최근 변경분'을 판별할 수 없습니다.")
            print("[warn] 워크플로를 수동 실행할 때 mode=all 로 한 번 제출하거나, 사이트맵에 lastmod를 추가하세요.")

    targets = targets[:max_urls]
    print(f"[info] 제출 대상 {len(targets)}개")
    if not targets:
        print("[done] 제출할 새 URL이 없습니다. 정상 종료.")
        return

    token = get_credentials().token
    ok, fail = 0, 0
    for u in targets:
        success, msg = submit(u, token)
        if success:
            ok += 1
            print(f"  [OK]  {u}")
        else:
            fail += 1
            print(f"  [FAIL] {u} -> {msg}")

    print(f"[done] 성공 {ok}, 실패 {fail}")
    if fail and ok == 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
