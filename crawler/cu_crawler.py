import requests
from bs4 import BeautifulSoup
import pandas as pd
import os
import re

IMAGE_DIR = "images"

def safe_filename(url: str) -> str:
    name = url.rstrip("/").split("/")[-1]
    return name if name else "unknown.jpg"

def crawl_cu(search_condition="", label="1+1"):
    url = "https://cu.bgfretail.com/event/plusAjax.do"
    data = {
        "pageIndex": "1",
        "listType": "0",
        "searchCondition": search_condition,
    }

    resp = requests.post(url, data=data)
    resp.encoding = "utf-8"
    soup = BeautifulSoup(resp.text, "html.parser")

    items = soup.select("li.prod_list")
    print(f"[{label}] 발견된 상품 수: {len(items)}개")

    products = []
    for item in items:
        name_elem = item.select_one("div.name p")
        name = name_elem.text.strip() if name_elem else ""

        price_elem = item.select_one("div.price strong")
        price = price_elem.text.strip() if price_elem else ""

        badge_elem = item.select_one("div.badge span")
        badge = badge_elem.text.strip() if badge_elem else ""

        img_elem = item.select_one(".prod_img img")
        img_url = ""
        if img_elem and img_elem.get("src"):
            src = img_elem["src"]
            img_url = "https:" + src if src.startswith("//") else src

        products.append({
            "상품명": name,
            "가격": price,
            "행사종류": badge,
            "편의점": "CU",
            "이미지URL": img_url,
        })

    return products


def download_images(products):
    os.makedirs(IMAGE_DIR, exist_ok=True)
    for i, prod in enumerate(products):
        url = prod["이미지URL"]
        if not url:
            continue
        try:
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            fname = safe_filename(url)
            # 상품명에 있는 특수문자 제거해서 prefix로 사용
            clean_name = re.sub(r'[\\/*?:"<>|]', "", prod["상품명"])
            local_path = os.path.join(IMAGE_DIR, f"{i}_{clean_name}_{fname}")
            with open(local_path, "wb") as f:
                f.write(resp.content)
            print(f"  ✅ 이미지 다운로드: {local_path}")
        except Exception as e:
            print(f"  ⚠️ 이미지 다운로드 실패 ({url}): {e}")


def main():
    os.makedirs(IMAGE_DIR, exist_ok=True)

    print("[1+1] 수집 시작!")
    products_1p1 = crawl_cu(search_condition="", label="1+1")

    print("\n[2+1] 수집 시작!")
    products_2p1 = crawl_cu(search_condition="24", label="2+1")

    all_products = products_1p1 + products_2p1

    df = pd.DataFrame(all_products)
    df = df[df["상품명"].str.strip() != ""]
    df = df.reset_index(drop=True)

    df.to_csv("cu_products.csv", index=False, encoding="utf-8-sig")
    print(f"\n✅ CSV 저장 완료! cu_products.csv (총 {len(df)}개 상품)")
    print(df["행사종류"].value_counts())

    print("\n🖼️ 이미지 다운로드 시작...")
    download_images(all_products)
    print("✅ 이미지 다운로드 완료!")


if __name__ == "__main__":
    main()
