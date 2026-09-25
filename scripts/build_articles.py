#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from datetime import datetime
from html import escape
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "content" / "articles"
SERVICES_DIR = ROOT / "content" / "services"
TEMPLATES_DIR = ROOT / "templates"
BLOG_DIR = ROOT / "aktualnosci"
OFFER_DIR = ROOT / "oferta"
PRIVACY_URL = "https://barowo.com/polityka-prywatnosci/"
HOME_URL = "https://barowo.com/"
BLOG_URL = "https://barowo.com/aktualnosci/"
OFFER_URL = "https://barowo.com/oferta/"
CENNIK_URL = "https://barowo.com/cennik/"
REALIZACJE_URL = "https://barowo.com/realizacje/"
PLANNER_URL = "https://barowo.com/planer-baru-weselnego/"
YEAR = "2026"
BUSINESS_SAME_AS = [
    "https://www.instagram.com/barowo_official",
    "https://www.tiktok.com/@barowo.official",
]
BUSINESS_AREAS = ["Gdańsk", "Gdynia", "Sopot", "Trójmiasto", "Pomorskie"]
BUSINESS_SERVICE_TYPES = [
    "Mobilny bar",
    "Drink bar na wesele",
    "Bar na event firmowy",
    "Obsługa barmańska",
    "Fontanna czekoladowa",
    "Słodka strefa na event",
]
PRIMARY_CTA_LABEL = "Sprawdź dostępność terminu"
STATIC_PAGES = [
    (CENNIK_URL, ROOT / "cennik" / "index.html"),
    (REALIZACJE_URL, ROOT / "realizacje" / "index.html"),
    (PLANNER_URL, ROOT / "planer-baru-weselnego" / "index.html"),
]


def slug_url(slug: str) -> str:
    return f"https://barowo.com/aktualnosci/{slug}/"


def service_url(slug: str) -> str:
    return f"https://barowo.com/oferta/{slug}/"


def absolute_url(path: str) -> str:
    if not path:
        return ""
    if path.startswith(("http://", "https://")):
        return path
    return "https://barowo.com" + (path if path.startswith("/") else f"/{path}")


def is_lead_href(href: str) -> bool:
    value = (href or "").strip()
    return value in {"/#contact", "#contact"} or "#contact" in value


def cta_label(text: str, href: str) -> str:
    if is_lead_href(href):
        return PRIMARY_CTA_LABEL
    return text or PRIMARY_CTA_LABEL


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def business_graph() -> dict[str, Any]:
    return {
        "@type": "LocalBusiness",
        "@id": HOME_URL + "#business",
        "name": "BAROWO",
        "url": HOME_URL,
        "description": "Mobilny bar na wesele, urodziny i event firmowy w Trójmieście.",
        "logo": absolute_url("/assets/logo-main.png"),
        "image": [
            absolute_url("/assets/photo1-opt.jpg"),
            absolute_url("/assets/photo2-opt.jpg"),
            absolute_url("/assets/photo3-opt.jpg"),
        ],
        "telephone": "+48889168003",
        "email": "barowo.pl@gmail.com",
        "sameAs": BUSINESS_SAME_AS,
        "areaServed": BUSINESS_AREAS,
        "serviceType": BUSINESS_SERVICE_TYPES,
    }


def load_articles() -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for path in sorted(CONTENT_DIR.glob("*.json")):
        if path.stem.startswith("_"):
            continue
        item = read_json(path)
        if not item.get("published", True):
            continue
        item.setdefault("slug", path.stem)
        item.setdefault("published_at", datetime.now().strftime("%Y-%m-%d"))
        item.setdefault("title_plain", path.stem.replace("-", " ").capitalize())
        item.setdefault("description", item.get("intro", ""))
        item["_path"] = path
        items.append(item)
    items.sort(key=lambda x: x.get("published_at", ""), reverse=True)
    return items


def load_services() -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    if not SERVICES_DIR.exists():
        return items
    for path in sorted(SERVICES_DIR.glob("*.json")):
        if path.stem.startswith("_"):
            continue
        item = read_json(path)
        if not item.get("published", True):
            continue
        item.setdefault("slug", path.stem)
        item.setdefault("updated_at", datetime.now().strftime("%Y-%m-%d"))
        item.setdefault("title_plain", path.stem.replace("-", " ").capitalize())
        item.setdefault("description", item.get("intro", ""))
        item["_path"] = path
        items.append(item)
    items.sort(key=lambda x: (x.get("priority", 99), x.get("title_plain", "")))
    return items


