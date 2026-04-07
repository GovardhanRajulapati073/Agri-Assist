from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from PIL import Image
import tensorflow as tf

app = Flask(__name__)
CORS(app)

# ✅ LOAD MODEL (SavedModel format)
model = tf.saved_model.load("models/plant_disease_model")
infer = model.signatures["serving_default"]

# ✅ CLASS NAMES (IMPORTANT: SAME ORDER AS TRAINING)
class_names = [
    'Pepper__bell___Bacterial_spot',
    'Pepper__bell___healthy',
    'Potato___Early_blight',
    'Potato___Late_blight',
    'Potato___healthy',
    'Tomato_Bacterial_spot',
    'Tomato_Early_blight',
    'Tomato_Late_blight',
    'Tomato_Leaf_Mold',
    'Tomato_Septoria_leaf_spot',
    'Tomato_Spider_mites_Two_spotted_spider_mite',
    'Tomato__Target_Spot',
    'Tomato__Tomato_YellowLeaf__Curl_Virus',
    'Tomato__Tomato_mosaic_virus',
    'Tomato_healthy'
]

# ✅ IMAGE PREPROCESS
def preprocess(img):
    img = img.resize((224, 224))
    img = np.array(img) / 255.0
    img = np.expand_dims(img, axis=0).astype(np.float32)
    return img

# ✅ TREATMENT MAP (UPDATED)
def get_treatment(disease):
    return {
        "Tomato_Early_blight": "Use fungicides like chlorothalonil.",
        "Tomato_Late_blight": "Apply copper-based fungicide.",
        "Tomato_Leaf_Mold": "Ensure proper ventilation and avoid overhead watering.",
        "Tomato_Septoria_leaf_spot": "Remove infected leaves and apply fungicide like mancozeb.",
        "Tomato__Tomato_mosaic_virus": "Remove infected plants and disinfect tools.",
        "Tomato__Tomato_YellowLeaf__Curl_Virus": "Control whiteflies using neem oil or insecticide.",
        "Tomato_Spider_mites_Two_spotted_spider_mite": "Use neem oil spray.",
        "Tomato__Target_Spot": "Apply fungicide spray.",
        "Tomato_Bacterial_spot": "Use copper-based sprays.",
        "Tomato_healthy": "No treatment needed.",
        "Potato___Early_blight": "Use fungicide and remove infected leaves.",
        "Potato___Late_blight": "Apply copper fungicide immediately.",
        "Pepper__bell___Bacterial_spot": "Use copper sprays.",
        "Pepper__bell___healthy": "No treatment needed.",
        "Potato___healthy": "No treatment needed."
    }.get(disease, "🌱 No specific treatment found. Consult expert.")

# ✅ API
@app.route("/disease", methods=["POST"])
def predict():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        img = Image.open(file).convert("RGB")

        processed = preprocess(img)

        # ✅ PREDICTION
        preds = infer(tf.constant(processed))
        preds = list(preds.values())[0].numpy()

        index = np.argmax(preds)
        confidence = float(np.max(preds)) * 100

        disease = class_names[index]

        return jsonify({
            "disease": disease,
            "confidence": round(confidence, 2),
            "treatment": get_treatment(disease)
        })

    except Exception as e:
        print("❌ ERROR:", e)
        return jsonify({"error": "Prediction failed"}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5002)