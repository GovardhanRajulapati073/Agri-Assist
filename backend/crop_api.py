from flask import Flask, request, jsonify
import numpy as np
import pickle
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ✅ FIXED MODEL PATH
try:
    model = pickle.load(open("models/crop_model.pkl", "rb"))
    print("✅ Crop Model Loaded Successfully")
except Exception as e:
    print("❌ Error loading model:", e)


@app.route("/crop", methods=["POST"])
def predict():
    try:
        data = request.json.get("data")

        # ✅ Validation
        if not data or len(data) != 7:
            return jsonify({"error": "Invalid input. 7 values required"}), 400

        print("📥 Received Data:", data)

        # ✅ Convert properly
        arr = np.array(data, dtype=float).reshape(1, -1)

        print("📊 Input Array:", arr)

        prediction = model.predict(arr)

        print("🌾 Prediction:", prediction)

        return jsonify({
            "prediction": str(prediction[0])
        })

    except Exception as e:
        print("❌ Error:", str(e))
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5001)