def format_inline(text: str) -> str:
    text = escape(text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)
    return text


def split_heading_html(text: str) -> str:
    if not text:
        return ""
    if "<" in text and ">" in text:
        return text
    words = escape(text).split()
    if len(words) < 3:
        return " ".join(words)

    split_at = max(1, min(len(words) - 1, (len(words) + 1) // 2))
    return " ".join(words[:split_at]) + '<br><span class="red">' + " ".join(words[split_at:]) + "</span>"


def markdown_to_html(source: str) -> str:
    if re.search(r"<\s*(p|h2|h3|ul|ol|li|figure|div|blockquote|img)\b", source):
        return source.strip()

    lines = source.replace("\r\n", "\n").split("\n")
    out: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        stripped = line.strip()
        if not stripped:
            i += 1
            continue

        if stripped.startswith("### "):
            out.append(f"<h3>{format_inline(stripped[4:])}</h3>")
            i += 1
            continue
        if stripped.startswith("## "):
            out.append(f"<h2>{format_inline(stripped[3:])}</h2>")
            i += 1
            continue
        if stripped.startswith("> "):
            quote_lines = []
            while i < len(lines) and lines[i].strip().startswith("> "):
                quote_lines.append(lines[i].strip()[2:])
                i += 1
            out.append(f'<div class="article-quote">{format_inline(" ".join(quote_lines))}</div>')
            continue
        if re.match(r"^[-*]\s+", stripped):
            items = []
            while i < len(lines) and re.match(r"^[-*]\s+", lines[i].strip()):
                items.append(format_inline(re.sub(r"^[-*]\s+", "", lines[i].strip())))
                i += 1
            out.append("<ul>" + "".join(f"<li>{item}</li>" for item in items) + "</ul>")
            continue
        if re.match(r"^\d+\.\s+", stripped):
            items = []
            while i < len(lines) and re.match(r"^\d+\.\s+", lines[i].strip()):
                items.append(format_inline(re.sub(r"^\d+\.\s+", "", lines[i].strip())))
                i += 1
            out.append("<ol>" + "".join(f"<li>{item}</li>" for item in items) + "</ol>")
            continue

        para = [stripped]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r"^(##|###|[-*]|\d+\.|> )", lines[i].strip()):
            para.append(lines[i].strip())
            i += 1
        out.append(f"<p>{format_inline(' '.join(para))}</p>")
    return "\n          ".join(out)


def render_meta_spans(article: dict[str, Any]) -> str:
    vals = [article.get("read_time", ""), article.get("category", ""), article.get("tag", "")]
    return "\n        ".join(f"<span>{escape(v)}</span>" for v in vals if v)


def render_cover(article: dict[str, Any]) -> str:
    src = article.get("cover_image", "")
    alt = article.get("cover_alt", "")
    if not src:
        return ""
    return f'<img src="{escape(src)}" alt="{escape(alt)}" width="1200" height="1600">'


def render_summary(article: dict[str, Any]) -> str:
    summary = article.get("summary") or []
    if not summary:
        return ""
    items = "\n            ".join(f"<li>{escape(item)}</li>" for item in summary)
    return f'<ul class="article-summary">\n            {items}\n          </ul>\n\n          '


def render_article_body(article: dict[str, Any]) -> str:
    return render_summary(article) + markdown_to_html(article.get("body", ""))


def render_jsonld(article: dict[str, Any]) -> str:
    published_at = article.get("published_at", datetime.now().strftime("%Y-%m-%d"))
    modified_at = article.get("modified_at", article.get("updated_at", published_at))
    article_url = slug_url(article["slug"])
    image_url = absolute_url(article.get("cover_image", ""))
    payload = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "BlogPosting",
                "@id": article_url + "#article",
                "headline": article.get("title_plain", ""),
                "description": article.get("description", ""),
                "datePublished": published_at,
                "dateModified": modified_at,
                "author": {
                    "@type": "Organization",
                    "name": "BAROWO",
                    "url": HOME_URL,
                    "sameAs": [
                        "https://www.instagram.com/barowo_official",
                        "https://www.tiktok.com/@barowo.official",
                    ],
                },
                "publisher": {
                    "@type": "Organization",
                    "name": "BAROWO",
                    "logo": {"@type": "ImageObject", "url": "https://barowo.com/assets/logo-main.png"},
                },
                "mainEntityOfPage": article_url,
                "image": [image_url] if image_url else [],
                "articleSection": article.get("category", "Aktualności"),
                "keywords": [v for v in [article.get("category", ""), article.get("tag", ""), article.get("target_keyword", "")] if v],
                "inLanguage": "pl-PL",
            },
            {
                "@type": "BreadcrumbList",
                "@id": article_url + "#breadcrumbs",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Strona główna", "item": HOME_URL},
                    {"@type": "ListItem", "position": 2, "name": "Aktualności", "item": BLOG_URL},
                    {"@type": "ListItem", "position": 3, "name": article.get("title_plain", ""), "item": article_url},
                ],
            },
        ],
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)


