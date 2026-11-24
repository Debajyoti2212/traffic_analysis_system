"""
Test script for TrafficAI Global Theme-Aware Tooltip System
Validates CSS variables, selectors, and JS logic for Light & Dark mode contrast.
"""
import re
import os

def test_tooltip_system():
    css_path = os.path.join("frontend", "css", "style.css")
    js_path = os.path.join("frontend", "js", "app.js")
    html_path = os.path.join("frontend", "index.html")

    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()

    with open(js_path, "r", encoding="utf-8") as f:
        js = f.read()

    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    # 1. Check Dark Mode Tooltip Tokens in :root
    assert "--tooltip-bg:" in css, "Missing --tooltip-bg in CSS"
    assert "--tooltip-text:" in css, "Missing --tooltip-text in CSS"
    assert "--tooltip-border:" in css, "Missing --tooltip-border in CSS"
    assert "--tooltip-shadow:" in css, "Missing --tooltip-shadow in CSS"

    # 2. Check Light Mode Tooltip Tokens in [data-theme="light"]
    light_theme_block = re.search(r'\[data-theme="light"\]\s*\{([^}]+)\}', css)
    assert light_theme_block, "Could not find [data-theme='light'] block in CSS"
    light_css = light_theme_block.group(1)
    assert "--tooltip-bg: #ffffff" in light_css or "--tooltip-bg: rgba(255" in light_css or "--tooltip-bg: #fff" in light_css, \
        "Light mode tooltip background should be white/light grey"
    assert "--tooltip-text: #1d1d1f" in light_css or "--tooltip-text: #12" in light_css or "--tooltip-text: #00" in light_css, \
        "Light mode tooltip text should be dark charcoal/black"
    assert "--tooltip-border:" in light_css, "Light mode tooltip must define subtle border"
    assert "--tooltip-shadow:" in light_css, "Light mode tooltip must define subtle shadow"

    # 3. Check #globalTrafficTooltip element styles
    assert "#globalTrafficTooltip" in css, "Missing #globalTrafficTooltip styling in CSS"
    assert "z-index: 9999999" in css, "Tooltip must have high z-index to float above all elements"
    assert "position: fixed" in css, "Tooltip must be fixed position to prevent parent overflow clipping"
    assert ".tooltip-visible" in css, "Tooltip must have visibility toggle class"

    # 4. Check JS GlobalTooltipManager
    assert "class GlobalTooltipManager" in js, "Missing GlobalTooltipManager in app.js"
    assert "globalTrafficTooltip" in js, "app.js should reference globalTrafficTooltip"
    assert "data-tooltip" in js, "app.js should use data-tooltip to suppress native OS tooltips"
    assert "placement-top" in js and "placement-bottom" in js, "app.js should calculate dynamic placement"
    assert "window.globalTooltipManager = new GlobalTooltipManager()" in js, "app.js must instantiate manager on DOM load"

    # 5. Check 4 summary cards have tooltip text
    assert 'title="Click to view Vehicle Analytics & Detected Vehicle Records"' in html
    assert 'title="Click to view Detected Violations Review Queue"' in html
    assert 'title="Click to open Complaints Management"' in html
    assert 'title="Click to open ANPR & Review Queue"' in html

    print("ALL 5 TESTS PASSED: Theme-Aware Global Tooltip system fully validated!")

if __name__ == "__main__":
    test_tooltip_system()
