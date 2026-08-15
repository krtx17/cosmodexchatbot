from flask import Flask, request, jsonify
from flask_cors import CORS
import chromadb
from groq import Groq
import os

app = Flask(__name__)
CORS(app)

client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_collection("cosmodex")

groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

@app.route("/chat", methods=["POST"])
def chat():
    user_question = request.json.get("message")

    results = collection.query(query_texts=[user_question], n_results=3)
    context = "\n".join(results["documents"][0])

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": f"You are CosmBot, AI navigator of Cosmodex. Use this data:\n{context}"},
            {"role": "user", "content": user_question}
        ]
    )

    return jsonify({"reply": response.choices[0].message.content})

@app.route("/")
def home():
    return "CosmBot backend is running"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)