def article_footer_copy(article: dict[str, Any]) -> str:
    return article.get("footer_copy") or (
        f"© {YEAR} BAROWO — Mobilny Bar Trójmiasto. Artykuł z sekcji Aktualności BAROWO."
    )


def render_article_page(template: str, article: dict[str, Any]) -> str:
    published_at = article.get("published_at", "")
    modified_at = article.get("modified_at", article.get("updated_at", published_at))
    og_image = absolute_url(article.get("cover_image", article.get("card_image", "")))
    replacements = {
        "{{PAGE_TITLE}}": escape(f"{article['title_plain']} | BAROWO"),
        "{{META_DESCRIPTION}}": escape(article.get("description", "")),
        "{{OG_TITLE}}": escape(article.get("title_plain", "")),
        "{{OG_DESCRIPTION}}": escape(article.get("description", "")),
        "{{OG_URL}}": slug_url(article["slug"]),
        "{{OG_IMAGE}}": escape(og_image),
        "{{CANONICAL_URL}}": slug_url(article["slug"]),
        "{{JSONLD}}": render_jsonld(article),
        "{{H1_HTML}}": article.get("title_html", escape(article.get("title_plain", ""))),
        "{{INTRO}}": escape(article.get("intro", "")),
        "{{PUBLISHED_AT}}": escape(published_at),
        "{{MODIFIED_AT}}": escape(modified_at),
        "{{ARTICLE_META}}": render_meta_spans(article),
        "{{ARTICLE_COVER}}": render_cover(article),
        "{{ARTICLE_BODY}}": render_article_body(article),
        "{{CTA_TITLE_HTML}}": article.get(
            "cta_title_html", 'SPRAWDŹ,<br><span class="red">CZY MAMY TERMIN</span>'
        ),
        "{{CTA_TEXT}}": escape(
            article.get("cta_text", "Napisz do nas, a wrócimy z konkretną odpowiedzią i propozycją pakietu.")
        ),
        "{{FOOTER_COPY}}": escape(article_footer_copy(article)),
    }
    output = template
    for key, value in replacements.items():
        output = output.replace(key, value)
    return output


def render_list(items: list[str]) -> str:
    if not items:
        return ""
    return "\n".join(f"<li>{format_inline(item)}</li>" for item in items)


def render_service_cards_section(section: dict[str, Any]) -> str:
    cards = section.get("cards") or []
    if not cards:
        return ""

    card_items: list[str] = []
    for card in cards:
        eyebrow = (card.get("eyebrow") or "").strip()
        title_html = card.get("title_html") or format_inline(card.get("title", ""))
        text = (card.get("text") or "").strip()
        button_text = (card.get("button_text") or "").strip()
        button_href = (card.get("button_href") or "").strip()

        card_parts = ['<article class="service-info-card">']
        if eyebrow:
            card_parts.append(f'  <div class="service-info-card-meta">{escape(eyebrow)}</div>')
        if title_html:
            card_parts.append(f"  <h3>{title_html}</h3>")
        if text:
            card_parts.append(f"  <p>{format_inline(text)}</p>")
        if button_text and button_href:
            card_parts.append(f'  <a class="btn btn-secondary" href="{escape(button_href)}">{escape(cta_label(button_text, button_href))}</a>')
        card_parts.append("</article>")
        card_items.append("\n              ".join(card_parts))

    title_markup = section.get("title_html") or split_heading_html(section.get("title", ""))
    label = (section.get("label") or "").strip()
    intro = (section.get("intro") or "").strip()
    footnote = (section.get("footnote") or "").strip()
    columns = min(max(len(cards), 1), 3)

    parts = ['<section class="service-block service-cards-block">']
    if label:
        parts.append(f'  <div class="label">{escape(label)}</div>')
    if title_markup:
        parts.append(f"  <h2>{title_markup}</h2>")
    if intro:
        parts.append(f"  <p>{format_inline(intro)}</p>")
    parts.append(f'  <div class="service-card-grid columns-{columns}">')
    parts.append("              " + "\n              ".join(card_items))
    parts.append("  </div>")
    if footnote:
        parts.append(f'  <p class="service-section-footnote">{format_inline(footnote)}</p>')
    parts.append("</section>")
    return "\n          ".join(parts)


