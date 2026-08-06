import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import tensorflow as tf
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_curve,
    auc,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score
)

from utils.dataset_loader import load_dataset_generators

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
RESULTS_DIR = os.path.join(BASE_DIR, "results")
os.makedirs(RESULTS_DIR, exist_ok=True)

def evaluate_model():
    print("==================================================================")
    print("TRUTHLENS AI - MODEL EVALUATION & METRIC PERFORMANCE SUITE")
    print("==================================================================")

    keras_path = os.path.join(MODELS_DIR, "truthlens_image_model.keras")
    h5_path = os.path.join(MODELS_DIR, "truthlens_image_model.h5")

    if os.path.exists(keras_path):
        model_file = keras_path
    elif os.path.exists(h5_path):
        model_file = h5_path
    else:
        print("[Evaluate ERROR] No trained model found in models/ directory. Run train.py first.")
        return

    print(f"[Evaluate] Loading model from: {model_file}")
    model = tf.keras.models.load_model(model_file)

    _, _, test_gen = load_dataset_generators(batch_size=32)
    test_gen.reset()

    # Predict test probabilities
    y_prob = model.predict(test_gen, verbose=1).flatten()
    y_true = test_gen.classes
    y_pred = (y_prob >= 0.5).astype(int)

    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    fpr, tpr, _ = roc_curve(y_true, y_prob)
    roc_auc = auc(fpr, tpr)

    print("\n--- PERFORMANCE METRICS ---")
    print(f"Accuracy    : {acc * 100:.2f}%")
    print(f"Precision   : {prec * 100:.2f}%")
    print(f"Recall      : {rec * 100:.2f}%")
    print(f"F1 Score    : {f1 * 100:.2f}%")
    print(f"ROC AUC     : {roc_auc:.4f}")
    print("\n--- CLASSIFICATION REPORT ---")
    print(classification_report(y_true, y_pred, target_names=["Real", "Fake"]))

    # Save Metrics Text Summary
    metrics_summary_path = os.path.join(RESULTS_DIR, "evaluation_metrics.txt")
    with open(metrics_summary_path, "w") as f:
        f.write(f"TruthLens AI Deepfake Image Detector Evaluation\n")
        f.write(f"Accuracy  : {acc * 100:.2f}%\n")
        f.write(f"Precision : {prec * 100:.2f}%\n")
        f.write(f"Recall    : {rec * 100:.2f}%\n")
        f.write(f"F1 Score  : {f1 * 100:.2f}%\n")
        f.write(f"ROC AUC   : {roc_auc:.4f}\n\n")
        f.write(classification_report(y_true, y_pred, target_names=["Real", "Fake"]))

    # 1. Plot Confusion Matrix
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=["Real", "Fake"], yticklabels=["Real", "Fake"])
    plt.title("Confusion Matrix - Deepfake Detection")
    plt.ylabel("Actual Label")
    plt.xlabel("Predicted Label")
    plt.tight_layout()
    cm_path = os.path.join(RESULTS_DIR, "confusion_matrix.png")
    plt.savefig(cm_path, dpi=300)
    plt.close()

    # 2. Plot ROC Curve
    plt.figure(figsize=(6, 5))
    plt.plot(fpr, tpr, color="darkorange", lw=2, label=f"ROC curve (area = {roc_auc:.2f})")
    plt.plot([0, 1], [0, 1], color="navy", lw=2, linestyle="--")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("Receiver Operating Characteristic (ROC) Curve")
    plt.legend(loc="lower right")
    plt.tight_layout()
    roc_path = os.path.join(RESULTS_DIR, "roc_curve.png")
    plt.savefig(roc_path, dpi=300)
    plt.close()

    # 3. Plot Training History (if log file exists)
    csv_log = os.path.join(RESULTS_DIR, "training_log.csv")
    if os.path.exists(csv_log):
        df = pd.read_csv(csv_log)
        
        # Accuracy Plot
        plt.figure(figsize=(7, 4))
        plt.plot(df["epoch"], df["accuracy"], label="Train Accuracy", color="green")
        if "val_accuracy" in df.columns:
            plt.plot(df["epoch"], df["val_accuracy"], label="Val Accuracy", color="blue")
        plt.title("Model Accuracy History")
        plt.xlabel("Epoch")
        plt.ylabel("Accuracy")
        plt.legend()
        plt.tight_layout()
        plt.savefig(os.path.join(RESULTS_DIR, "accuracy_graph.png"), dpi=300)
        plt.close()

        # Loss Plot
        plt.figure(figsize=(7, 4))
        plt.plot(df["epoch"], df["loss"], label="Train Loss", color="red")
        if "val_loss" in df.columns:
            plt.plot(df["epoch"], df["val_loss"], label="Val Loss", color="orange")
        plt.title("Model Loss History")
        plt.xlabel("Epoch")
        plt.ylabel("Loss")
        plt.legend()
        plt.tight_layout()
        plt.savefig(os.path.join(RESULTS_DIR, "loss_graph.png"), dpi=300)
        plt.close()

    print("\n==================================================================")
    print("EVALUATION COMPLETE! Visual graphs saved in results/ directory:")
    print(f"- Confusion Matrix: {cm_path}")
    print(f"- ROC Curve:        {roc_path}")
    print(f"- Summary Report:    {metrics_summary_path}")
    print("==================================================================")

if __name__ == "__main__":
    evaluate_model()
