import os
import argparse
import datetime
import tensorflow as tf
from tensorflow.keras.callbacks import (
    EarlyStopping,
    ReduceLROnPlateau,
    ModelCheckpoint,
    CSVLogger,
    TensorBoard
)

from utils.download_kaggle import download_and_extract_dataset
from utils.dataset_loader import load_dataset_generators
from utils.model_factory import build_deepfake_detector

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
RESULTS_DIR = os.path.join(BASE_DIR, "results")
LOGS_DIR = os.path.join(BASE_DIR, "logs")

for d in [MODELS_DIR, RESULTS_DIR, LOGS_DIR]:
    os.makedirs(d, exist_ok=True)

def train_pipeline(model_architecture="EfficientNetB0", epochs=50, batch_size=32, learning_rate=0.0001):
    print("==================================================================")
    print("TRUTHLENS AI - DEEPFAKE IMAGE DETECTION MODEL TRAINING PIPELINE")
    print(f"Architecture: {model_architecture} | Epochs: {epochs} | Batch Size: {batch_size} | LR: {learning_rate}")
    print("==================================================================")

    # 1. Dataset Verification
    download_and_extract_dataset()
    train_gen, val_gen, test_gen = load_dataset_generators(batch_size=batch_size)

    # 2. Model Factory Build
    model = build_deepfake_detector(
        model_name=model_architecture,
        input_shape=(224, 224, 3),
        learning_rate=learning_rate
    )

    # 3. Callbacks Setup
    keras_model_path = os.path.join(MODELS_DIR, "truthlens_image_model.keras")
    h5_model_path = os.path.join(MODELS_DIR, "truthlens_image_model.h5")
    csv_log_path = os.path.join(RESULTS_DIR, "training_log.csv")
    tb_log_dir = os.path.join(LOGS_DIR, "fit", datetime.datetime.now().strftime("%Y%m%d-%H%M%S"))

    callbacks = [
        EarlyStopping(
            monitor="val_loss",
            patience=10,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=4,
            min_lr=1e-7,
            verbose=1
        ),
        ModelCheckpoint(
            filepath=keras_model_path,
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1
        ),
        CSVLogger(csv_log_path, append=False),
        TensorBoard(log_dir=tb_log_dir, histogram_freq=1)
    ]

    # 4. Model Training Execution
    print("\n[TrainPipeline] Starting Model Fitting...")
    history = model.fit(
        train_gen,
        epochs=epochs,
        validation_data=val_gen,
        callbacks=callbacks
    )

    # 5. Save H5 Copy
    model.save(h5_model_path)
    print("\n==================================================================")
    print("MODEL TRAINING COMPLETE!")
    print(f"Saved Best Keras Model: {keras_model_path}")
    print(f"Saved Best H5 Model:    {h5_model_path}")
    print(f"Training Log CSV:       {csv_log_path}")
    print("==================================================================")
    return history

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train TruthLens AI Deepfake Image Detector")
    parser.add_argument("--model", type=str, default="EfficientNetB0", choices=["EfficientNetB0", "EfficientNetV2", "ResNet50", "Xception"], help="Transfer Learning Architecture")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Training batch size")
    parser.add_argument("--lr", type=float, default=0.0001, help="Initial learning rate")
    args = parser.parse_args()

    train_pipeline(
        model_architecture=args.model,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr
    )