def render_service_sections(service: dict[str, Any]) -> str:
    sections = service.get("sections") or []
    out: list[str] = []
    for section in sections:
        if section.get("type") == "cards":
            rendered = render_service_cards_section(section)
            if rendered:
                out.append(rendered)
            continue

        title = section.get("title", "")
        body = section.get("body", "")
        bullets = section.get("bullets") or []
        parts = [
            '<section class="service-block">',
            f'  <h2>{split_heading_html(title)}</h2>',
            f'  <p>{format_inline(body)}</p>',
        ]
        if bullets:
            parts.append(f'  <ul>{render_list(bullets)}</ul>')
        parts.append("</section>")
        out.append("\n          ".join(parts))
    return "\n        ".join(out)


def render_service_faq(service: dict[str, Any]) -> str:
    faqs = service.get("faq") or []
    if not faqs:
        return ""
    items = "\n".join(
        f"""          <details>
            <summary>{escape(item.get('question', ''))}</summary>
            <p>{format_inline(item.get('answer', ''))}</p>
          </details>"""
        for item in faqs
    )
    return f"""<section class="service-faq">
          <div class="label">FAQ</div>
          <h2>Najczęstsze<br><span class="red">pytania</span></h2>
{items}
        </section>"""


def render_service_jsonld(service: dict[str, Any]) -> str:
    page_url = service_url(service["slug"])
    faqs = service.get("faq") or []
    graph: list[dict[str, Any]] = [
        business_graph(),
        {
            "@type": "Service",
            "@id": page_url + "#service",
            "name": service.get("title_plain", ""),
            "description": service.get("description", ""),
            "provider": {"@id": HOME_URL + "#business"},
            "serviceType": service.get("service_type", "Mobilny bar"),
            "areaServed": service.get("areas", ["Gdynia", "Gdańsk", "Sopot", "Trójmiasto"]),
            "url": page_url,
            "image": absolute_url(service.get("image", "/assets/photo1-opt.jpg")),
            "offers": {
                "@type": "Offer",
                "availability": "https://schema.org/InStock",
                "url": page_url,
                "priceCurrency": "PLN",
                "description": service.get("offer_note", "Wycena indywidualna zależna od daty, lokalizacji, liczby gości i zakresu obsługi."),
            },
        },
        {
            "@type": "BreadcrumbList",
            "@id": page_url + "#breadcrumbs",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Strona główna", "item": HOME_URL},
                {"@type": "ListItem", "position": 2, "name": "Oferta", "item": OFFER_URL},
                {"@type": "ListItem", "position": 3, "name": service.get("title_plain", ""), "item": page_url},
            ],
        },
    ]
    if faqs:
        graph.append(
            {
                "@type": "FAQPage",
                "@id": page_url + "#faq",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": item.get("question", ""),
                        "acceptedAnswer": {"@type": "Answer", "text": item.get("answer", "")},
                    }
                    for item in faqs
                ],
            }
        )
    return json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=2)


def render_related_articles(service: dict[str, Any], articles: list[dict[str, Any]]) -> str:
    links: list[str] = []
    for item in service.get("related_links") or []:
        href = item.get("href", "").strip()
        label = item.get("label", "").strip()
        if href and label:
            links.append(f'<a href="{escape(href)}">{escape(label)}</a>')

    slugs = service.get("related_articles") or []
    by_slug = {article["slug"]: article for article in articles}
    for slug in slugs:
        article = by_slug.get(slug)
        if article:
            links.append(f'<a href="/aktualnosci/{slug}/">{escape(article.get("title_plain", slug))}</a>')
    if not links:
        return ""
    return '<div class="related-links">' + "\n".join(links) + "</div>"


