import sys
import json
import os
import base64

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import models, transforms
from torchvision.models import (
    EfficientNet_B0_Weights,
    Xception_Weights,
    ResNet50_Weights,
)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.join(SCRIPT_DIR, "..", "ml", "image")

MODEL_CONFIGS = {
    "efficientnet_b0": {
        "constructor": models.efficientnet_b0,
        "weights_constructor": EfficientNet_B0_Weights,
        "target_layer_name": "features",
    },
    "xception": {
        "constructor": models.xception,
        "weights_constructor": Xception_Weights,
        "target_layer_name": "conv4",
    },
    "resnet50": {
        "constructor": models.resnet50,
        "weights_constructor": ResNet50_Weights,
        "target_layer_name": "layer4",
    },
}

IMGNET_NORM = transforms.Normalize(
    mean=[0.485, 0.456, 0.406],
    std=[0.229, 0.224, 0.225],
)
PREPROCESS = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    IMGNET_NORM,
])


def load_local_model(model_dir):
    model_map = {
        "efficientnet_model.pt": ("efficientnet_b0", models.efficientnet_b0),
        "xception_model.pt": ("xception", models.xception),
        "resnet_model.pt": ("resnet50", models.resnet50),
    }
    for filename, (model_name, constructor) in model_map.items():
        pt_path = os.path.join(model_dir, filename)
        if not os.path.isfile(pt_path):
            continue
        try:
            checkpoint = torch.load(pt_path, map_location="cpu")
            model = constructor(weights=None)
            if isinstance(checkpoint, dict):
                state_dict = checkpoint.get("state_dict", checkpoint)
                model.load_state_dict(state_dict, strict=False)
            elif isinstance(checkpoint, torch.nn.Module):
                model = checkpoint
            model.eval()
            return model, model_name
        except Exception:
            continue
    return None, None


def load_huggingface_deepfake_model():
    try:
        from transformers import pipeline
        classifier = pipeline(
            "image-classification",
            model="prithivMLmods/deepfake-detector-model-v1",
            device=-1,
        )
        return classifier
    except Exception:
        try:
            from transformers import pipeline
            classifier = pipeline(
                "image-classification",
                model="dima806/deepfake_vs_real_image_detection",
                device=-1,
            )
            return classifier
        except Exception:
            return None


hf_classifier = None


def get_hf_classifier():
    global hf_classifier
    if hf_classifier is None:
        hf_classifier = load_huggingface_deepfake_model()
    return hf_classifier


def preprocess_image(image_path):
    image = Image.open(image_path).convert("RGB")
    tensor = PREPROCESS(image).unsqueeze(0)
    return image, tensor


def load_model():
    """
    Load trained deepfake models only.
    Never fall back to ImageNet classifiers (wrong task).
    Priority: local .pt models → HuggingFace deepfake detectors.
    """
    model, model_type = load_local_model(ML_DIR)
    if model is not None:
        return model, model_type
    hf = get_hf_classifier()
    if hf is not None:
        return hf, "HuggingFace-deepfake"
    return None, None


def run_hf_inference(image_path):
    hf = get_hf_classifier()
    if hf is None:
        return None
    try:
        preds = hf(image_path)
        fake_prob = 0.0
        real_prob = 0.0
        top_predictions = []
        for p in preds:
            label = str(p["label"]).upper()
            score = round(float(p["score"]) * 100, 4)
            top_predictions.append({"label": p["label"], "score": round(p["score"], 4)})
            if "FAKE" in label or "DEEPFAKE" in label or "AI" in label:
                fake_prob = max(fake_prob, score)
            elif "REAL" in label or "AUTHENTIC" in label:
                real_prob = max(real_prob, score)
        if fake_prob == 0 and real_prob == 0 and top_predictions:
            fake_prob = top_predictions[0]["score"] if top_predictions[0]["label"].upper() != "REAL" else 0
            real_prob = top_predictions[0]["score"] if top_predictions[0]["label"].upper() == "REAL" else 0
        if fake_prob + real_prob == 0 and top_predictions:
            fake_prob = top_predictions[0]["score"] * 0.5
            real_prob = top_predictions[0]["score"] * 0.5
        return {
            "top_predictions": top_predictions,
            "fake_prob": round(fake_prob, 4),
            "real_prob": round(real_prob, 4),
        }
    except Exception:
        return None


def find_target_layer(model, model_name):
    try:
        layer = dict(model.named_modules())[MODEL_CONFIGS[model_name]["target_layer_name"]]
        return layer
    except Exception:
        pass
    for name, module in model.named_modules():
        if isinstance(module, torch.nn.Conv2d):
            return module
    return None


def compute_gradcam(model, image_tensor, model_name):
    target_layer = find_target_layer(model, model_name)
    if target_layer is None:
        return None
    activations = None
    gradients = None

    def forward_hook(module, input, output):
        nonlocal activations
        activations = output.detach()

    def backward_hook(module, grad_input, grad_output):
        nonlocal gradients
        gradients = grad_output[0].detach()

    fh = target_layer.register_forward_hook(forward_hook)
    bh = target_layer.register_full_backward_hook(backward_hook)
    try:
        output = model(image_tensor)
        if isinstance(output, (list, tuple)):
            output = output[0]
        probs = F.softmax(output, dim=1)
        top_class = torch.argmax(probs, dim=1).item()
        score = probs[0, top_class]
        model.zero_grad()
        score.backward()
        if activations is None or gradients is None:
            return None
        pooled = torch.mean(gradients, dim=[0, 2, 3])
        for i in range(activations.shape[1]):
            activations[:, i, :, :] *= pooled[i]
        heatmap = torch.mean(activations, dim=1).squeeze()
        heatmap = F.relu(heatmap)
        if heatmap.max() > 0:
            heatmap = heatmap / heatmap.max()
        return heatmap.cpu().numpy()
    except Exception:
        return None
    finally:
        fh.remove()
        bh.remove()


