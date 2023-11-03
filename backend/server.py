from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit

# import logic

import logging

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

socketio = SocketIO(app, cors_allowed_origins="*")
user_dict = {}
room_dict = {}
# conn = logic.initialize()


@app.route("/")
def index():
    return render_template("index.html")


@socketio.on("say")
def add_sentece(json):
    logger.info(json)
    try:
        text, user = json["text"], json["user"]
    except KeyError:
        logger.error(f"KeyError: {json}")
        return
    socketio.emit("say", {"text": text, "user": user})
    socketio.emit("update_tree", {"text": text, "user": user})
    # conn.send((text, user))


def send_tree_diff():
    while True:
        try:
            # diff = conn.recv()
            pass
        except Exception:
            continue
        socketio.emit("update_tree", {"diff": diff})


@app.route("/room/new", methods=["POST"])
def create_room():
    room_id = "apple"
    logger.warning(request.json)
    thema = request.json["thema"]
    info = {"room_id": room_id, "thema": thema}
    room_dict[room_id] = info
    logger.info(f"create room: {info}")
    return jsonify(info)


# @app.route("/room/<room_id>")
# def get_room_info(json):
#     room_id = json["room_id"]
#     room_info = room_dict.get(room_id, None)
#     if not room_info:
#         emit("room_info", {"user_dict": {}})
#     emit(
#         "room_info",
#     )


# ユーザーが新しく接続すると実行
@socketio.on("connect")
def connect(auth):
    logger.info("connected")
    emit("test", {"data": "Connected"}, bloadcast=True)


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
    socketio.run(app, debug=True)