def render_service_page(template: str, service: dict[str, Any], articles: list[dict[str, Any]]) -> str:
    meta_title = service.get("meta_title", f"{service['title_plain']} | BAROWO")
    meta_description = service.get("meta_description", service.get("description", ""))
    replacements = {
        "{{PAGE_TITLE}}": escape(meta_title),
        "{{META_DESCRIPTION}}": escape(meta_description),
        "{{OG_TITLE}}": escape(service.get("og_title", meta_title)),
        "{{OG_DESCRIPTION}}": escape(service.get("og_description", meta_description)),
        "{{OG_URL}}": service_url(service["slug"]),
        "{{OG_IMAGE}}": escape(absolute_url(service.get("image", "/assets/photo1-opt.jpg"))),
        "{{CANONICAL_URL}}": service_url(service["slug"]),
        "{{JSONLD}}": render_service_jsonld(service),
        "{{H1_HTML}}": service.get("title_html", escape(service.get("title_plain", ""))),
        "{{EYEBROW}}": escape(service.get("eyebrow", "Oferta BAROWO")),
        "{{INTRO}}": escape(service.get("intro", "")),
        "{{DIRECT_ANSWER}}": escape(service.get("direct_answer", "")),
        "{{IMAGE}}": escape(service.get("image", "/assets/photo1-opt.jpg")),
        "{{IMAGE_ALT}}": escape(service.get("image_alt", "Mobilny bar BAROWO")),
        "{{HIGHLIGHTS}}": render_list(service.get("highlights") or []),
        "{{SECTIONS}}": render_service_sections(service),
        "{{FAQ}}": render_service_faq(service),
        "{{RELATED_ARTICLES}}": render_related_articles(service, articles),
        "{{UPDATED_AT}}": escape(service.get("updated_at", "")),
        "{{PRIMARY_CTA_HREF}}": escape(service.get("primary_cta_href", "/#contact")),
        "{{PRIMARY_CTA_TEXT}}": escape(cta_label(service.get("primary_cta_text", PRIMARY_CTA_LABEL), service.get("primary_cta_href", "/#contact"))),
        "{{SECONDARY_CTA_TEXT}}": escape(service.get("secondary_cta_text", "Zobacz cennik")),
        "{{SECONDARY_CTA_HREF}}": escape(service.get("secondary_cta_href", "/cennik/")),
        "{{MID_CTA_LABEL}}": escape(service.get("mid_cta_label", "Szybka wycena")),
        "{{MID_CTA_TITLE_HTML}}": service.get(
            "mid_cta_title_html",
            'SPRAWDŹ,<br><span class="red">DOSTĘPNOŚĆ TERMINU</span>',
        ),
        "{{MID_CTA_TEXT}}": escape(
            service.get(
                "mid_cta_text",
                "Podaj datę, miasto i liczbę gości. To wystarczy, żeby wrócić z konkretną odpowiedzią.",
            )
        ),
        "{{MID_CTA_BUTTON_HREF}}": escape(service.get("mid_cta_button_href", "/#contact")),
        "{{MID_CTA_BUTTON_TEXT}}": escape(cta_label(service.get("mid_cta_button_text", PRIMARY_CTA_LABEL), service.get("mid_cta_button_href", "/#contact"))),
        "{{BOTTOM_CTA_LABEL}}": escape(service.get("bottom_cta_label", "Rezerwacja")),
        "{{BOTTOM_CTA_TITLE_HTML}}": service.get(
            "bottom_cta_title_html",
            'ZAREZERWUJ<br><span class="red">MOBILNY BAR</span>',
        ),
        "{{BOTTOM_CTA_TEXT}}": escape(
            service.get(
                "bottom_cta_text",
                "Napisz kilka konkretów o wydarzeniu, a wrócimy z terminem i najbardziej sensownym pakietem.",
            )
        ),
        "{{BOTTOM_CTA_BUTTON_HREF}}": escape(service.get("bottom_cta_button_href", "/#contact")),
        "{{BOTTOM_CTA_BUTTON_TEXT}}": escape(cta_label(service.get("bottom_cta_button_text", PRIMARY_CTA_LABEL), service.get("bottom_cta_button_href", "/#contact"))),
        "{{SIDEBAR_TITLE_HTML}}": service.get(
            "sidebar_title_html",
            'ZAPYTAJ O<br><span class="red">TERMIN</span>',
        ),
        "{{SIDEBAR_TEXT}}": escape(
            service.get(
                "sidebar_text",
                "Podaj datę, miejsce i orientacyjną liczbę gości. Wrócimy z konkretną odpowiedzią i propozycją pakietu.",
            )
        ),
        "{{SIDEBAR_BUTTON_HREF}}": escape(service.get("sidebar_button_href", "/#contact")),
        "{{SIDEBAR_BUTTON_TEXT}}": escape(cta_label(service.get("sidebar_button_text", PRIMARY_CTA_LABEL), service.get("sidebar_button_href", "/#contact"))),
        "{{RELATED_RESOURCES_LABEL}}": escape(service.get("related_resources_label", "Powiązane strony")),
    }
    output = template
    for key, value in replacements.items():
        output = output.replace(key, value)
    return output


