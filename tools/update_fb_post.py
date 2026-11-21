#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""تحديث fb-post.json من آخر منشور على صفحة المركز على فيسبوك.

يُشغَّل يومياً بواسطة GitHub Action (.github/workflows/update-fb-post.yml).
يقرأ منشورات الصفحة عبر Facebook Graph API باستخدام:
  FB_PAGE_ID    : اسم الصفحة أو رقمها (مثل Markz.shabab.elahmadya)
  FB_PAGE_TOKEN : Page Access Token طويل الأمد (GitHub Secrets — لا يُكشف للزوار)

يختار آخر منشور به نص أو صورة ويكتب fb-post.json في جذر الموقع،
ويُعرض المنشور في قسم «آخر منشورات فيسبوك» تحت الإحصائيات المالية.

ملاحظة: الإحصائيات المالية لا علاقة لها بهذا الملف — تُدخل يدوياً من لوحة التحكم.
إن لم يُعثر على منشور جديد يُترك fb-post.json كما هو (لا فشل في الـ Action).
"""
import json
import os
import sys
import urllib.request
import urllib.parse
from datetime import datetime, timezone

GRAPH_VERSION = "v21.0"
POSTS_LIMIT = 10


def norm_txt(s):
    s = (s or "").replace("\u200e", "").replace("\u200f", "")
    return s.strip()


def fetch_latest_post(page_id, token):
    fields = "id,message,full_picture,permalink_url,created_time"
    url = ("https://graph.facebook.com/" + GRAPH_VERSION + "/" + urllib.parse.quote(str(page_id))
           + "/posts?fields=" + urllib.parse.quote(fields)
           + "&limit=" + str(POSTS_LIMIT)
           + "&access_token=" + urllib.parse.quote(token))
    req = urllib.request.Request(url, headers={"User-Agent": "ahmadiah-fb-post-bot/1.0"})
    with urllib.request.urlopen(req, timeout=30) as res:
        data = json.loads(res.read().decode("utf-8"))
    if "error" in data:
        raise RuntimeError(data["error"].get("message", "Graph API error"))
    # آخر منشور به نص أو صورة (نتجاهل المنشورات الفارغة)
    for p in data.get("data", []):
        if norm_txt(p.get("message")) or p.get("full_picture"):
            return p
    return None


def main():
    page_id = os.environ.get("FB_PAGE_ID", "")
    token = os.environ.get("FB_PAGE_TOKEN", "")
    out_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "fb-post.json")

    if not page_id or not token:
        print("⚠️ لم تُضبط FB_PAGE_ID / FB_PAGE_TOKEN — تخطي التحديث (الملف يبقى كما هو)")
        return 0

    try:
        post = fetch_latest_post(page_id, token)
    except Exception as e:
        print("⚠️ فشل الاتصال بـ Graph API:", e)
        return 0  # لا نفشل سير العمل — الموقع يعرض آخر منشور محفوظ

    if not post:
        print("لا توجد منشورات قابلة للعرض — لا تغييرات")
        return 0

    existing = None
    if os.path.exists(out_path):
        try:
            with open(out_path, encoding="utf-8") as f:
                existing = json.load(f)
        except Exception:
            existing = None

    # لا تحديث إن كان آخر منشور هو نفسه المُخزَّن
    if existing and existing.get("id") == post.get("id"):
        print("آخر منشور هو نفسه المُخزَّن — لا تغييرات")
        return 0

    payload = {
        "id": post.get("id", ""),
        "message": norm_txt(post.get("message")),
        "picture": post.get("full_picture", ""),
        "url": post.get("permalink_url", ""),
        "created": post.get("created_time", ""),
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "source": {"type": "facebook", "page": page_id}
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print("✅ fb-post.json محدَّث — المنشور:", post.get("permalink_url", "(بدون رابط)"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
