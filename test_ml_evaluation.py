"""
Verification & Test Suite for Simplified ML Evaluation Feature.
Tests that OpenCV and NLP scores (Accuracy, Precision, Recall, F1) are returned cleanly.
"""
from core.ml_evaluator import MLEvaluator

def run_tests():
    print("=" * 70)
    print("RUNNING SIMPLIFIED ML EVALUATION INTEGRATION TESTS")
    print("=" * 70)

    eval_result = MLEvaluator.evaluate()
    assert eval_result["status"] == "success"
    assert "opencv" in eval_result
    assert "nlp" in eval_result

    cv = eval_result["opencv"]
    print("\n1. OpenCV Vision Model Scores:")
    print(f"  Accuracy:  {cv['accuracy_formatted']}")
    print(f"  Precision: {cv['precision_formatted']}")
    print(f"  Recall:    {cv['recall_formatted']}")
    print(f"  F1-Score:  {cv['f1_score_formatted']}")

    assert cv["accuracy"] > 90
    assert cv["precision"] > 90
    assert cv["recall"] > 90
    assert cv["f1_score"] > 90
    print("  -> PASSED")

    nlp = eval_result["nlp"]
    print("\n2. NLP Grievance Triage Scores:")
    print(f"  Accuracy:  {nlp['accuracy_formatted']}")
    print(f"  Precision: {nlp['precision_formatted']}")
    print(f"  Recall:    {nlp['recall_formatted']}")
    print(f"  F1-Score:  {nlp['f1_score_formatted']}")

    assert nlp["accuracy"] > 80
    assert nlp["precision"] > 80
    assert nlp["recall"] > 80
    assert nlp["f1_score"] > 80
    print("  -> PASSED")

    print("\nALL SIMPLIFIED ML EVALUATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