def service_card_html(service: dict[str, Any]) -> str:
    return f"""        <article class="service-card">
          <a class="service-card-media" href="/oferta/{service['slug']}/">
            <img src="{escape(service.get('image', '/assets/photo1-opt.jpg'))}" alt="{escape(service.get('image_alt', 'Mobilny bar BAROWO'))}" width="1200" height="1600" loading="lazy">
          </a>
          <div class="service-card-copy">
            <span>{escape(service.get('eyebrow', 'Oferta'))}</span>
            <h2>{service.get('card_title_html', service.get('title_html', escape(service.get('title_plain', ''))))}</h2>
            <p>{escape(service.get('card_excerpt', service.get('intro', '')))}</p>
            <a class="btn btn-primary" href="/oferta/{service['slug']}/">Zobacz ofertę</a>
          </div>
        </article>"""


def render_service_index(template: str, services: list[dict[str, Any]]) -> str:
    cards = "\n\n".join(service_card_html(service) for service in services)
    payload = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Oferta BAROWO",
        "description": "Mobilny bar, drink bar i obsługa barmańska BAROWO w Trójmieście.",
        "url": OFFER_URL,
        "mainEntity": [
            {"@type": "Service", "name": service.get("title_plain", ""), "url": service_url(service["slug"])}
            for service in services
        ],
    }
    return template.replace("{{SERVICE_CARDS}}", cards).replace("{{JSONLD}}", json.dumps(payload, ensure_ascii=False, indent=2))


def card_html(article: dict[str, Any]) -> str:
    card_image = escape(article.get("card_image", article.get("cover_image", "")))
    card_alt = escape(article.get("card_alt", article.get("cover_alt", "")))
    card_title = article.get("card_title_html", article.get("title_html", escape(article.get("title_plain", ""))))
    card_excerpt = escape(article.get("card_excerpt", article.get("intro", "")))
    meta_items = []
    seen_meta = set()
    for value in (article.get("read_time", ""), article.get("category", ""), article.get("tag", "")):
        clean = (value or "").strip()
        key = clean.lower()
        if clean and key not in seen_meta:
            seen_meta.add(key)
            meta_items.append(f"<span>{escape(clean)}</span>")
    meta_html = "\n              ".join(meta_items)
    return f"""        <article class="post-card">
          <a class="post-card-media" href="/aktualnosci/{article['slug']}/" aria-label="Czytaj artykuł">
            <img src="{card_image}" alt="{card_alt}" width="1200" height="1600" loading="lazy">
          </a>
          <div class="post-card-copy">
            <div>
              <div class="label">Nowy artykuł</div>
              <h2>{card_title}</h2>
            </div>
            <div class="post-meta">
              {meta_html}
            </div>
            <p>{card_excerpt}</p>
            <div class="actions">
              <a class="btn btn-primary" href="/aktualnosci/{article['slug']}/">Czytaj artykuł</a>
            </div>
          </div>
        </article>"""


def render_blog_index(template: str, articles: list[dict[str, Any]]) -> str:
    cards = "\n\n".join(card_html(article) for article in articles)
    return template.replace("{{POST_CARDS}}", cards)


