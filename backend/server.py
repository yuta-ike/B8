from flask import Flask, render_template
from flask_socketio import SocketIO, emit

import logic

import logging

logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'

socketio = SocketIO(app, cors_allowed_origins='*')
user_dict = {}

conn = logic.initialize()


@app.route('/')
def index():
    return render_template('index.html')


@socketio.on('add_sentence')
def add_sentence_json(json):
    logger.info(json)
    try:
        text, user = json['text'], json['user']
    except KeyError:
        logger.error(f'KeyError: {json}')
        return
    conn.send((text, user))


def send_tree_diff():
    while True:
        try:
            diff = conn.recv()
        except Exception:
            continue
        socketio.emit('update_tree', {'diff': diff})


# ユーザーが新しく接続すると実行
@socketio.on('connect')
def connect(auth):
    print('connected')
    emit('test', {'data': 'Connected'}, bloadcast=True)


# ユーザーの接続が切断すると実行
@socketio.on('disconnect')
def disconnect():
    pass


# テキストエリアが変更されたときに実行
@socketio.on('text_update_request')
def text_update_request(json):
    global text
    text = json["text"]
    # 変更をリクエストした人以外に向けて送信する
    # 全員向けに送信すると入力の途中でテキストエリアが変更されて日本語入力がうまくできない
    emit('text_update', {'text': text}, broadcast=True, include_self=False)


if __name__ == '__main__':
    # 本番環境ではeventletやgeventを使うらしいが簡単のためデフォルトの開発用サーバーを使う
    socketio.run(app, debug=True)
