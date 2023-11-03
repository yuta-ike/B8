from typing import Literal, Union
from uuid import uuid4
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from dataclasses import dataclass
from enum import Enum, auto

import logic

import logging
import threading

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
stream_handler = logging.StreamHandler()
stream_handler.setLevel(logging.DEBUG)
handler_format = logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
stream_handler.setFormatter(handler_format)
logger.addHandler(stream_handler)

app = Flask(__name__)
app.config["SECRET_KEY"] = "secret!"
CORS(app, supports_credentials=True)

socketio = SocketIO(app, cors_allowed_origins="*")


@dataclass
class RoomInfo:
    room_id: str
    theme: str


@dataclass
class TreeDiffAdd:
    type: Literal["add"]
    parent_node_id: str
    new_node_id: str
    user_id: str


@dataclass
class TreeDiffUpdate:
    type: Literal["update"]
    node_id: str
    text: str


TreeDiff = Union[TreeDiffAdd, TreeDiffUpdate]

room_dict: dict[str, RoomInfo] = {}
conn = logic.initialize()


@dataclass
class User:
    id: str
    username: str
    color: str


user_dict: dict[str, User] = {}


def agentloop(conn):
    while True:
        try:
            add_list = conn.recv()
            pass
        except Exception:
            continue
        for node in add_list:
            parent_node_id, new_node_id, text = node
            socketio.emit(
                "update_tree",
                {
                    "type": "add",
                    "parent_node_id": parent_node_id,
                    "new_node_id": new_node_id,
                },
            )
            socketio.emit(
                "update_tree",
                {
                    "type": "update",
                    "node_id": new_node_id,
                    "text": text,
                },
            )


threading.Thread(target=agentloop, args=(conn,)).start()

# HTTP Request


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/health")
def health():
    return jsonify({"message": "hello"})


@app.route("/room/new", methods=["POST"])
def create_room():
    room_id = "apple"
    logger.warning(request.json)
    if request.json is None:
        return jsonify({"error": "body is not provided"}), 500
    theme = request.json["theme"]
    info = RoomInfo(room_id=room_id, theme=theme)
    room_dict[room_id] = info
    logger.info(f"create room: {info}")
    return jsonify(info)


@app.route("/room/<room_id>")
def get_room_info(room_id: str):
    room_info = room_dict.get(room_id, None)
    if room_info is None:
        return jsonify({"error": "Room not found"}), 404

    return jsonify({"room_id": room_id, "theme": room_info.theme})


@app.route("/user/<user_id>")
def get_user(user_id: str):
    user = user_dict[user_id]
    if user is None:
        return jsonify({"error": "User not found"}), 404
    return {"user_id": user.id, "username": user.username, "color": user.color}


@socketio.on("create_user")
def create_user(json):
    user_id = str(uuid4())
    username = json["username"]
    color = json["color"]
    user_dict[user_id] = User(id=user_id, username=username, color=color)

    return {"user_id": user_id, "username": username, "color": color}


@socketio.on("say")
def add_sentece(json):
    logger.info(json)
    try:
        chat_id, text, user = json["id"], json["text"], json["user"]
    except KeyError:
        logger.error(f"KeyError: {json}")
        return

    logger.info(user_dict)
    username = user_dict[user].username
    color = user_dict[user].color
    logger.info(user_dict[user])

    socketio.emit(
        "say",
        {
            "id": chat_id,
            "text": text,
            "user": user,
            "username": username,
            "color": color,
        },
    )
    # socketio.emit("update_tree", {"text": text, "user": user})
    # conn.send((text, user))


@socketio.on("tree_diff")
def send_tree_diff(json):
    logger.info(json)
    diff_type = json.get("type", None)
    if diff_type == "add":
        parent_node_id = json.get("parent_node_id", None)
        new_node_id = json.get("new_node_id", None)
        user_id = json.get("user_id", None)
        if parent_node_id is None or new_node_id is None:
            return jsonify({"error": "parent_node_id or new_node_id is not set"})
        conn.send(("add", parent_node_id, new_node_id))
        color = user_dict[user_id].color
        socketio.emit(
            "update_tree",
            {
                "type": "add",
                "parent_node_id": parent_node_id,
                "new_node_id": new_node_id,
                "color": color,
            },
        )
    elif diff_type == "update":
        node_id = json.get("node_id", None)
        text = json.get("text", None)
        if node_id is None or text is None:
            return jsonify({"error": "node_id or text is not set"})
        conn.send(("update", node_id, text))
        socketio.emit(
            "update_tree", {"type": "update", "node_id": node_id, "text": text}
        )
    else:
        return jsonify({"error": "Unknown diff type."})


# ユーザーが新しく接続すると実行
@socketio.on("connect")
def connect(auth):
    logger.info("connected")
    emit("test", {"data": "Connected"}, broadcast=True)


# ユーザーの接続が切断すると実行
@socketio.on("disconnect")
def disconnect():
    pass


# テキストエリアが変更されたときに実行
@socketio.on("text_update_request")
def text_update_request(json):
    global text
    text = json["text"]
    # 変更をリクエストした人以外に向けて送信する
    # 全員向けに送信すると入力の途中でテキストエリアが変更されて日本語入力がうまくできない
    emit("text_update", {"text": text}, broadcast=True, include_self=False)


if __name__ == "__main__":
    # 本番環境ではeventletやgeventを使うらしいが簡単のためデフォルトの開発用サーバーを使う
    socketio.run(app, debug=True, host="0.0.0.0")
