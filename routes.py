from flask import Blueprint, request, jsonify
from models import get_all_shippings, add_shipping

shipping_bp = Blueprint("shipping", __name__)

@shipping_bp.route("/shippings", methods=["GET"])
def get_shippings():
    data = get_all_shippings()
    result = []
    for row in data:
        result.append({
            "id": row[0],
            "invoice": row[1],
            "line": row[2],
            "part_number": row[3],
            "shipping_date": row[4],
            "observation": row[5],
            "status": row[6]
        })
    return jsonify(result)

@shipping_bp.route("/shippings", methods=["POST"])
def create_shipping():
    data = request.json
    add_shipping(
        data["invoice"],
        data["line"],
        data["part_number"],
        data["shipping_date"],
        data.get("observation", ""),
        data.get("status", "")
    )
    return jsonify({"message": "Shipping record added successfully"}), 201