def heatmap_to_base64(heatmap, original_image):
    try:
        import cv2
        heat_r = cv2.resize(heatmap, (original_image.width, original_image.height))
        heat_u8 = (heat_r * 255).astype(np.uint8)
        heat_col = cv2.applyColorMap(heat_u8, cv2.COLORMAP_JET)
        orig = np.array(original_image)
        if orig.ndim == 3 and orig.shape[2] == 4:
            orig = orig[:, :, :3]
        overlay = cv2.addWeighted(orig, 0.6, heat_col, 0.4, 0)
        _, buf = cv2.imencode(".png", overlay)
        return "data:image/png;base64," + base64.b64encode(buf).decode("utf-8")
    except Exception:
        return None


def identify_regions(heatmap, grid_size=3):
    h, w = heatmap.shape
    labels = [
        "top-left", "top-center", "top-right",
        "middle-left", "center", "middle-right",
        "bottom-left", "bottom-center", "bottom-right",
    ]
    ch, cw = h // grid_size, w // grid_size
    regions = []
    for i in range(grid_size):
        for j in range(grid_size):
            y1, y2 = i * ch, (i + 1) * ch if i < grid_size - 1 else h
            x1, x2 = j * cw, (j + 1) * cw if j < grid_size - 1 else w
            cell = heatmap[y1:y2, x1:x2]
            if cell.size > 0 and np.mean(cell) > 0.3:
                regions.append(labels[i * grid_size + j])
    return regions


def analyze_image(image_path):
    model, model_type = load_model()
    if model is None:
        return {
            "status": "UNCERTAIN",
            "confidence": 0.0,
            "model_type": "none",
            "manipulated_regions": [],
            "heatmap_url": None,
            "top_predictions": [],
            "fake_prob": 0.0,
            "real_prob": 0.0,
            "error": "No model available",
        }

    image, image_tensor = preprocess_image(image_path)

    if model_type == "HuggingFace-deepfake":
        hf_result = run_hf_inference(image_path)
        if hf_result is None:
            return {
                "status": "UNCERTAIN",
                "confidence": 0.0,
                "model_type": "HuggingFace-deepfake",
                "manipulated_regions": [],
                "heatmap_url": None,
                "top_predictions": [],
                "fake_prob": 0.0,
                "real_prob": 0.0,
                "error": "HuggingFace inference failed",
            }
        fake_prob = hf_result["fake_prob"]
        real_prob = hf_result["real_prob"]
        confidence = max(fake_prob, real_prob)
        if fake_prob > real_prob and fake_prob > 50:
            status = "FAKE"
        elif real_prob > fake_prob and real_prob > 50:
            status = "REAL"
        else:
            status = "UNCERTAIN"
        return {
            "status": status,
            "confidence": round(confidence, 4),
            "model_type": model_type,
            "manipulated_regions": [],
            "heatmap_url": None,
            "top_predictions": hf_result["top_predictions"],
            "fake_prob": round(fake_prob, 4),
            "real_prob": round(real_prob, 4),
        }

    with torch.no_grad():
        output = model(image_tensor)
        if isinstance(output, (list, tuple)):
            output = output[0]
        probs = F.softmax(output, dim=1)

    top5 = torch.topk(probs, 5)
    categories = MODEL_CONFIGS[model_type]["weights_constructor"].DEFAULT.meta.get("categories", None)
    top_predictions = []
    for idx, score in zip(top5.indices[0].tolist(), top5.values[0].tolist()):
        top_predictions.append({
            "label": categories[idx] if categories else f"class_{idx}",
            "score": round(score, 4),
        })

    if probs.shape[1] >= 2:
        fake_prob = float(probs[0, 0]) * 100
        real_prob = float(probs[0, 1]) * 100
    else:
        fake_prob = float(probs[0, 0]) * 100
        real_prob = 100.0 - fake_prob

    confidence = max(fake_prob, real_prob)

    if fake_prob > real_prob and fake_prob > 50:
        status = "FAKE"
    elif real_prob > fake_prob and real_prob > 50:
        status = "REAL"
    else:
        status = "UNCERTAIN"

    heatmap = compute_gradcam(model, image_tensor, model_type)
    heatmap_url = None
    manipulated_regions = []
    if heatmap is not None:
        heatmap_url = heatmap_to_base64(heatmap, image)
        manipulated_regions = identify_regions(heatmap)

    return {
        "status": status,
        "confidence": round(confidence, 4),
        "model_type": model_type,
        "manipulated_regions": manipulated_regions,
        "heatmap_url": heatmap_url,
        "top_predictions": top_predictions,
        "fake_prob": round(fake_prob, 4),
        "real_prob": round(real_prob, 4),
    }


if __name__ == "__main__":
    try:
        image_path = sys.argv[1]
        result = analyze_image(image_path)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "status": "UNCERTAIN",
            "confidence": 0.0,
            "model_type": "none",
            "manipulated_regions": [],
            "heatmap_url": None,
            "top_predictions": [],
            "fake_prob": 0.0,
            "real_prob": 0.0,
            "error": str(e),
        }))
