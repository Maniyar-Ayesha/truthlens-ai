import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import (
    EfficientNetB0,
    EfficientNetV2B0,
    ResNet50V2,
    Xception
)

def build_deepfake_detector(model_name="EfficientNetB0", input_shape=(224, 224, 3), learning_rate=0.0001):
    """
    Factory function to build Deepfake Detection CNN with Transfer Learning.
    
    Supported model_name options:
    - 'EfficientNetB0' (Default)
    - 'EfficientNetV2'
    - 'ResNet50'
    - 'Xception'
    """
    model_name_clean = model_name.strip().lower()

    if "v2" in model_name_clean:
        print("[ModelFactory] Initializing Base Model: EfficientNetV2B0")
        base_model = EfficientNetV2B0(include_top=False, weights="imagenet", input_shape=input_shape)
    elif "resnet" in model_name_clean:
        print("[ModelFactory] Initializing Base Model: ResNet50V2")
        base_model = ResNet50V2(include_top=False, weights="imagenet", input_shape=input_shape)
    elif "xception" in model_name_clean:
        print("[ModelFactory] Initializing Base Model: Xception")
        base_model = Xception(include_top=False, weights="imagenet", input_shape=input_shape)
    else:
        print("[ModelFactory] Initializing Base Model: EfficientNetB0")
        base_model = EfficientNetB0(include_top=False, weights="imagenet", input_shape=input_shape)

    # Freeze base model layers initially
    base_model.trainable = False

    inputs = layers.Input(shape=input_shape)
    x = base_model(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.4)(x)
    x = layers.Dense(64, activation="relu")(x)
    outputs = layers.Dense(1, activation="sigmoid")(x)

    model = models.Model(inputs=inputs, outputs=outputs, name=f"TruthLens_{model_name}")

    optimizer = tf.keras.optimizers.Adam(learning_rate=learning_rate)
    model.compile(
        optimizer=optimizer,
        loss="binary_crossentropy",
        metrics=[
            "accuracy",
            tf.keras.metrics.Precision(name="precision"),
            tf.keras.metrics.Recall(name="recall"),
            tf.keras.metrics.AUC(name="auc")
        ]
    )

    print(f"[ModelFactory] Compiled {model.name} cleanly with Learning Rate: {learning_rate}")
    return model
