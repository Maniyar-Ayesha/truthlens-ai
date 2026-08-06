import os
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")

IMG_HEIGHT = 224
IMG_WIDTH = 224
IMG_SIZE = (IMG_HEIGHT, IMG_WIDTH)

def get_data_augmentation():
    """
    Returns Keras Data Augmentation Sequential Pipeline
    """
    return tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal"),
        tf.keras.layers.RandomRotation(0.15),
        tf.keras.layers.RandomZoom(0.1),
        tf.keras.layers.RandomTranslation(0.1, 0.1),
    ], name="data_augmentation")

def load_dataset_generators(batch_size=32, target_size=IMG_SIZE):
    """
    Loads Keras ImageDataGenerators for train, validation, and test splits.
    """
    train_dir = os.path.join(DATASET_DIR, "train")
    val_dir = os.path.join(DATASET_DIR, "validation")
    test_dir = os.path.join(DATASET_DIR, "test")

    # Data Augmentation & Rescaling Generator for Training
    train_datagen = ImageDataGenerator(
        rescale=1.0 / 255.0,
        rotation_range=15,
        width_shift_range=0.1,
        height_shift_range=0.1,
        shear_range=0.1,
        zoom_range=0.1,
        horizontal_flip=True,
        fill_mode="nearest"
    )

    # Rescaling Generator for Validation & Testing
    valid_datagen = ImageDataGenerator(rescale=1.0 / 255.0)

    print(f"[DatasetLoader] Loading Training Set from: {train_dir}")
    train_generator = train_datagen.flow_from_directory(
        train_dir,
        target_size=target_size,
        batch_size=batch_size,
        class_mode="binary",
        shuffle=True
    )

    print(f"[DatasetLoader] Loading Validation Set from: {val_dir}")
    val_generator = valid_datagen.flow_from_directory(
        val_dir,
        target_size=target_size,
        batch_size=batch_size,
        class_mode="binary",
        shuffle=False
    )

    print(f"[DatasetLoader] Loading Test Set from: {test_dir}")
    test_generator = valid_datagen.flow_from_directory(
        test_dir,
        target_size=target_size,
        batch_size=batch_size,
        class_mode="binary",
        shuffle=False
    )

    return train_generator, val_generator, test_generator