def write_article_pages(articles: list[dict[str, Any]]) -> None:
    template = (TEMPLATES_DIR / "article-template.html").read_text(encoding="utf-8")
    for article in articles:
        out_dir = BLOG_DIR / article["slug"]
        write_file(out_dir / "index.html", render_article_page(template, article))


def write_blog_index(articles: list[dict[str, Any]]) -> None:
    template = (TEMPLATES_DIR / "blog-template.html").read_text(encoding="utf-8")
    write_file(BLOG_DIR / "index.html", render_blog_index(template, articles))


def write_service_pages(services: list[dict[str, Any]], articles: list[dict[str, Any]]) -> None:
    template = (TEMPLATES_DIR / "service-template.html").read_text(encoding="utf-8")
    for service in services:
        out_dir = OFFER_DIR / service["slug"]
        write_file(out_dir / "index.html", render_service_page(template, service, articles))


def write_service_index(services: list[dict[str, Any]]) -> None:
    template = (TEMPLATES_DIR / "service-index-template.html").read_text(encoding="utf-8")
    write_file(OFFER_DIR / "index.html", render_service_index(template, services))


def write_sitemap(articles: list[dict[str, Any]], services: list[dict[str, Any]]) -> None:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    urls = [
        (HOME_URL, datetime.now().strftime("%Y-%m-%d")),
        (OFFER_URL, datetime.now().strftime("%Y-%m-%d")),
        (CENNIK_URL, datetime.now().strftime("%Y-%m-%d")),
        (REALIZACJE_URL, datetime.now().strftime("%Y-%m-%d")),
        (BLOG_URL, datetime.now().strftime("%Y-%m-%d")),
        (PLANNER_URL, datetime.now().strftime("%Y-%m-%d")),
    ]
    urls.extend(
        (service_url(service["slug"]), service.get("updated_at", datetime.now().strftime("%Y-%m-%d")))
        for service in services
    )
    urls.extend(
        (slug_url(article["slug"]), article.get("published_at", datetime.now().strftime("%Y-%m-%d")))
        for article in articles
    )
    urls.append((PRIVACY_URL, datetime.now().strftime("%Y-%m-%d")))
    for loc, lastmod in urls:
        lines.extend(["  <url>", f"    <loc>{loc}</loc>", f"    <lastmod>{lastmod}</lastmod>", "  </url>"])
    lines.append("</urlset>")
    write_file(ROOT / "sitemap.xml", "\n".join(lines) + "\n")


def write_redirects(articles: list[dict[str, Any]], services: list[dict[str, Any]]) -> None:
    lines = [
        "https://www.barowo.com/* https://barowo.com/:splat 301!",
        "http://www.barowo.com/* https://barowo.com/:splat 301!",
        "/index.html / 301!",
        "/oferta.html /oferta/ 301!",
        "/oferta/index.html /oferta/ 301!",
        "/aktualnosci.html /aktualnosci/ 301!",
        "/aktualnosci/index.html /aktualnosci/ 301!",
        "/planer-weselny/ /planer-baru-weselnego/ 301!",
        "/planer-weselny/index.html /planer-baru-weselnego/ 301!",
    ]
    for service in services:
        lines.append(f"/oferta/{service['slug']}/index.html /oferta/{service['slug']}/ 301!")
    for article in articles:
        lines.append(f"/aktualnosci/{article['slug']}/index.html /aktualnosci/{article['slug']}/ 301!")
    lines.extend(
        [
            "/polityka-prywatnosci.html /polityka-prywatnosci/ 301!",
            "/polityka-prywatnosci/index.html /polityka-prywatnosci/ 301!",
        ]
    )
    for url, path in STATIC_PAGES:
        slug = path.parent.name
        lines.extend(
            [
                f"/{slug}.html /{slug}/ 301!",
                f"/{slug}/index.html /{slug}/ 301!",
            ]
        )
    write_file(ROOT / "_redirects", "\n".join(lines) + "\n")


def main() -> None:
    articles = load_articles()
    services = load_services()
    write_article_pages(articles)
    write_blog_index(articles)
    write_service_pages(services, articles)
    write_service_index(services)
    write_sitemap(articles, services)
    write_redirects(articles, services)
    print(f"built {len(articles)} articles and {len(services)} service pages")


if __name__ == "__main__":
    main()
