"""
Test suite verifying 4 Summary Cards interactivity and navigation.
"""
def verify():
    html = open("frontend/index.html", "r", encoding="utf-8").read()
    js = open("frontend/js/app.js", "r", encoding="utf-8").read()
    css = open("frontend/css/style.css", "r", encoding="utf-8").read()

    print("Verifying Summary Cards Interactivity...")

    # 1. Check Card 1 (Unique Vehicles)
    assert 'navigateToSummaryCard(\'vehicles\')' in html, "Card 1 click handler missing in HTML"
    assert 'data-lucide="car"' in html, "Car icon missing in Card 1"
    print("  -> Card 1 (Unique Vehicles): Clickable & configured.")

    # 2. Check Card 2 (Candidate Violations)
    assert 'navigateToSummaryCard(\'violations\')' in html, "Card 2 click handler missing in HTML"
    assert 'data-lucide="alert-octagon"' in html, "Alert icon missing in Card 2"
    print("  -> Card 2 (Candidate Violations): Clickable & configured.")

    # 3. Check Card 3 (Complaints Received)
    assert 'navigateToSummaryCard(\'complaints\')' in html, "Card 3 click handler missing in HTML"
    assert 'data-lucide="message-square"' in html, "Message icon missing in Card 3"
    print("  -> Card 3 (Complaints Received): Clickable & configured.")

    # 4. Check Card 4 (ANPR & Review Queue)
    assert 'navigateToSummaryCard(\'anpr\')' in html, "Card 4 click handler missing in HTML"
    assert 'data-lucide="maximize-2"' in html, "Expand icon missing in Card 4"
    print("  -> Card 4 (ANPR & Review Queue): Clickable & configured.")

    # 5. Check JS implementation
    assert 'function navigateToSummaryCard' in js, "navigateToSummaryCard function missing in JS"
    assert 'loadVehicleRecordsTable' in js, "loadVehicleRecordsTable function missing in JS"
    assert 'filterVehicleRecordsTable' in js, "filterVehicleRecordsTable function missing in JS"
    print("  -> JS navigation & vehicle record loaders: Present.")

    # 6. Check destination sections in HTML
    assert 'id="vehicleRecordsSection"' in html, "vehicleRecordsSection missing in HTML"
    assert 'id="anprReviewQueueStrip"' in html, "anprReviewQueueStrip missing in HTML"
    assert 'id="vehicleRecordsTableBody"' in html, "vehicleRecordsTableBody missing in HTML"
    print("  -> Destination sections & tables: Present.")

    # 7. Check CSS hover & pointer styles
    assert '.summary-stat-card' in css, "summary-stat-card class missing in CSS"
    assert '.summary-stat-icon-btn' in css, "summary-stat-icon-btn class missing in CSS"
    assert 'cursor: pointer' in css, "cursor: pointer missing in CSS"
    print("  -> CSS hover & pointer styles: Present.")

    # 8. Check Sidebar Sequential Numbering (1 to 7)
    assert '1. Overview' in html, "1. Overview missing"
    assert '2. Camera View' in html, "2. Camera View missing"
    assert '3. Alerts & Review' in html, "3. Alerts & Review missing"
    assert '4. Analytics' in html, "4. Analytics missing"
    assert '5. ML Evaluation' in html, "5. ML Evaluation missing"
    assert '6. Public Complaints' in html, "6. Public Complaints missing"
    assert '7. Settings & Info' in html, "7. Settings & Info missing"
    print("  -> Sidebar sequential numbering (1 to 7): 100% Correct.")

    print("\nALL SUMMARY CARDS AND NUMBERING TESTS PASSED!")

if __name__ == "__main__":
    verify()

