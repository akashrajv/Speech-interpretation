import numpy as np
from typing import List, Dict, Any, Tuple

def compute_temporal_iou(start1: float, end1: float, start2: float, end2: float) -> float:
    """Computes 1D temporal Intersection over Union."""
    intersection = max(0.0, min(end1, end2) - max(start1, start2))
    union = max(end1, end2) - min(start1, start2)
    return (intersection / union) if union > 0 else 0.0

def evaluate_flaw_detections(
    ground_truth_annotations: List[Dict[str, Any]],
    predicted_detections: List[Dict[str, Any]],
    iou_threshold: float = 0.30
) -> Dict[str, Any]:
    """
    Evaluates automated flaw detections against human ground truth annotations.
    Calculates Precision, Recall, F1, mean temporal IoU, category breakdown, and confusion matrix.
    """
    if not ground_truth_annotations and not predicted_detections:
        return {
            "total_test_samples": 0,
            "total_annotations": 0,
            "total_predictions": 0,
            "overall_precision": 0.0,
            "overall_recall": 0.0,
            "overall_f1_score": 0.0,
            "mean_temporal_iou": 0.0,
            "iou_threshold": iou_threshold,
            "confusion_matrix": {},
            "category_metrics": [],
            "evaluation_notes": "No ground truth annotations or predictions available to evaluate."
        }

    # Distinct categories across both sets
    all_categories = sorted(list(set(
        [a.get("flaw_category", "") for a in ground_truth_annotations] +
        [p.get("category", "") for p in predicted_detections]
    )))

    # Initialize confusion matrix and category counts
    confusion_matrix = {cat: {c: 0 for c in all_categories + ["None"]} for cat in all_categories}
    category_stats = {
        cat: {
            "gt_count": 0,
            "pred_count": 0,
            "tp": 0,
            "fp": 0,
            "fn": 0,
            "ious": []
        }
        for cat in all_categories
    }

    matched_predictions = set()
    all_ious = []

    # Count GT per category
    for gt in ground_truth_annotations:
        cat = gt.get("flaw_category", "")
        if cat in category_stats:
            category_stats[cat]["gt_count"] += 1

    # Count Pred per category
    for pred in predicted_detections:
        cat = pred.get("category", "")
        if cat in category_stats:
            category_stats[cat]["pred_count"] += 1

    # Match each Ground Truth to the best available Prediction
    for gt in ground_truth_annotations:
        gt_cat = gt.get("flaw_category", "")
        gt_start = gt.get("start_seconds", 0.0)
        gt_end = gt.get("end_seconds", 0.0)

        best_match_idx = None
        best_iou = 0.0

        for p_idx, pred in enumerate(predicted_detections):
            if p_idx in matched_predictions:
                continue

            pred_start = pred.get("start_seconds", 0.0)
            pred_end = pred.get("end_seconds", 0.0)
            iou = compute_temporal_iou(gt_start, gt_end, pred_start, pred_end)

            if iou >= iou_threshold and iou > best_iou:
                best_iou = iou
                best_match_idx = p_idx

        if best_match_idx is not None:
            pred = predicted_detections[best_match_idx]
            pred_cat = pred.get("category", "")
            matched_predictions.add(best_match_idx)
            all_ious.append(best_iou)

            if pred_cat == gt_cat:
                category_stats[gt_cat]["tp"] += 1
                category_stats[gt_cat]["ious"].append(best_iou)
                confusion_matrix[gt_cat][gt_cat] += 1
            else:
                # Misclassified category
                category_stats[gt_cat]["fn"] += 1
                category_stats[pred_cat]["fp"] += 1
                confusion_matrix[gt_cat][pred_cat] += 1
        else:
            # False Negative: annotation was not detected
            category_stats[gt_cat]["fn"] += 1
            confusion_matrix[gt_cat]["None"] += 1

    # Remaining unmatched predictions are False Positives
    for p_idx, pred in enumerate(predicted_detections):
        if p_idx not in matched_predictions:
            pred_cat = pred.get("category", "")
            if pred_cat in category_stats:
                category_stats[pred_cat]["fp"] += 1

    # Compute overall and per-category Precision, Recall, F1
    total_tp = sum(c["tp"] for c in category_stats.values())
    total_fp = sum(c["fp"] for c in category_stats.values())
    total_fn = sum(c["fn"] for c in category_stats.values())

    overall_precision = (total_tp / (total_tp + total_fp)) if (total_tp + total_fp) > 0 else 0.0
    overall_recall = (total_tp / (total_tp + total_fn)) if (total_tp + total_fn) > 0 else 0.0
    overall_f1 = (2 * overall_precision * overall_recall / (overall_precision + overall_recall)) if (overall_precision + overall_recall) > 0 else 0.0
    mean_iou = float(np.mean(all_ious)) if all_ious else 0.0

    category_metrics_list = []
    for cat in all_categories:
        c = category_stats[cat]
        p = (c["tp"] / (c["tp"] + c["fp"])) if (c["tp"] + c["fp"]) > 0 else 0.0
        r = (c["tp"] / (c["tp"] + c["fn"])) if (c["tp"] + c["fn"]) > 0 else 0.0
        f1 = (2 * p * r / (p + r)) if (p + r) > 0 else 0.0
        cat_iou = float(np.mean(c["ious"])) if c["ious"] else 0.0

        category_metrics_list.append({
            "category": cat,
            "ground_truth_count": c["gt_count"],
            "predicted_count": c["pred_count"],
            "true_positives": c["tp"],
            "false_positives": c["fp"],
            "false_negatives": c["fn"],
            "precision": round(p, 3),
            "recall": round(r, 3),
            "f1_score": round(f1, 3),
            "mean_temporal_iou": round(cat_iou, 3)
        })

    return {
        "total_test_samples": len(set(a.get("dataset_sample_id") for a in ground_truth_annotations)),
        "total_annotations": len(ground_truth_annotations),
        "total_predictions": len(predicted_detections),
        "overall_precision": round(overall_precision, 3),
        "overall_recall": round(overall_recall, 3),
        "overall_f1_score": round(overall_f1, 3),
        "mean_temporal_iou": round(mean_iou, 3),
        "iou_threshold": iou_threshold,
        "confusion_matrix": confusion_matrix,
        "category_metrics": category_metrics_list,
        "evaluation_notes": f"Validated {len(ground_truth_annotations)} ground-truth annotations across {len(predicted_detections)} detector predictions with IoU match threshold {iou_threshold:.2f}."
    }
