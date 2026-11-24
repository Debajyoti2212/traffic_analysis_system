"""
Named Entity Recognition (NER) for Traffic Incidents & Citizen Reports.
Extracts Locations, Organizations, Hazards, Vehicles, and Temporal Windows.
"""
import re
from typing import Dict, Any

HAZARD_KEYWORDS = {
    "pothole", "potholes", "crater", "waterlogging", "waterlogged", "flooding", "flooded",
    "oil spill", "open manhole", "trench", "fallen tree", "debris", "dead signal",
    "broken signal", "malfunctioning", "skidding", "skid", "accident", "collision",
    "head-on collision", "pileup", "fog", "overturned", "blind curve", "wrong side",
    "rash driving", "red light jumping", "broken railing", "stalled", "gridlock"
}

VEHICLE_KEYWORDS = {
    "car", "cars", "bike", "bikes", "motorcycle", "motorcycles", "two-wheeler",
    "scooter", "bus", "buses", "truck", "trucks", "dumper", "tractor", "ambulance", "fire truck", "auto"
}

class TrafficNER:
    """Extracts Location, Organization, Hazard, and Vehicle entities from citizen grievance text."""

    def __init__(self):
        self.spacy_nlp = None
        try:
            import spacy
            self.spacy_nlp = spacy.load("en_core_web_sm")
        except Exception:
            pass

    def extract_entities(self, text: str) -> Dict[str, Any]:
        entities = {"locations": [], "organizations": [], "hazards": [], "vehicles": [], "temporal": [], "raw_spacy_entities": []}

        # 1. Road infrastructure & location patterns (e.g. NH-44, Sector 14, Ludhiana Flyover)
        for pattern in [r"\b(?:NH|SH|National Highway)[-\s]?\d+\b", r"\bSector[-\s]?\d+[A-Za-z]?\b",
                        r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Flyover|Chowk|Underpass|Junction|Expressway|Road|Highway|Bridge)\b"]:
            for m in re.finditer(pattern, text, re.IGNORECASE):
                val = m.group().strip().title()
                if val not in entities["locations"]:
                    entities["locations"].append(val)

        # 2. Time expressions
        for m in re.finditer(r"\b(?:\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)|morning|evening|afternoon|night|peak hours)\b", text):
            if m.group().strip() not in entities["temporal"]:
                entities["temporal"].append(m.group().strip())

        # 3. SpaCy standard NER (if model is installed)
        if self.spacy_nlp:
            for ent in self.spacy_nlp(text).ents:
                entities["raw_spacy_entities"].append({"text": ent.text, "label": ent.label_})
                if ent.label_ in {"GPE", "LOC", "FAC"} and ent.text not in entities["locations"]:
                    entities["locations"].append(ent.text)
                elif ent.label_ == "ORG" and ent.text not in entities["organizations"]:
                    entities["organizations"].append(ent.text)
                elif ent.label_ in {"TIME", "DATE"} and ent.text not in entities["temporal"]:
                    entities["temporal"].append(ent.text)

        # 4. Standard organizations fallback
        for org in ["Traffic Police", "Municipal Corporation", "PWD", "NHAI", "Highway Patrol", "Police", "Helpline"]:
            if re.search(r"\b" + re.escape(org) + r"\b", text, re.IGNORECASE) and org not in entities["organizations"]:
                entities["organizations"].append(org)

        # 5. Domain keyword matching
        lower_text = text.lower()
        entities["hazards"] = [h for h in HAZARD_KEYWORDS if re.search(r"\b" + re.escape(h) + r"\b", lower_text)]
        entities["vehicles"] = [v for v in VEHICLE_KEYWORDS if re.search(r"\b" + re.escape(v) + r"\b", lower_text)]

        return entities
